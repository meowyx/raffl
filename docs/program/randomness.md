# Randomness: how a winner gets picked

raffl uses **Switchboard On-Demand** for randomness. The flow is a commit-reveal pattern bridged across two transactions, one slot apart.

This doc explains the mechanism, the math, and why each safety check exists. Most of the subtlety is here, not in the rest of the program.

## The two-transaction flow

```
   tx 1 (the "commit" tx)                      tx 2 (the "reveal" tx)
   --------------------------                   --------------------------
   | Switchboard commitIx   |                   | Switchboard revealIx   |
   | raffl::request_draw    |                   | raffl::settle_raffle   |
   --------------------------                   --------------------------
              |                                            |
              | written at slot N                          | submitted at slot N+1 (or later)
              v                                            v
   randomness_account.seed_slot = N             randomness_account.reveal_slot = clock.slot
   raffle.commit_slot = N                       raffle.state = Settled
   raffle.state = Drawing
```

The client builds both transactions. `commitIx` and `revealIx` come from Switchboard's SDK. raffl's two instructions live alongside them in each tx. Bundling matters: the reveal must happen in the same tx as `settle_raffle` so the program reads a fresh randomness value.

## request_draw: pinning a randomness account

The creator picks a Switchboard randomness account (commonly created on the fly for this raffle), runs Switchboard's `commitIx`, then calls `request_draw` in the same transaction.

`request_draw` does five things:

1. **Owner check.** The randomness account's owner must equal the Switchboard On-Demand program ID. Without this check, an attacker could pass a self-controlled fake account whose layout matches `RandomnessAccountData` and pre-load chosen randomness.

2. **Parse check.** The account data must deserialize to `RandomnessAccountData`. The crate is used without the `anchor` feature (Anchor 1.0 trait conflict), so we call `RandomnessAccountData::parse` manually.

3. **Freshness check.** `randomness.seed_slot == clock.slot - 1`. The commit must have happened in the immediately preceding slot. Without this, a creator could commit far in advance, pre-compute many candidate seeds, and pick the most favorable one. The 1-slot window leaves no time to grind.

4. **Not-already-revealed check.** `randomness.get_value(clock.slot)` must currently fail. If the value is already known at `request_draw`, the committer could shop randomness across multiple raffles and bind the favorable result.

5. **Pin.** Stores `randomness_account_data.key()` into `raffle.vrf_account` and `seed_slot` into `raffle.commit_slot`. State flips to `Drawing`.

### Why request_draw is creator-only

Originally `request_draw` was permissionless. A 2026-05 audit caught two attacks this enabled:

