use anchor_lang::prelude::*;
use switchboard_on_demand::accounts::RandomnessAccountData;

use crate::constants::{RAFFLE_SEED, SB_ON_DEMAND_DEVNET_PID, TICKET_SEED};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState, Ticket};

/// Permissionless settlement. The client bundles Switchboard's `revealIx`
/// with this instruction in a single tx so `clock.slot == reveal_slot` when
/// we call `get_value`.
///
/// The caller must pre-compute the winning ticket index off-chain (it is
/// derived deterministically from the revealed randomness) and pass the
/// matching Ticket PDA. We re-derive the index on-chain and require the
/// passed Ticket PDA to match — the caller cannot influence the outcome.
#[derive(Accounts)]
pub struct SettleRaffle<'info> {
    pub initiator: Signer<'info>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
    )]
    pub raffle: Account<'info, Raffle>,

    /// CHECK: Switchboard randomness account. Manually verified: owner is
    /// the Switchboard program, key matches the one stored at request_draw,
    /// seed_slot matches commit_slot, and reveal_slot == current slot.
    pub randomness_account_data: UncheckedAccount<'info>,

    /// The Ticket PDA at the derived winning index. Not initialized here —
    /// just read for ownership and `buyer` lookup. We re-derive seeds to
    /// confirm the caller can't substitute a different ticket.
    #[account(
        seeds = [TICKET_SEED, raffle.key().as_ref(), &winning_ticket_seed_bytes(&ticket)?],
        bump = ticket.bump,
        constraint = ticket.raffle == raffle.key() @ RafflError::WinningTicketMismatch,
    )]
    pub ticket: Account<'info, Ticket>,
}

// Helper used inside the constraint to keep the seeds slice borrow scoped.
fn winning_ticket_seed_bytes(ticket: &Account<'_, Ticket>) -> Result<[u8; 4]> {
    Ok(ticket.ticket_number.to_le_bytes())
}

pub fn handler(ctx: Context<SettleRaffle>) -> Result<()> {
    let clock = Clock::get()?;
    let raffle = &mut ctx.accounts.raffle;

    require!(
        raffle.state == RaffleState::Drawing,
        RafflError::RaffleNotDrawing
    );

    // Bind to the exact randomness account the request_draw pinned.
    require_keys_eq!(
        ctx.accounts.randomness_account_data.key(),
        raffle.vrf_account,
        RafflError::RandomnessAccountMismatch
    );
    require_keys_eq!(
        *ctx.accounts.randomness_account_data.owner,
        SB_ON_DEMAND_DEVNET_PID,
        RafflError::InvalidRandomnessAccountOwner
    );

    let randomness_data = RandomnessAccountData::parse(
        ctx.accounts.randomness_account_data.data.borrow(),
    )
    .map_err(|_| RafflError::InvalidRandomnessAccountData)?;

    require!(
        randomness_data.seed_slot == raffle.commit_slot,
        RafflError::CommitSlotMismatch
    );

    // get_value succeeds only when reveal_slot == clock.slot — i.e. the SB
    // revealIx ran in the same transaction. Anything else fails here.
    let value = randomness_data
        .get_value(clock.slot)
        .map_err(|_| RafflError::RandomnessNotResolved)?;

    // u64 from the first 8 bytes mod tickets_sold. tickets_sold is u32, so
    // the cast to u64 is lossless. The modulus is non-zero because we
    // require tickets_sold >= min_tickets >= 2 in request_draw.
    let entropy = u64::from_le_bytes(value[0..8].try_into().unwrap());
    let tickets_sold_u64 = raffle.tickets_sold as u64;
    let winner_index_u64 = entropy % tickets_sold_u64;
    let winner_index: u32 = u32::try_from(winner_index_u64)
        .map_err(|_| RafflError::ArithmeticOverflow)?;

    // The on-chain derived winner_index must match the index of the Ticket
    // PDA the caller passed. The Anchor seeds constraint already enforced
    // that `ticket.ticket_number` matches the seeds; here we tie that index
    // to our independently-derived value.
    require!(
        ctx.accounts.ticket.ticket_number == winner_index,
        RafflError::WinningTicketMismatch
    );

    raffle.winning_ticket = Some(winner_index);
    raffle.winner = Some(ctx.accounts.ticket.buyer);
    raffle.state = RaffleState::Settled;

    msg!(
        "raffl: settled winner_index={} winner={}",
        winner_index,
        ctx.accounts.ticket.buyer
    );

    Ok(())
}
