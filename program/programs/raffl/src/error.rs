use anchor_lang::prelude::*;

#[error_code]
pub enum RafflError {
    #[msg("Fee exceeds the maximum allowed (MAX_FEE_BPS = 2000)")]
    FeeBpsTooHigh,
    #[msg("Treasury pubkey cannot be the default zero pubkey")]
    InvalidTreasury,
}
