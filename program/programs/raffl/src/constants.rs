use anchor_lang::prelude::*;

#[constant]
pub const PLATFORM_SEED: &[u8] = b"platform";
#[constant]
pub const RAFFLE_SEED: &[u8] = b"raffle";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const TICKET_SEED: &[u8] = b"ticket";

pub const MAX_FEE_BPS: u16 = 2_000;

pub const MIN_TICKET_PRICE_LAMPORTS: u64 = 1_000;
pub const MIN_TICKETS_PER_RAFFLE: u32 = 2;
pub const MAX_TICKETS_PER_RAFFLE: u32 = 100_000;
pub const MIN_RAFFLE_DURATION_SECS: i64 = 3_600;
pub const MAX_RAFFLE_DURATION_SECS: i64 = 30 * 86_400;
pub const MIN_PRIZE_AMOUNT_LAMPORTS: u64 = 10_000_000;
pub const MAX_PRIZE_DESCRIPTION_LEN: usize = 128;

/// How long after `end_time` a raffle stuck in `Drawing` is considered stale
/// and may be cancelled by anyone. Set to 1 hour so a creator who simply
/// forgets to settle has time to come back, while griefers can't hold the
/// vault hostage indefinitely. 64s × 60 ≈ 3,600s.
pub const STALE_DRAW_TIMEOUT_SECS: i64 = 3_600;

/// Switchboard On-Demand program ID on devnet. Hardcoded for v0.1; rotate
/// to mainnet PID (`SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv`) before
/// mainnet deploy via a code-level swap and redeploy.
pub const SB_ON_DEMAND_DEVNET_PID: Pubkey =
    anchor_lang::prelude::pubkey!("Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2");
