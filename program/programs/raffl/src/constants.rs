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
