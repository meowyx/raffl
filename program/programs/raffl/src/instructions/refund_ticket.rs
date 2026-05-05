use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{RAFFLE_SEED, TICKET_SEED, VAULT_SEED};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState, Ticket};

/// Buyer-signed refund of a single Ticket from a Cancelled raffle.
/// Returns `raffle.ticket_price` lamports from the vault to the buyer
/// and closes the Ticket PDA, returning its rent to the buyer too.
#[derive(Accounts)]
pub struct RefundTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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

    #[account(
        mut,
        seeds = [TICKET_SEED, raffle.key().as_ref(), &ticket.ticket_number.to_le_bytes()],
        bump = ticket.bump,
        constraint = ticket.raffle == raffle.key() @ RafflError::WinningTicketMismatch,
        constraint = ticket.buyer == buyer.key() @ RafflError::InvalidBuyerAccount,
        close = buyer,
    )]
    pub ticket: Account<'info, Ticket>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RefundTicket>) -> Result<()> {
    let raffle = &ctx.accounts.raffle;
    require!(
        raffle.state == RaffleState::Cancelled,
        RafflError::RaffleNotCancelled
    );

    let raffle_key = raffle.key();
    let vault_bump_seed = [raffle.vault_bump];
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, raffle_key.as_ref(), &vault_bump_seed];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.buyer.to_account_info(),
            },
            signer_seeds,
        ),
        raffle.ticket_price,
    )?;

    msg!(
        "raffl: refund_ticket ticket_number={} amount={}",
        ctx.accounts.ticket.ticket_number,
        raffle.ticket_price
    );

    Ok(())
}
