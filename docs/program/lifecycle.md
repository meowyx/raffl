# Lifecycle and state machine

A raffle moves through five terminal-ish states. The `RaffleState` enum lives in `state.rs`:

```rust
enum RaffleState { Active, Drawing, Settled, Claimed, Cancelled }
```

Every state-changing instruction guards on the current `state` and refuses to run otherwise. There is no admin override.

## State diagram

```
                               +--- under-subscribed --------+
                               |   end_time elapsed AND      |
                               |   tickets_sold < min_tickets|
                               v                             |
   create_raffle ---->  Active ----- request_draw ---->  Drawing -----+
                          |                                |          |
                          | (sold out OR end_time)         |          |
                          | AND tickets_sold >= min        |          |
                          v                                |          |
                                                  settle_raffle       |
                                                          |           |
                                                          v           v
                                                       Settled    Cancelled
                                                          |           |
                                                          | claim_    | refund_ticket (per buyer)
                                                          | prize     | reclaim_prize (creator)
                                                          v
                                                       Claimed
```

## Transitions in detail

### Active

Set by `create_raffle`. Conditions checked at create:

- `prize_amount >= MIN_PRIZE_AMOUNT_LAMPORTS` (10_000_000 = 0.01 SOL)
- `ticket_price >= MIN_TICKET_PRICE_LAMPORTS` (1_000)
- `MIN_TICKETS_PER_RAFFLE <= max_tickets <= MAX_TICKETS_PER_RAFFLE` (2..=100_000)
- `MIN_TICKETS_PER_RAFFLE <= min_tickets <= max_tickets`
- `MIN_RAFFLE_DURATION_SECS <= end_time - now <= MAX_RAFFLE_DURATION_SECS` (3_600..=2_592_000, i.e. 1h to 30 days)
- `prize_type == Sol` (other types reserved for v0.2)
- `prize_description` non-empty and ≤ 128 bytes

The prize transfer happens **before** any state is written. If the SOL transfer fails, the whole instruction unwinds and no `Raffle` PDA persists.

In Active, `buy_ticket` is the only valid mutating call. Each ticket increments `tickets_sold` and creates a `Ticket` PDA at index `tickets_sold` (pre-increment). The ticket revenue flows to the vault.

### Drawing

Entered via `request_draw`. Only the raffle creator can call it. Preconditions:

- `state == Active`
- `tickets_sold >= min_tickets`
- `tickets_sold >= max_tickets` (sold out) OR `now >= end_time`

It pins a Switchboard randomness account by writing its pubkey and `seed_slot` into the raffle. From this point, no more tickets can be sold. See [randomness.md](./randomness.md) for why creator-only and how the freshness check works.

### Settled

Entered via `settle_raffle`. Permissionless. Requires:

- `state == Drawing`
- The randomness account passed must equal `raffle.vrf_account`
- The randomness must reveal in the same transaction (`get_value(clock.slot)` succeeds)
- The Ticket PDA passed must equal the derived winning index

Sets `raffle.winning_ticket = Some(idx)` and `raffle.winner = Some(ticket.buyer)`.

### Claimed

Entered via `claim_prize`. Only the recorded winner can sign. Performs three atomic transfers from the vault: prize to winner, fee to treasury, remainder to creator. State flips to `Claimed` **before** the lamport movement, as defense against any reentry-style anomaly. See [payouts.md](./payouts.md) for the math.

### Cancelled

Entered via `cancel_raffle`. Permissionless. Two valid paths:

1. **Under-subscribed**: `state == Active`, `now >= end_time`, `tickets_sold < min_tickets`.
2. **Stale draw**: `state == Drawing`, `now >= end_time + STALE_DRAW_TIMEOUT_SECS` (1 hour after end_time).

After cancel, buyers retrieve ticket payments via `refund_ticket` (one call per ticket), and the creator retrieves the original prize via `reclaim_prize`. See [cancel-and-refund.md](./cancel-and-refund.md).

## What each state allows

| State | Valid next instruction(s) |
|---|---|
| Active | `buy_ticket`, `request_draw`, `cancel_raffle` |
| Drawing | `settle_raffle`, `cancel_raffle` |
| Settled | `claim_prize` |
| Claimed | (terminal) |
| Cancelled | `refund_ticket` (per buyer), `reclaim_prize` (creator, once) |

A `claim_prize` call against any state other than Settled returns `RaffleNotSettled`. Same shape for every other transition guard.

## What this state machine does not do

- It does not auto-settle. Someone has to pay the lamports to call `request_draw` and `settle_raffle`. Anyone can call `settle`; only the creator can call `request_draw`.
- It does not pay the winner automatically. The winner has to sign `claim_prize`. The funds sit in the vault until they do.
- It does not auto-cancel under-subscribed raffles. Someone has to call `cancel_raffle` after `end_time`. Until then, the raffle is just stuck in `Active`. There is no harm because `request_draw` fails the `tickets_sold >= min_tickets` check.
- There is no resurrection. Cancelled cannot return to Active; Claimed is terminal.
