<p align="center">
  <img src="logo.png" alt="raffl" width="120" />
</p>

# raffl

On-chain raffle infrastructure on Solana. Anyone creates a raffle, deposits a prize, sets ticket pricing. Buyers enter, an on-chain VRF picks a winner trustlessly. Settlement is provably fair, custody is in PDAs, and there is no operator in the loop.

> Create a raffle. Anyone can enter. Chain picks the winner.

Domain: [raffl.fun](https://raffl.fun)

## How it works

1. **Creator** opens a raffle: deposits the prize (SOL in v0.1) into a per-raffle PDA vault, sets ticket price, max tickets, and end time.
2. **Buyers** purchase tickets with SOL. Each ticket creates a `Ticket` PDA recording the buyer pubkey and ticket number.
3. When the raffle ends (time elapsed or sold out), anyone can call `request_draw`. Switchboard VRF returns a verifiable random value on-chain.
4. `settle_raffle` computes `winning_ticket = vrf_result % tickets_sold` and resolves the winner from the `Ticket` accounts.
5. **Winner** calls `claim_prize`. The vault releases the prize to the winner, the protocol fee to the treasury, and the remainder to the creator.

Every step is on-chain and publicly verifiable. No off-chain randomness, no custodial server, no admin override on settled raffles.

## Stack

| Layer | Choice |
|---|---|
| Smart contract | Anchor 1.0.1 (Rust) |
| Randomness | Switchboard VRF |
| Tests | LiteSVM 0.10 |
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind, Turbopack) |
| Wallet / auth | Privy (embedded wallets + external) |
| RPC | Helius |
| Hosting | Vercel |

## Project layout

```
.
├── program/                       Anchor workspace
│   ├── Anchor.toml
│   └── programs/raffl/
│       ├── src/                   lib.rs, state.rs, instructions/, error.rs, constants.rs
│       └── tests/                 LiteSVM integration tests
├── web/                           Next.js 16 frontend
│   ├── app/                       Pages, layout, metadata, favicon
│   └── public/                    Static assets (logo)
├── design/                        Design assets (gitignored)
├── logo.png                       Project mark
└── README.md
```

`spec.md` and `plan.md` are local-only working documents and are gitignored.


## Local development

### Program

```bash
cd program
anchor build
cargo test --test test_initialize_platform -- --nocapture --test-threads=1
```

LiteSVM tests run in-process and do not need a local validator. CU consumption is logged in test output.

### Web

```bash
cd web
pnpm install
pnpm dev
```

App runs at http://localhost:3000.


## License

TBD. Will pick before mainnet.
