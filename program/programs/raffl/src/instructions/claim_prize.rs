use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{PLATFORM_SEED, RAFFLE_SEED, VAULT_SEED};
use crate::error::RafflError;
use crate::state::{Raffle, RafflePlatform, RaffleState};

/// Winner-signed atomic settlement. Pays:
///   - prize_amount → winner
///   - ticket_revenue * fee_bps / 10_000 → treasury
///   - ticket_revenue - treasury_fee → creator
///
/// The vault PDA signs all three system_program transfers via stored seeds.
/// State transitions Settled → Claimed; further calls fail the state check.
#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, RafflePlatform>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
    )]
    pub raffle: Account<'info, Raffle>,

    #[account(
        mut,
        seeds = [VAULT_SEED, raffle.key().as_ref()],
        bump = raffle.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Raffle creator — receives ticket revenue minus protocol fee.
    /// `mut` because lamports flow into this account.
    #[account(
        mut,
        constraint = creator.key() == raffle.creator @ RafflError::InvalidCreatorAccount,
    )]
    pub creator: SystemAccount<'info>,

    /// Protocol treasury — receives the fee. Must match platform.treasury.
    #[account(
        mut,
        constraint = treasury.key() == platform.treasury @ RafflError::InvalidTreasuryAccount,
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let raffle = &mut ctx.accounts.raffle;

    require!(
        raffle.state == RaffleState::Settled,
        RafflError::RaffleNotSettled
    );

    let recorded_winner = raffle.winner.ok_or(RafflError::RaffleNotSettled)?;
    require_keys_eq!(
        ctx.accounts.winner.key(),
        recorded_winner,
        RafflError::NotTheWinner
    );

    // Compute payouts in u128 to avoid intermediate overflow even though
    // u64 would suffice given our caps. shared-base §3.1 / §3.2.
    let ticket_revenue: u64 = (raffle.ticket_price as u128)
        .checked_mul(raffle.tickets_sold as u128)
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(RafflError::ArithmeticOverflow)?;

    // Audit fix: round fee UP so treasury isn't shortchanged by floor
    // division. Without div_ceil, `fee = floor(rev * bps / 10_000)`
    // assigns the rounding remainder (≤1 lamport) to creator. The
    // protocol fee should always favor treasury.
    let fee: u64 = (ticket_revenue as u128)
        .checked_mul(ctx.accounts.platform.fee_bps as u128)
        .and_then(|x| x.checked_add(9_999))
        .and_then(|x| x.checked_div(10_000))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(RafflError::ArithmeticOverflow)?;
    // fee can't exceed ticket_revenue: ceil(rev*bps/10000) ≤ rev when bps≤10000
    // and bps is capped to MAX_FEE_BPS=2000.
    let fee: u64 = fee.min(ticket_revenue);

    let creator_share: u64 = ticket_revenue
        .checked_sub(fee)
        .ok_or(RafflError::ArithmeticOverflow)?;

    let prize_amount: u64 = raffle.prize_amount;

    // Flip the state BEFORE the lamport movement (defense-in-depth against
    // any reentry-style anomaly via custom System CPI). shared-base §32.5.
    raffle.state = RaffleState::Claimed;

    // Vault PDA signer seeds, reused across all three transfers.
    let raffle_key = raffle.key();
    let vault_bump_seed = [raffle.vault_bump];
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, raffle_key.as_ref(), &vault_bump_seed];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    // Winner: prize.
    if prize_amount > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.winner.to_account_info(),
                },
                signer_seeds,
            ),
            prize_amount,
        )?;
    }

    // Treasury: protocol fee on ticket revenue.
    if fee > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
        )?;
    }

    // Creator: ticket revenue minus fee.
    if creator_share > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                signer_seeds,
            ),
            creator_share,
        )?;
    }

    msg!(
        "raffl: claim_prize prize={} fee={} creator_share={}",
        prize_amount,
        fee,
        creator_share
    );

    Ok(())
}
