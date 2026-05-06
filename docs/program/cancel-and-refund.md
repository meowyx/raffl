# Cancellation and refunds

Two things can go wrong with a raffle: it does not sell enough tickets, or it gets stuck in the draw phase. raffl handles both with a single permissionless `cancel_raffle` followed by separate `refund_ticket` (per buyer) and `reclaim_prize` (creator) calls.

There is **no fee** on this path. If a raffle does not settle, nobody pays the protocol.

## When a raffle can be cancelled

`cancel_raffle.rs` accepts two paths:

### Path 1: under-subscribed

```
state           == Active
now             >= raffle.end_time
tickets_sold    <  raffle.min_tickets
```

The raffle's clock ran out and the floor was never met. There is no possible draw, because `request_draw` rejects with `NotEnoughTicketsSold` whenever `tickets_sold < min_tickets`. The raffle is permanently unable to reach `Settled`. Cancel is the only forward motion.

### Path 2: stale draw

```
state           == Drawing
now             >= raffle.end_time + STALE_DRAW_TIMEOUT_SECS
```

`STALE_DRAW_TIMEOUT_SECS = 3_600` (1 hour). The raffle entered `Drawing` (the creator pinned a Switchboard randomness account) but `settle_raffle` never ran. After 1 hour past `end_time`, anyone can rescue the funds by cancelling.

### Why 1 hour and not less

A creator who simply forgets to bundle the reveal needs time to come back and try again. Anything under ~10 minutes risks racing legitimate creators. An hour is a generous floor that does not let griefers hold the vault hostage indefinitely. The constant lives in `constants.rs` and can be tuned in a redeploy.

### Anything outside these two paths

`cancel_raffle` returns `RaffleNotCancellable`. In particular:

- A raffle that **sold out** but the creator hasn't drawn yet is **not cancellable from Active**. It is simply waiting for `request_draw`. There is no path to forcibly cancel a sold-out raffle that has not entered `Drawing`. This is a known v0.1 limitation. It hands a sold-out creator some power to drag their feet (no time pressure), but the audit decided it was acceptable because the only alternative paths (permissionless `request_draw`, time-bound `Active`) introduced griefing vectors of their own. See [randomness.md](./randomness.md) on why `request_draw` is creator-only.

- A `Settled` or `Claimed` raffle cannot be cancelled. The math has already run.

- A `Cancelled` raffle cannot be re-cancelled. `cancellable` is false for any state other than `Active` or `Drawing`.

## What cancellation does

```rust
raffle.state = RaffleState::Cancelled;
```

That is the entire mutation in `cancel_raffle::handler`. No funds move. The vault still holds:

- `prize_amount` (the creator's escrow)
- `ticket_revenue = ticket_price * tickets_sold` (the buyers' payments)

Two separate instructions release these.

## refund_ticket: buyer-side recovery

Per-call, per-ticket. A buyer with N tickets calls it N times.

```rust
require!(raffle.state == RaffleState::Cancelled, ...);
// vault PDA signs:
system_program::transfer(vault -> buyer, raffle.ticket_price);
// Anchor closes the Ticket PDA via `close = buyer`,
// returning its rent (~0.0016 SOL) to the buyer too.
```

Constraints on the Ticket account:

- `ticket.raffle == raffle.key()`: anti-substitution
- `ticket.buyer == buyer.key()`: only the original buyer can refund
- `seeds = ["ticket", raffle, ticket_number_le_bytes]` with `bump = ticket.bump`: anti-spoofing
- `close = buyer`: Ticket PDA is destroyed, rent refunded

The buyer recovers `ticket_price + rent_of_ticket_pda`. The Ticket account is gone.

### Why one call per ticket

A single batch refund instruction would need a vector of Ticket PDAs as remaining accounts and a loop body that re-derives each. Doable but adds complexity in v0.1. The Anchor `close = buyer` pattern is the simplest correct primitive, and gas on Solana is cheap enough that calling it N times for a buyer holding N tickets is fine. Frontends should batch the calls into a single transaction (Solana's tx size limit allows ~10–15 of these in one tx).

## reclaim_prize: creator-side recovery

One call. Creator-only.

```rust
require!(raffle.state == RaffleState::Cancelled, ...);
let amount = raffle.prize_amount;
require!(amount > 0, ...);    // double-call defense
raffle.prize_amount = 0;
// vault PDA signs:
system_program::transfer(vault -> creator, amount);
```

Setting `raffle.prize_amount = 0` before the transfer is **defense against accidental double-call**. Anchor's state-transition guard already blocks the second call (state is still `Cancelled`, but `prize_amount = 0` makes the second call's `require!(amount > 0)` fail explicitly). It is belt-and-suspenders.

Constraints:

- `has_one = creator` on the raffle account: only the original creator can reclaim
- `state == Cancelled`: cannot reclaim from a Settled/Claimed raffle

The creator recovers `prize_amount` exactly. The Raffle PDA is **not** closed in v0.1 (rent stays on it). This is a v0.2 cleanup item.

## Net effect of a cancelled raffle

```
Before cancel:                       After everyone refunds + reclaims:
  vault holds:                         vault holds: ~rent (a few thousand lamports of dust)
    prize_amount                       creator has: original prize_amount back
    + ticket_revenue                   each buyer has: their ticket_price back + their Ticket rent
```

Dust in the vault is a known minor issue. There is no mechanism in v0.1 to close vault PDAs and recover that dust to anyone. For 100k-ticket caps and 0.01 SOL minimum prize, the dust is irrelevant; for v0.2 it might be worth a `close_raffle` instruction.

## Edge cases

- **Buyer refunds a ticket after the rent-recovery already ran**: not possible. `close = buyer` runs once and the account is gone. A second `refund_ticket` call against the same ticket fails at account loading.

- **Creator reclaims twice**: first call sets `prize_amount = 0`. Second call fails `require!(amount > 0)`. State is still `Cancelled` so Anchor does not block it on state grounds, but the explicit zero check does.

- **Buyer never refunds**: their ticket payment stays in the vault forever. Cumulatively this could be meaningful if a popular raffle gets cancelled and many buyers never come back. There is no claw-back mechanism. The protocol does not capture these stranded lamports because nobody else has signing authority over the vault. They sit there until a future `close_raffle` instruction (post-v0.1) sweeps them somewhere defined.

- **Creator never reclaims**: same shape. Their prize escrow stays in the vault. No claw-back.

These two cases (stranded funds from no-shows) are the strongest argument for a creator-bonded model in v0.2 where unclaimed refunds get redistributed after a long timeout. v0.1 punts.
