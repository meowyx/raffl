use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{RAFFLE_SEED, TICKET_SEED, VAULT_SEED};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState, Ticket};

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
    )]
    pub raffle: Account<'info, Raffle>,

    /// CHECK: SystemAccount vault, re-derived with stored canonical bump.
    /// shared-base §22 — bound to this exact raffle, no cross-raffle reuse.
    #[account(
        mut,
        seeds = [VAULT_SEED, raffle.key().as_ref()],
        bump = raffle.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    // One PDA per (raffle, ticket_number). `init` blocks duplicate purchases
    // for the same index — the index is computed from raffle.tickets_sold,
    // so concurrent buys race to claim the next slot.
    #[account(
        init,
        payer = buyer,
        space = 8 + Ticket::INIT_SPACE,
        seeds = [TICKET_SEED, raffle.key().as_ref(), &raffle.tickets_sold.to_le_bytes()],
        bump,
    )]
    pub ticket: Account<'info, Ticket>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyTicket>) -> Result<()> {
    let raffle = &mut ctx.accounts.raffle;

    require!(
        raffle.state == RaffleState::Active,
        RafflError::RaffleNotActive
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now < raffle.end_time, RafflError::RaffleExpired);

    require!(
        raffle.tickets_sold < raffle.max_tickets,
        RafflError::RaffleSoldOut
    );

    // Pull ticket payment into the vault. State-before-CPI is fine here
    // because the failure path is a system_program transfer that can't
    // mutate raffle state — but we still update tickets_sold AFTER the
    // transfer succeeds so a failed payment doesn't burn an index.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        raffle.ticket_price,
    )?;

    let ticket_number = raffle.tickets_sold;
    let ticket = &mut ctx.accounts.ticket;
    ticket.raffle = raffle.key();
    ticket.buyer = ctx.accounts.buyer.key();
    ticket.ticket_number = ticket_number;
    ticket.purchased_at = now;
    ticket.bump = ctx.bumps.ticket;

    raffle.tickets_sold = raffle
        .tickets_sold
        .checked_add(1)
        .ok_or(RafflError::ArithmeticOverflow)?;

    Ok(())
}
