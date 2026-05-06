# Payouts and fee math

When a raffle settles and the winner claims, the vault makes three transfers in one atomic instruction. This doc walks through the arithmetic, the rounding rules, and why each came out the way it did.

## What gets paid to whom

```
vault                                           after claim_prize:
  prize_amount      ----> winner                vault balance = 0 (modulo rent)
  ticket_revenue    ---->  +-- treasury fee
                           +-- creator share
```

Where:

```
ticket_revenue = ticket_price * tickets_sold
treasury_fee   = ceil(ticket_revenue * fee_bps / 10_000)
creator_share  = ticket_revenue - treasury_fee
```

`fee_bps` lives on `RafflePlatform` and is set at `initialize_platform`. Capped at `MAX_FEE_BPS = 2000` (20%). Production value is `500` (5%).

The `prize_amount` is whatever the creator escrowed at create time. It is never reduced by the protocol; the creator gets back exactly what they put in via the prize transfer to the winner.

## The actual code

From `claim_prize.rs`:

```rust
// u128 math to avoid intermediate overflow
let ticket_revenue: u64 = (raffle.ticket_price as u128)
    .checked_mul(raffle.tickets_sold as u128)
    .and_then(|x| u64::try_from(x).ok())
    .ok_or(RafflError::ArithmeticOverflow)?;

// ceil division: (a + 9999) / 10000 ≡ ceil(a / 10000)
let fee: u64 = (ticket_revenue as u128)
    .checked_mul(platform.fee_bps as u128)
    .and_then(|x| x.checked_add(9_999))
    .and_then(|x| x.checked_div(10_000))
    .and_then(|x| u64::try_from(x).ok())
    .ok_or(RafflError::ArithmeticOverflow)?;

let fee: u64 = fee.min(ticket_revenue);  // belt-and-suspenders cap
let creator_share: u64 = ticket_revenue.checked_sub(fee).ok_or(...)?;
```

Then three CPIs to `system_program::transfer`, all signed by the vault PDA via `[VAULT_SEED, raffle.key(), &[vault_bump]]`. The state flips to `Claimed` **before** the transfers, as defense against any reentry-style anomaly via custom System CPI.

## Why ceiling division on the fee

A 2026-05 audit pass flagged the original `floor` division. With floor, the rounding remainder (always ≤ 1 lamport) leaks to the creator instead of the treasury. Over many settled raffles this is a fractional lamport, but the design principle is **the protocol fee should always favor treasury**, so we round up.

Concretely: if `ticket_revenue * fee_bps = 100_001`, floor gives fee = 10 lamports, ceil gives 11. The 1 lamport goes to treasury under ceil.

The `fee.min(ticket_revenue)` clamp guarantees the math is safe even at the boundary `bps = 10_000` (which the validator already rejects via `MAX_FEE_BPS = 2000`, but defense-in-depth costs nothing).

## Why u128 intermediate

`ticket_price` is u64, `tickets_sold` is u32. The product fits in u96, which exceeds u64 by 32 bits. With the production caps (`MAX_TICKETS_PER_RAFFLE = 100_000`) and reasonable ticket prices (say up to 10 SOL = 10^10 lamports), the product is at most `10^15` lamports, comfortably inside u64. But we go through u128 anyway because:

- The `checked_mul` chain is straightforward in u128.
- It costs no extra compute units that matter.
- It future-proofs against caps being raised.

Same logic for the fee calculation: u128 intermediate, then `try_from` back to u64.

## What happens if the prize is zero

The instruction allows it: `if prize_amount > 0 { transfer }`. There is no creator-side incentive to set `prize_amount = 0` because `MIN_PRIZE_AMOUNT_LAMPORTS = 10_000_000` (0.01 SOL) is enforced at `create_raffle`. So in practice `prize_amount > 0` always. The conditional is just hygiene.

Same conditionals exist around `fee > 0` and `creator_share > 0`. Avoids zero-lamport CPIs which the runtime accepts but waste compute.

## What the vault has after a successful claim

Approximately the rent-exemption minimum for a SystemAccount holding zero data. The original prize escrow paid the rent, and the prize transfer takes it down to that floor. The remaining balance is essentially dust held by the system program; the vault PDA is never closed because there is no mechanism for it. This is fine because (a) the dust is bounded and (b) the address is single-use per raffle.

If raffl ever wants to reclaim that dust, it would need a new instruction to close the vault. Not worth it for v0.1.

## Refund and reclaim payouts (cancelled raffles)

Different code paths, simpler math. See [cancel-and-refund.md](./cancel-and-refund.md).

- `refund_ticket`: transfers `raffle.ticket_price` from vault to buyer, closes the Ticket PDA (rent refunded to buyer too).
- `reclaim_prize`: transfers `raffle.prize_amount` from vault to creator, then sets `raffle.prize_amount = 0` so a second call refunds nothing.

No fee on either path. The protocol does not charge cancellation.

## Fee model summary

| Event | Protocol fee | Where it lives |
|---|---|---|
| `create_raffle` | none (just rent for accounts) | `creator` pays rent |
| `buy_ticket` | none (just rent for the Ticket PDA) | `buyer` pays rent |
| `request_draw` | none | `creator` pays the lamports |
| `settle_raffle` | none | caller pays the lamports |
| `claim_prize` | `fee_bps` of `ticket_revenue`, ceil | `treasury` |
| `cancel_raffle` | none | caller pays |
| `refund_ticket` | none | (buyer recovers ticket payment + rent) |
| `reclaim_prize` | none | (creator recovers prize) |

The protocol only takes a fee when a raffle settles. Cancelled raffles are fee-free. This aligns the protocol's incentives with successful raffles, not with churn.

## Worked example

A creator runs a raffle with:

- `prize_amount = 1_247 SOL` = 1_247_000_000_000 lamports
- `ticket_price = 0.5 SOL` = 500_000_000 lamports
- `max_tickets = 2_500`
- It sells out: `tickets_sold = 2_500`
- `platform.fee_bps = 500` (5%)

Math:

```
ticket_revenue = 500_000_000 * 2_500 = 1_250_000_000_000 lamports = 1_250 SOL
fee_raw        = 1_250_000_000_000 * 500 = 625_000_000_000_000
fee_ceil       = (625_000_000_000_000 + 9_999) / 10_000 = 62_500_000_000 lamports = 62.5 SOL
creator_share  = 1_250_000_000_000 - 62_500_000_000 = 1_187_500_000_000 lamports = 1_187.5 SOL
```

After `claim_prize` settles:

- Winner: 1_247 SOL (the prize)
- Treasury: 62.5 SOL (the fee)
- Creator: 1_187.5 SOL (their cut of ticket revenue)

Creator's net P&L: paid 1_247 SOL in prize, received 1_187.5 SOL back. Net cost 59.5 SOL, with the upside that they ran a raffle with no operational work after create.
