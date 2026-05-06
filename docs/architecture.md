# Architecture

raffl is three pieces that talk to each other:

1. **Anchor program** on Solana (Rust): owns all the state and money
2. **Web frontend** (Next.js): UI plus client-side transaction orchestration
3. **Switchboard On-Demand VRF**: external oracle that supplies verifiable randomness

There is no backend service in the loop. Once a raffle is created, every state transition happens on-chain. The frontend's job is to read accounts, build transactions, and sign them with the user's wallet.

## The lifecycle of one raffle

```
[create_raffle]                    creator escrows prize into PDA vault
       |
       v
   Active  <----------- buy_ticket  (anyone, while end_time > now)
       |
       |  end_time reached OR sold out
       |  AND tickets_sold >= min_tickets
       v
[request_draw]                     creator commits to a Switchboard randomness account
       |                           in the same tx as Switchboard's commitIx
       v
   Drawing
       |
       |  one slot later, Switchboard reveals the value
       v
[settle_raffle]                    anyone reveals + computes winner
       |                           (entropy % tickets_sold), atomically
       v
   Settled
       |
       v
[claim_prize]                      winner signs; vault pays winner, treasury, creator
       |
       v
   Claimed
```

The two off-ramps are `cancel_raffle` (under-subscribed at end_time, or stuck in Drawing past timeout) followed by `refund_ticket` for buyers and `reclaim_prize` for the creator. See [program/cancel-and-refund.md](./program/cancel-and-refund.md).

## Account topology

Four PDAs, all owned by the raffl program (or the system program for the vault):

| PDA | Seeds | Owner | Purpose |
|---|---|---|---|
| `RafflePlatform` | `["platform"]` | raffl | Singleton. Holds protocol fee bps and treasury pubkey. |
| `Raffle` | `["raffle", creator, nonce]` | raffl | One per raffle. Holds price, ticket count, state, winner. |
| `Vault` | `["vault", raffle]` | system | One per raffle. Holds prize lamports + ticket revenue. |
| `Ticket` | `["ticket", raffle, ticket_number]` | raffl | One per ticket. Holds buyer pubkey + index. |

Vaults are SystemAccount PDAs scoped to a single raffle. A CPI exploit on one raffle's vault cannot drain another, because the seeds are different. See [program/accounts.md](./program/accounts.md).

## What the frontend actually does

The frontend never holds funds and never picks winners. Its responsibilities:

1. Read on-chain accounts via Helius RPC. Render explore page, dashboard, raffle detail.
2. For `create_raffle` / `buy_ticket` / `claim_prize` / `refund_ticket` / `reclaim_prize`: build a single Anchor instruction, ask the user's wallet to sign, submit.
3. For `request_draw`: bundle Switchboard's `commitIx` with the program's `request_draw` in one transaction.
4. For `settle_raffle`: fetch the revealed randomness off-chain, compute `entropy % tickets_sold`, derive the winning Ticket PDA, then bundle Switchboard's `revealIx` with the program's `settle_raffle`.

The math is re-derived on-chain in `settle_raffle`, so the client cannot fake the winning index. The client just has to provide the matching Ticket account. See [program/randomness.md](./program/randomness.md).

## Auth and wallets

- Wallet connection goes through Privy. Buyers can sign up with email or Google and Privy mints an embedded MPC wallet behind the scenes. External wallets (Phantom, Solflare, Backpack) are also supported.
- The Anchor program does not care which wallet kind signed. Every signer is just a Pubkey.

## Trust boundaries

| Action | Who can do it | Enforced how |
|---|---|---|
| Create a raffle | Anyone with SOL | Permissionless instruction. Creator escrows the prize at create time. |
| Buy a ticket | Anyone | Permissionless. Each ticket is a separate PDA at index `tickets_sold`. |
| Initiate the draw | Raffle creator only | `has_one = creator` constraint on `request_draw`. See [program/randomness.md](./program/randomness.md) for why. |
| Settle the draw | Anyone | Math is re-derived on-chain. Caller cannot pick the winner. |
| Claim the prize | Recorded winner only | `winner.key() == raffle.winner` check in `claim_prize`. |
| Cancel | Anyone, only when conditions met | Permissionless but gated on (end_time elapsed AND under min_tickets) OR (Drawing stale past timeout). |
| Refund a ticket | The buyer of that ticket | `ticket.buyer == buyer.key()` constraint. |
| Reclaim prize | Raffle creator | `has_one = creator`. |
| Drain a vault directly | No one | Vault is a SystemAccount PDA; only the program can sign for it via stored seeds. |

The raffl protocol authority (set by `initialize_platform`) controls only the fee bps and treasury pubkey. It cannot touch raffle vaults or override winners.

## Money flow

```
creator ----prize_amount----> vault
buyer   ----ticket_price----> vault   (xN)
                              |
                              | (claim_prize, atomic, three transfers)
                              |
                              +---> winner    (prize_amount)
                              +---> treasury  (ticket_revenue * fee_bps / 10000, ceil)
                              +---> creator   (ticket_revenue minus treasury fee)
```

`ticket_revenue = ticket_price * tickets_sold`. The fee uses ceiling division so rounding goes to treasury, not creator. See [program/payouts.md](./program/payouts.md) for the exact arithmetic.

On a cancelled raffle, the vault pays buyers (`refund_ticket`, one per ticket) and the creator (`reclaim_prize`, the original prize amount). No fee is taken on cancellation.

## Stack reference

| Layer | Choice |
|---|---|
| Smart contract | Anchor 1.0.1 (Rust) |
| Randomness | Switchboard On-Demand 0.12 with `solana-v3` feature |
| Tests | LiteSVM 0.10, in-process, 36 tests |
| RPC | Helius (devnet for v0.1) |
| Wallet / auth | Privy (embedded MPC + external wallet adapter) |
| Frontend | Next.js 16 App Router, TypeScript |

Live on Solana devnet at program ID `Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA`.
