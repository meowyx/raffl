use anchor_lang::prelude::*;

use crate::constants::{RAFFLE_SEED, STALE_DRAW_TIMEOUT_SECS};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState};

/// Permissionless cancellation. Two valid paths:
///
/// 1. **Under-subscribed**: state == Active, end_time has passed, and
///    tickets_sold < min_tickets. The raffle can never reach Settled.
/// 2. **Stale draw**: state == Drawing and the raffle's `end_time +
///    STALE_DRAW_TIMEOUT_SECS` has passed. The bound randomness clearly
///    won't ever settle.
///
/// Either path flips state to Cancelled. Vault funds are released by
/// `refund_ticket` (buyers) and `reclaim_prize` (creator).
#[derive(Accounts)]
pub struct CancelRaffle<'info> {
    pub initiator: Signer<'info>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
    )]
    pub raffle: Account<'info, Raffle>,
}

pub fn handler(ctx: Context<CancelRaffle>) -> Result<()> {
    let raffle = &mut ctx.accounts.raffle;
    let now = Clock::get()?.unix_timestamp;

    let cancellable = match raffle.state {
        RaffleState::Active => now >= raffle.end_time && raffle.tickets_sold < raffle.min_tickets,
        RaffleState::Drawing => now
            >= raffle
                .end_time
                .checked_add(STALE_DRAW_TIMEOUT_SECS)
                .ok_or(RafflError::ArithmeticOverflow)?,
        _ => false,
    };
    require!(cancellable, RafflError::RaffleNotCancellable);

    raffle.state = RaffleState::Cancelled;

    msg!(
        "raffl: cancelled tickets_sold={} min_tickets={}",
        raffle.tickets_sold,
        raffle.min_tickets
    );

    Ok(())
}
