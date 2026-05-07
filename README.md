<p align="center">
  <img src="logo.png" alt="raffl" width="120" />
</p>

<h1 align="center">raffl</h1>

<p align="center">
  <a href="https://explorer.solana.com/address/Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA?cluster=devnet"><img src="https://img.shields.io/badge/devnet-deployed-14F195?style=flat&logo=solana&logoColor=white" alt="Devnet"/></a>
  <a href="https://www.anchor-lang.com/"><img src="https://img.shields.io/badge/Anchor-1.0.1-512BD4?style=flat" alt="Anchor"/></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.89-000000?style=flat&logo=rust&logoColor=white" alt="Rust"/></a>
  <a href="https://github.com/litesvm/litesvm"><img src="https://img.shields.io/badge/tests-36%20passing-success?style=flat" alt="Tests"/></a>
  <a href="https://docs.switchboard.xyz/product-documentation/randomness"><img src="https://img.shields.io/badge/VRF-Switchboard-00D4AA?style=flat" alt="Switchboard VRF"/></a>
  <a href="https://www.helius.dev/"><img src="https://img.shields.io/badge/RPC-Helius-FF4D00?style=flat" alt="Helius"/></a>
  <a href="https://www.privy.io/"><img src="https://img.shields.io/badge/Auth-Privy-7B61FF?style=flat" alt="Privy"/></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js"/></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/></a>
  <a href="https://raffl.fun"><img src="https://img.shields.io/badge/raffl.fun-live-FF4F00?style=flat" alt="raffl.fun"/></a>
</p>

<p align="center">
  On-chain raffle infrastructure on Solana. Anyone creates a raffle, deposits a prize, sets ticket pricing. Buyers enter, an on-chain VRF picks a winner trustlessly. Settlement is provably fair, custody is in PDAs, and there is no operator in the loop.
</p>

<p align="center"><i>Create a raffle. Anyone can enter. Chain picks the winner.</i></p>

## Live on Devnet

| | |
|---|---|
| **Program ID** | `Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA` |
| **Cluster** | devnet |
| **Explorer** | [view program on Solana Explorer](https://explorer.solana.com/address/Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA?cluster=devnet) |
| **IDL** | published on-chain (`anchor idl fetch ...`) |
| **Domain** | [raffl.fun](https://raffl.fun) |

## How it works

1. **Creator** opens a raffle: deposits the prize (SOL in v0.1) into a per-raffle PDA vault, sets ticket price, max tickets, and end time.
2. **Buyers** purchase tickets with SOL. Each ticket creates a `Ticket` PDA recording the buyer pubkey and ticket number.
3. When the raffle ends (time elapsed or sold out), anyone can call `request_draw`. Switchboard VRF returns a verifiable random value on-chain.
4. `settle_raffle` computes `winning_ticket = vrf_result % tickets_sold` and resolves the winner from the `Ticket` accounts.
5. **Winner** calls `claim_prize`. The vault releases the prize to the winner, the protocol fee to the treasury, and the remainder to the creator.

Every step is on-chain and publicly verifiable. No off-chain randomness, no custodial server, no admin override on settled raffles.

## Backend / On-chain stack

| Layer | Choice | Notes |
|---|---|---|
| Smart contract | **Anchor 1.0.1** (Rust) | Multi-file template; 9 instructions across `initialize_platform`, `create_raffle`, `buy_ticket`, `request_draw`, `settle_raffle`, `claim_prize`, `cancel_raffle`, `refund_ticket`, `reclaim_prize` |
| Randomness | **Switchboard On-Demand** (`switchboard-on-demand 0.12`, `solana-v3` feature) | Commit-reveal pattern; client bundles `commitIx` + `request_draw` in one tx, then `revealIx` + `settle_raffle` in the reveal slot. Devnet PID hardcoded; rotate before mainnet |
| Custody | PDA-controlled SOL vaults | One vault per raffle (`["vault", raffle.key()]`); rent-exempt by escrowed prize; CPI exploit blast radius is one raffle, not the protocol |
| Tests | **LiteSVM 0.10** (in-process Rust) | 36 tests, no validator required, sub-second runtime, full sysvar control for time-warp tests, injected Switchboard accounts for VRF coverage |
| Toolchain | Solana platform-tools v1.52, rustc 1.89, Cargo 1.89 | Solana CLI 3.1.14, agave-install for upgrades |
| RPC | **Helius** (devnet for hackathon) | Already paying / using for [GulfWatch](https://github.com/meowyx/gulfwatch); fast confirmations + reliable WS |
| Audit | `/safe-programs` 8-agent skill (1 pass) | 3 confirmed findings (cancel/refund path, draw deadlock, shared randomness) all fixed before deploy |

**Live program:** [`Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA`](https://explorer.solana.com/address/Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA?cluster=devnet) on devnet.

## Frontend stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server components by default; client components for wallet + tx interactions |
| Language | **TypeScript** | Strict mode |
| Styling | **Tailwind CSS** | Design system from `design/` (gitignored sketch repo): landing, dashboard, wheel-draw component |
| Bundler | **Turbopack** | Default in Next.js 16; fast dev rebuilds |
| Package manager | **pnpm** | Workspace-friendly, content-addressed store |
| Wallet / auth | **Privy** | Embedded wallets via email / Google / Twitter for non-crypto users; external Solana wallets (Phantom, Solflare) via `toSolanaWalletConnectors`; embedded wallet auto-mints for users without one |
| Solana SDK | `@solana/kit` + Codama-generated typed client for the raffl program (everything except settle) | Anchor + `@solana/web3.js` v1 confined to `lib/switchboard.ts` for the commit-reveal flow, since Switchboard's TS SDK has no kit-native variant yet |
| Hosting | **Vercel** | Plug-and-play Next.js deploys; preview branches per PR |

## Documentation

Deep-dive docs live under [`docs/`](./docs):

- [Architecture overview](./docs/architecture.md) - components, account topology, money flow, trust boundaries
- [Lifecycle](./docs/program/lifecycle.md) - state transitions and the happy path
- [Accounts](./docs/program/accounts.md) - PDA layout and seeds
- [Randomness](./docs/program/randomness.md) - Switchboard commit-reveal mechanics and the math
- [Cancel and refund](./docs/program/cancel-and-refund.md) - off-ramp paths
- [Payouts](./docs/program/payouts.md) - claim arithmetic with the protocol fee

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
│   ├── components/                Landing, dashboard, raffle, account, explore
│   ├── lib/                       Program client, hooks, switchboard wrapper
│   └── public/                    Static assets (logo)
├── docs/                          Architecture and program docs
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
