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
}
