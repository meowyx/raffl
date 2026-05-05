use anchor_lang::prelude::*;

#[error_code]
pub enum RafflError {
    #[msg("Fee exceeds the maximum allowed (MAX_FEE_BPS = 2000)")]
    FeeBpsTooHigh,
    #[msg("Treasury pubkey cannot be the default zero pubkey")]
    InvalidTreasury,
    #[msg("Ticket price is below MIN_TICKET_PRICE_LAMPORTS")]
    TicketPriceTooLow,
    #[msg("max_tickets must be within [MIN_TICKETS_PER_RAFFLE, MAX_TICKETS_PER_RAFFLE]")]
    MaxTicketsOutOfRange,
    #[msg("min_tickets must be within [MIN_TICKETS_PER_RAFFLE, max_tickets]")]
    MinTicketsOutOfRange,
    #[msg("Raffle duration is outside [MIN_RAFFLE_DURATION_SECS, MAX_RAFFLE_DURATION_SECS]")]
    DurationOutOfRange,
    #[msg("Prize amount is below MIN_PRIZE_AMOUNT_LAMPORTS")]
    PrizeAmountTooLow,
    #[msg("Prize description is empty")]
    PrizeDescriptionEmpty,
    #[msg("Prize description exceeds MAX_PRIZE_DESCRIPTION_LEN bytes")]
    PrizeDescriptionTooLong,
    #[msg("Only PrizeType::Sol is supported in v0.1")]
    UnsupportedPrizeType,
    #[msg("Raffle is not in Active state")]
    RaffleNotActive,
    #[msg("Raffle is not in Drawing state")]
    RaffleNotDrawing,
    #[msg("Raffle is not in Settled state")]
    RaffleNotSettled,
    #[msg("Raffle has reached its end_time")]
    RaffleExpired,
    #[msg("Raffle has sold out its max_tickets")]
    RaffleSoldOut,
    #[msg("Raffle is not yet ready to draw (end_time not reached and not sold out)")]
    RaffleNotReadyToDraw,
    #[msg("Not enough tickets sold to draw this raffle (tickets_sold < min_tickets)")]
    NotEnoughTicketsSold,
    #[msg("Switchboard randomness account owner mismatch")]
    InvalidRandomnessAccountOwner,
    #[msg("Switchboard randomness account discriminator/data parse failed")]
    InvalidRandomnessAccountData,
    #[msg("Switchboard randomness was not committed in the previous slot (freshness check failed)")]
    RandomnessNotFresh,
    #[msg("Switchboard randomness has already been revealed before commit")]
    RandomnessAlreadyRevealed,
    #[msg("Switchboard randomness has not yet been resolved at the current slot")]
    RandomnessNotResolved,
    #[msg("Provided randomness account does not match the one stored on the raffle")]
    RandomnessAccountMismatch,
    #[msg("Switchboard seed_slot does not match the committed slot stored on the raffle")]
    CommitSlotMismatch,
    #[msg("Provided winning ticket PDA does not match the derived winner index")]
    WinningTicketMismatch,
    #[msg("Signer is not the recorded winner of this raffle")]
    NotTheWinner,
    #[msg("Provided creator account does not match the raffle creator")]
    InvalidCreatorAccount,
    #[msg("Provided treasury account does not match the platform treasury")]
    InvalidTreasuryAccount,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Only the raffle creator can initiate the draw")]
    NotRaffleCreator,
    #[msg("Raffle is not in Cancelled state")]
    RaffleNotCancelled,
    #[msg("Raffle does not meet the conditions to be cancelled")]
    RaffleNotCancellable,
    #[msg("Provided buyer account does not match the ticket buyer")]
    InvalidBuyerAccount,
}
