// ============================================================
// Program:    raffl
// Framework:  Anchor 1.0.1
// Testing:    LiteSVM
// Risk Level: 🔴 Critical (PDA vaults, multi-CPI, permissionless creation)
// ============================================================

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA");

// Provide a no-op `getrandom` backend so the SBF target can link the
// transitive secp256k1/k256 chain pulled in by switchboard-on-demand. Our
// program never actually invokes RNG — randomness comes from Switchboard —
// so the function unconditionally errors.
fn _raffl_getrandom_noop(_dest: &mut [u8]) -> std::result::Result<(), getrandom::Error> {
    Err(getrandom::Error::UNSUPPORTED)
}
getrandom::register_custom_getrandom!(_raffl_getrandom_noop);

#[program]
pub mod raffl {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_bps: u16,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, fee_bps, treasury)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_raffle(
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
        instructions::create_raffle::handler(
            ctx,
            nonce,
            prize_type,
            prize_amount,
            prize_description,
            ticket_price,
            max_tickets,
            min_tickets,
            end_time,
        )
    }

    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        instructions::buy_ticket::handler(ctx)
    }

    pub fn request_draw(ctx: Context<RequestDraw>) -> Result<()> {
        instructions::request_draw::handler(ctx)
    }

    pub fn settle_raffle(ctx: Context<SettleRaffle>) -> Result<()> {
        instructions::settle_raffle::handler(ctx)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }

    pub fn cancel_raffle(ctx: Context<CancelRaffle>) -> Result<()> {
        instructions::cancel_raffle::handler(ctx)
    }

    pub fn refund_ticket(ctx: Context<RefundTicket>) -> Result<()> {
        instructions::refund_ticket::handler(ctx)
    }

    pub fn reclaim_prize(ctx: Context<ReclaimPrize>) -> Result<()> {
        instructions::reclaim_prize::handler(ctx)
    }
}
