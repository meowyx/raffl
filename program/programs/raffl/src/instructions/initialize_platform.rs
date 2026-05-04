use anchor_lang::prelude::*;

use crate::constants::{MAX_FEE_BPS, PLATFORM_SEED};
use crate::error::RafflError;
use crate::state::RafflePlatform;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    // First-caller becomes authority. Acceptable for v0.1 because the deployer
    // bundles deploy + initialize_platform in one tx (atomic). For mainnet, harden
    // by hardcoding the expected authority into the program at compile time.
    #[account(
        init,
        payer = authority,
        space = 8 + RafflePlatform::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump,
    )]
    pub platform: Account<'info, RafflePlatform>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    fee_bps: u16,
    treasury: Pubkey,
) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, RafflError::FeeBpsTooHigh);
    require_keys_neq!(treasury, Pubkey::default(), RafflError::InvalidTreasury);

    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.treasury = treasury;
    platform.fee_bps = fee_bps;
    platform.total_raffles = 0;
    platform.bump = ctx.bumps.platform;

    Ok(())
}
