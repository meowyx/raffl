use anchor_lang::prelude::*;
use switchboard_on_demand::accounts::RandomnessAccountData;

use crate::constants::{RAFFLE_SEED, SB_ON_DEMAND_DEVNET_PID};
use crate::error::RafflError;
use crate::state::{Raffle, RaffleState};

/// Permissionless draw initiation. Anyone can pay the lamports and submit
/// the Switchboard `commitIx` + this instruction in the same transaction
/// once the raffle is ready (sold out OR end_time reached) and has cleared
/// the `min_tickets` floor.
///
/// This instruction does NOT CPI into Switchboard. The client side bundles
/// `randomness.commitIx(queue)` (signed by the SB program) with this call.
/// We only read the resulting account state to verify freshness and bind
/// the raffle to that specific randomness commitment.
#[derive(Accounts)]
pub struct RequestDraw<'info> {
    /// Audit fix: must be the raffle creator. Permissionless `request_draw`
    /// let any actor pin a randomness account to the raffle and either
    /// (a) refuse to reveal — locking Drawing forever — or (b) bind the
    /// same SB account to multiple raffles in one tx, so only one of them
    /// could ever settle. Restricting to the creator removes both vectors:
    /// a malicious creator can already grief their own raffle (everyone
    /// loses), and the timeout-based `cancel_raffle` covers a creator who
    /// goes offline.
    pub initiator: Signer<'info>,

    #[account(
        mut,
        seeds = [RAFFLE_SEED, raffle.creator.as_ref(), &raffle.nonce.to_le_bytes()],
        bump = raffle.bump,
        has_one = creator @ RafflError::NotRaffleCreator,
    )]
    pub raffle: Account<'info, Raffle>,

    /// CHECK: must equal `raffle.creator`; enforced by the `has_one` constraint
    /// on `raffle` above. Required because Anchor's `has_one` resolves field
    /// names against accounts in this struct.
    #[account(
        constraint = creator.key() == initiator.key() @ RafflError::NotRaffleCreator,
    )]
    pub creator: UncheckedAccount<'info>,

    /// CHECK: Switchboard On-Demand `RandomnessAccountData`. We manually
    /// verify the owner is the Switchboard program and that the data parses
    /// to the expected layout. No deserialize-by-anchor because we use the
    /// crate without the `anchor` feature (Anchor 1.0 trait conflict).
    pub randomness_account_data: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<RequestDraw>) -> Result<()> {
    let clock = Clock::get()?;
    let raffle = &mut ctx.accounts.raffle;

    require!(
        raffle.state == RaffleState::Active,
        RafflError::RaffleNotActive
    );

    require!(
        raffle.tickets_sold >= raffle.min_tickets,
        RafflError::NotEnoughTicketsSold
    );

    let now = clock.unix_timestamp;
    let sold_out = raffle.tickets_sold >= raffle.max_tickets;
    let ended = now >= raffle.end_time;
    require!(sold_out || ended, RafflError::RaffleNotReadyToDraw);

    // Switchboard owner check — without this an attacker could pass a
    // self-controlled fake account whose layout matches RandomnessAccountData
    // and pre-load chosen randomness. shared-base §1.2.
    require_keys_eq!(
        *ctx.accounts.randomness_account_data.owner,
        SB_ON_DEMAND_DEVNET_PID,
        RafflError::InvalidRandomnessAccountOwner
    );

    let randomness_data = RandomnessAccountData::parse(
        ctx.accounts.randomness_account_data.data.borrow(),
    )
    .map_err(|_| RafflError::InvalidRandomnessAccountData)?;

    // Freshness: the commit must have been done in the immediately preceding
    // slot. Per Switchboard tutorial — prevents committing far in advance and
    // grinding seeds.
    require!(
        randomness_data.seed_slot == clock.slot.saturating_sub(1),
        RafflError::RandomnessNotFresh
    );

    // The randomness must NOT already be revealed. If `get_value` returns
    // Ok at request_draw time, someone has already revealed it and the
    // committer could pick a favorable raffle to attach it to.
    require!(
        randomness_data.get_value(clock.slot).is_err(),
        RafflError::RandomnessAlreadyRevealed
    );

    raffle.vrf_account = ctx.accounts.randomness_account_data.key();
    raffle.commit_slot = randomness_data.seed_slot;
    raffle.state = RaffleState::Drawing;

    msg!(
        "raffl: request_draw committed slot={} randomness={}",
        raffle.commit_slot,
        raffle.vrf_account
    );

    Ok(())
}
