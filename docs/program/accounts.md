# Accounts and PDAs

Everything raffl owns is a PDA derived from a fixed set of seeds. Pubkeys are deterministic, which means:

- Anyone can recompute a raffle's address from `(creator, nonce)` without indexing.
- The vault for any raffle is `find_program_address(["vault", raffle_pubkey])`.
- Tickets are addressable by `(raffle, ticket_number)`.

## Seeds

Defined in `constants.rs`:

```rust
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const RAFFLE_SEED:   &[u8] = b"raffle";
pub const VAULT_SEED:    &[u8] = b"vault";
pub const TICKET_SEED:   &[u8] = b"ticket";
```

| PDA | Seeds | Owner |
|---|---|---|
| `RafflePlatform` | `["platform"]` | raffl program |
| `Raffle` | `["raffle", creator_pubkey, nonce_le_bytes]` | raffl program |
| `Vault` | `["vault", raffle_pubkey]` | system program |
| `Ticket` | `["ticket", raffle_pubkey, ticket_number_le_bytes]` | raffl program |

## RafflePlatform

Singleton. One per program deployment.

```rust
struct RafflePlatform {
    authority:     Pubkey,   // first caller of initialize_platform
    treasury:      Pubkey,   // receives protocol fees on claim_prize
    fee_bps:       u16,      // basis points; capped at MAX_FEE_BPS = 2000
    total_raffles: u64,      // monotonic counter
    bump:          u8,
}
```

Set at `initialize_platform`. The authority cannot be rotated in v0.1. The fee can only be set at init; there is no `update_fee` instruction. The treasury can only be set at init.

`MAX_FEE_BPS = 2000` (20%). Production fee is `500` (5%).

## Raffle

One per raffle, addressed by `(creator, nonce)`. The creator picks the nonce. `init` blocks collisions, so reusing the same nonce twice for the same creator returns `AccountAlreadyInUse`.

```rust
struct Raffle {
    creator:           Pubkey,
    nonce:             u64,
    prize_description: String,        // up to 128 bytes
    prize_type:        PrizeType,     // Sol | Token | Nft | Physical (only Sol in v0.1)
    ticket_price:      u64,           // lamports
    max_tickets:       u32,
    min_tickets:       u32,           // floor for the draw to be valid
    tickets_sold:      u32,
    prize_amount:      u64,           // lamports escrowed at create
    end_time:          i64,           // unix seconds
    created_at:        i64,
    state:             RaffleState,
    winning_ticket:    Option<u32>,   // set by settle_raffle
    winner:            Option<Pubkey>,// set by settle_raffle
    vrf_account:       Pubkey,        // set by request_draw
    commit_slot:       u64,           // set by request_draw
    vault_bump:        u8,            // canonical bump for the paired vault
    bump:              u8,
}
```

The `vault_bump` is stored at create and reused on every later instruction so vault re-derivation is single-pass. Same for `bump`.

## Vault

A SystemAccount PDA. No fields, just a lamport balance. Owned by the system program, not the raffl program, which is what makes plain `system_program::transfer` CPIs work for both deposits (creator/buyer signs) and withdrawals (vault signs via stored seeds).

Seeds: `["vault", raffle.key()]`. Because the raffle pubkey is part of the seed, the vault address is unique per raffle. A bug or CPI exploit on one raffle's vault cannot reach another raffle's vault.

Lamports flowing in:

- `prize_amount` from creator at `create_raffle`
- `ticket_price` from buyer per `buy_ticket`

Lamports flowing out (vault signs):

- 3 transfers in `claim_prize` (winner, treasury, creator)
- 1 transfer per call in `refund_ticket` (buyer)
- 1 transfer in `reclaim_prize` (creator)

## Ticket

One per ticket, addressed by `(raffle, ticket_number)`. Created by `buy_ticket` at index `raffle.tickets_sold` (pre-increment).

```rust
struct Ticket {
    raffle:        Pubkey,
    buyer:         Pubkey,
    ticket_number: u32,    // 0..tickets_sold-1
    purchased_at:  i64,
    bump:          u8,
}
```

Concurrent buys race for the next index. Anchor `init` rejects the loser of the race with `AccountAlreadyInUse`, the second buyer just retries with the new `tickets_sold`. There is no way to skip an index or buy a non-sequential ticket number.

The Ticket PDA is closed and rent-refunded to the buyer in `refund_ticket` (cancelled raffles only). Settled raffles do not close losing tickets in v0.1; they remain on-chain as a public record of who entered.

## Why nonce-keyed raffle PDAs

Two reasons:

1. **Multiple concurrent raffles per creator.** A creator can run as many raffles as they want, each addressed by a distinct nonce. The pubkey is unique per `(creator, nonce)`.
2. **Predictable address.** Frontend can compute the new raffle's address before submitting `create_raffle`, which makes optimistic UI and link generation possible.

The nonce is creator-chosen, so collisions are the creator's problem. `init` blocks them deterministically.

## Why the platform stores total_raffles

Just for analytics. It is not used in any constraint. Frontend reads it for the homepage stat.
