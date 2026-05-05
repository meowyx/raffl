use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{RAFFLE_SEED, VAULT_SEED};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState};

/// Creator-signed prize reclaim from a Cancelled raffle. Returns the
/// originally-escrowed `prize_amount` lamports from the vault back to
/// the creator. Buyers retrieve their ticket payments via `refund_ticket`.
#[derive(Accounts)]
pub struct ReclaimPrize<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
        has_one = creator @ RafflError::InvalidCreatorAccount,
    )]
    pub raffle: Account<'info, Raffle>,

    #[account(
        mut,
        seeds = [VAULT_SEED, raffle.key().as_ref()],
        bump = raffle.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReclaimPrize>) -> Result<()> {
    let raffle = &mut ctx.accounts.raffle;
    require!(
        raffle.state == RaffleState::Cancelled,
        RafflError::RaffleNotCancelled
    );

    // Zero out prize_amount so a second call refunds nothing. Defense
    // against accidental double-call (Anchor would already block via
    // state transitions but this makes the invariant explicit).
    let amount = raffle.prize_amount;
    require!(amount > 0, RafflError::PrizeAmountTooLow);
    raffle.prize_amount = 0;

    let raffle_key = raffle.key();
    let vault_bump_seed = [raffle.vault_bump];
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, raffle_key.as_ref(), &vault_bump_seed];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    msg!("raffl: reclaim_prize amount={}", amount);

    Ok(())
}
