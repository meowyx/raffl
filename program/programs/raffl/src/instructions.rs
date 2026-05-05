pub mod buy_ticket;
pub mod cancel_raffle;
pub mod claim_prize;
pub mod create_raffle;
pub mod initialize_platform;
pub mod reclaim_prize;
pub mod refund_ticket;
pub mod request_draw;
pub mod settle_raffle;

// Glob-re-export so Anchor's #[program] macro can resolve the per-instruction
// `__client_accounts_*` and `__cpi_client_accounts_*` helper modules at the
// crate root. The `handler` function in each module collides under glob, but
// lib.rs always calls them via `instructions::<name>::handler`, so the
// ambiguous_glob_reexports warning is benign and silenced here.
#[allow(ambiguous_glob_reexports)]
pub use buy_ticket::*;
#[allow(ambiguous_glob_reexports)]
pub use cancel_raffle::*;
#[allow(ambiguous_glob_reexports)]
pub use claim_prize::*;
#[allow(ambiguous_glob_reexports)]
pub use create_raffle::*;
#[allow(ambiguous_glob_reexports)]
pub use initialize_platform::*;
#[allow(ambiguous_glob_reexports)]
pub use reclaim_prize::*;
#[allow(ambiguous_glob_reexports)]
pub use refund_ticket::*;
#[allow(ambiguous_glob_reexports)]
pub use request_draw::*;
#[allow(ambiguous_glob_reexports)]
pub use settle_raffle::*;
