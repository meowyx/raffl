use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RafflePlatform {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    pub total_raffles: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Raffle {
    pub creator: Pubkey,
    pub nonce: u64,
    #[max_len(128)]
    pub prize_description: String,
    pub prize_type: PrizeType,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub tickets_sold: u32,
    pub end_time: i64,
    pub state: RaffleState,
    pub winning_ticket: Option<u32>,
    pub winner: Option<Pubkey>,
    pub vrf_account: Pubkey,
    pub vault_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Ticket {
    pub raffle: Pubkey,
    pub buyer: Pubkey,
    pub ticket_number: u32,
    pub purchased_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum PrizeType {
    Sol,
    Token,
    Nft,
    Physical,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum RaffleState {
    Active,
    Drawing,
    Settled,
    Cancelled,
}