- **Lock-out grief.** Anyone could pin a randomness account they own to the raffle and then refuse to reveal. The raffle would sit in `Drawing` forever (no `cancel_raffle` path covers permissionless griefing on someone else's raffle).
- **Cross-raffle binding.** Anyone could `commitIx` once, then bind the same Switchboard account to multiple raffles in one transaction. Only one of those raffles could ever settle (Switchboard's reveal is single-shot), guaranteeing the others got stuck.

Restricting to the creator removes both. A malicious creator can already grief their own raffle (everyone loses), and the `STALE_DRAW_TIMEOUT_SECS` cancellation path covers a creator who simply goes offline. Enforced by `has_one = creator` plus a redundant `creator.key() == initiator.key()` constraint.

## settle_raffle: revealing and computing the winner

`settle_raffle` is permissionless. Anyone willing to pay the lamports can call it. The client bundles Switchboard's `revealIx` with this instruction so `clock.slot == reveal_slot` when the program calls `get_value`.

Steps:

1. **State check.** `raffle.state == Drawing`.

2. **Account binding.** The randomness account passed must equal the one stored at `request_draw` (`raffle.vrf_account`).

3. **Owner check** again. Same reason as `request_draw`.

4. **Slot binding.** `randomness.seed_slot == raffle.commit_slot`. Catches a different commit being slipped in.

5. **Reveal.** `randomness.get_value(clock.slot)` returns 32 bytes. The Switchboard implementation only succeeds when the reveal happened in the current slot, which means `revealIx` had to run earlier in the same transaction.

6. **Compute the winner.** See math below.

7. **Verify the passed Ticket.** The Ticket PDA passed by the caller must have `ticket_number == derived_winner_index`. Anchor's seeds constraint already enforces that the ticket's seed bytes match its `ticket_number` field. The handler then ties that index to the value derived independently on-chain. The caller cannot substitute a different ticket.

8. **Write winner.** `raffle.winning_ticket = Some(idx)`, `raffle.winner = Some(ticket.buyer)`, state becomes `Settled`.

## The math

```rust
let value: [u8; 32] = randomness_data.get_value(clock.slot)?;
let entropy: u64    = u64::from_le_bytes(value[0..8].try_into().unwrap());
let winner_index    = (entropy % raffle.tickets_sold as u64) as u32;
```

Three things to know:

- We use the **first 8 bytes** of the 32-byte randomness value, little-endian, as a u64. The other 24 bytes are unused. 64 bits of entropy is more than enough for ranges up to 100k (the max tickets cap).
- The cast `tickets_sold as u64` is lossless (`tickets_sold` is u32).
- The modulus is **safe to be non-zero**: `request_draw` enforces `tickets_sold >= min_tickets >= 2`, so the divisor is always at least 2. No "modulo zero" panic.

There is a textbook **modulo bias** here: when `tickets_sold` does not divide evenly into 2^64, the lowest indices are infinitesimally more likely. For our cap of 100_000 the bias is `~5e-15`, well below any practically meaningful threshold. We accept it for simplicity. If raffl ever lifts the cap to numbers comparable to 2^64 / 100, this needs rejection sampling.

### Why first-8-bytes and not a hash?

Switchboard's `RandomnessAccountData::get_value` returns 32 cryptographically-random bytes (oracle commit-reveal pattern, signed off-chain, verified on-chain). Hashing the bytes again would not add entropy because they are already uniformly distributed. We just slice.

### Why on-chain re-derivation?

The client could compute the winner index off-chain trivially (the formula is public, the randomness is public after reveal). So why does the program re-derive it?

Because the *passed Ticket account* is a thing the caller picks. If the program trusted the caller's index, the caller could pass any Ticket account and the program would record that as the winner. Re-deriving on-chain and requiring `ticket.ticket_number == winner_index` closes that.

The on-chain derivation also forces the caller's reveal to be the actual one bound to this raffle. Any deviation (different randomness account, different commit slot, no reveal in this tx) fails before the math even runs.

## What can go wrong, and what happens

| Scenario | Outcome |
|---|---|
| Creator never calls `request_draw` | Stuck in `Active`. After end_time, `cancel_raffle` works if under min_tickets. If sold out, the raffle is stuck (no path to cancel a sold-out raffle the creator never draws). Mitigation: monitor and pressure the creator; consider permissionless draw + bonded creator in v0.2. |
| Creator commits but never reveals | Stuck in `Drawing`. After `end_time + STALE_DRAW_TIMEOUT_SECS` (1h), anyone can call `cancel_raffle`, which moves to Cancelled. Buyers refund, creator reclaims. |
| Reveal happens but client passes wrong ticket | `WinningTicketMismatch` error, settle fails. Anyone can retry with the correct ticket. |
| Switchboard randomness account expires before reveal | `RandomnessNotResolved` error, settle fails until cancellation path opens. |
| Two callers race to settle | One wins (state flips to `Settled`), the other gets `RaffleNotDrawing`. No double-settle. |

## Why this design and not a Solana slot-hash trick

Slot-hash randomness (using `recent_blockhashes` or a slot's blockhash) is gameable by validators. A validator producing block N at slot S can choose to skip producing if the resulting randomness is unfavorable, accepting the loss of block reward in exchange for steering an outcome. Switchboard's commit-reveal pattern shifts that trust to a third-party oracle network with explicit slashing for misbehavior, which is meaningfully harder to attack for raffles where the prize exceeds a validator's expected block reward.

For v0.1 (devnet) we hardcode the Switchboard On-Demand devnet PID `Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2`. Mainnet rotates to `SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv` via a code-level swap and redeploy.
