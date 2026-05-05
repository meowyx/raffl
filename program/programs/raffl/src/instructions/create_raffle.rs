use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{
    MAX_PRIZE_DESCRIPTION_LEN, MAX_RAFFLE_DURATION_SECS, MAX_TICKETS_PER_RAFFLE,
    MIN_PRIZE_AMOUNT_LAMPORTS, MIN_RAFFLE_DURATION_SECS, MIN_TICKETS_PER_RAFFLE,
    MIN_TICKET_PRICE_LAMPORTS, PLATFORM_SEED, RAFFLE_SEED, VAULT_SEED,
};
use crate::error::RafflError;
use crate::state::{PrizeType, Raffle, RafflePlatform, RaffleState};

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CreateRaffle<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
    )]
    pub platform: Account<'info, RafflePlatform>,

    // PDA per (creator, nonce). `init` rejects collisions, so reusing a nonce
    // for the same creator fails with AccountAlreadyInUse rather than silently
    // overwriting state. shared-base §29.2.
    #[account(
        init,
        payer = creator,
        space = 8 + Raffle::INIT_SPACE,
        seeds = [RAFFLE_SEED, creator.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub raffle: Account<'info, Raffle>,

    // SOL-only vault PDA, system-owned, holds prize + ticket revenue.
    // shared-base §22: vault is bound to a single raffle via seed,
    // so a CPI exploit on one raffle can't drain another.
    /// CHECK: SystemAccount PDA derived from this raffle. No data; lamports
    /// are deposited via system_program::transfer below. Withdrawal paths
    /// (settle/claim/cancel) re-derive with `bump = raffle.vault_bump`.
    #[account(
        mut,
        seeds = [VAULT_SEED, raffle.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn handler(
    ctx: Context<CreateRaffle>,
    nonce: u64,
    prize_type: PrizeType,
    prize_amount: u64,
    prize_description: String,
    ticket_price: u64,
    max_tickets: u32,
    min_tickets: u32,
    end_time: i64,
) -> Result<()> {
    require!(prize_type == PrizeType::Sol, RafflError::UnsupportedPrizeType);
    require!(
        prize_amount >= MIN_PRIZE_AMOUNT_LAMPORTS,
        RafflError::PrizeAmountTooLow
    );
    require!(!prize_description.is_empty(), RafflError::PrizeDescriptionEmpty);
    require!(
        prize_description.len() <= MAX_PRIZE_DESCRIPTION_LEN,
        RafflError::PrizeDescriptionTooLong
    );
    require!(
        ticket_price >= MIN_TICKET_PRICE_LAMPORTS,
        RafflError::TicketPriceTooLow
    );
    require!(
        (MIN_TICKETS_PER_RAFFLE..=MAX_TICKETS_PER_RAFFLE).contains(&max_tickets),
        RafflError::MaxTicketsOutOfRange
    );
    require!(
        min_tickets >= MIN_TICKETS_PER_RAFFLE && min_tickets <= max_tickets,
        RafflError::MinTicketsOutOfRange
    );

    let now = Clock::get()?.unix_timestamp;
    let duration = end_time
        .checked_sub(now)
        .ok_or(RafflError::ArithmeticOverflow)?;
    require!(
        (MIN_RAFFLE_DURATION_SECS..=MAX_RAFFLE_DURATION_SECS).contains(&duration),
        RafflError::DurationOutOfRange
    );

    // Escrow the prize before writing state. shared-base §21.7: prize must be
    // funded at create, never promised. If transfer fails the whole instruction
    // unwinds and no Raffle PDA persists.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        prize_amount,
    )?;

    let raffle = &mut ctx.accounts.raffle;
    raffle.creator = ctx.accounts.creator.key();
    raffle.nonce = nonce;
    raffle.prize_description = prize_description;
    raffle.prize_type = prize_type;
    raffle.ticket_price = ticket_price;
    raffle.max_tickets = max_tickets;
    raffle.min_tickets = min_tickets;
    raffle.tickets_sold = 0;
    raffle.prize_amount = prize_amount;
    raffle.end_time = end_time;
    raffle.created_at = now;
    raffle.state = RaffleState::Active;
    raffle.winning_ticket = None;
    raffle.winner = None;
    // VRF account is set in `request_draw` once Switchboard wiring lands (Day 3).
    raffle.vrf_account = Pubkey::default();
    raffle.commit_slot = 0;
    raffle.vault_bump = ctx.bumps.vault;
    raffle.bump = ctx.bumps.raffle;

    let platform = &mut ctx.accounts.platform;
    platform.total_raffles = platform
        .total_raffles
        .checked_add(1)
        .ok_or(RafflError::ArithmeticOverflow)?;

    Ok(())
}
