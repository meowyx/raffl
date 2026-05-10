<p align="center">
  <img src="https://res.cloudinary.com/resourcefulmind-inc/image/upload/v1778428087/Screenshot_2026-05-10_at_4.45.45_PM_jegd0b.png" alt="raffl: anyone can run a raffle, the chain picks the winner" width="900" />
</p>

<h1 align="center">raffl</h1>

<p align="center"><i>Permissionless on-chain raffles on Solana. Try one in 30 seconds.</i></p>

<p align="center">
  <a href="https://raffl.fun"><img src="https://img.shields.io/badge/raffl.fun-try%20it%20now-FF4F00?style=for-the-badge" alt="Try it now"/></a>
  &nbsp;
  <a href="https://explorer.solana.com/address/Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA?cluster=devnet"><img src="https://img.shields.io/badge/devnet-deployed-14F195?style=flat&logo=solana&logoColor=white" alt="Devnet"/></a>
  &nbsp;
  <a href="https://github.com/meowyx/raffl/stargazers"><img src="https://img.shields.io/github/stars/meowyx/raffl?style=flat" alt="GitHub stars"/></a>
</p>

---

## What is raffl

Every raffle on the internet asks you to trust someone. Trust the streamer to actually pull a name. Trust the platform's "random" backend. Trust that the prize even exists.

raffl deletes that whole stack. A creator escrows a prize, opens it up at a ticket price, and walks away. People buy in with email or a wallet. When the timer hits zero, Switchboard's verifiable random function picks the winner on-chain. The vault pays out in the same transaction. Nobody can rig it. Including the creator.

## What it's good for

**A monetized giveaway.** A creator wants to give one fan something real, say $1,000 in SOL. They put up the prize from their own funds and open the raffle at $5 tickets. Five hundred fans buy in. One walks away with $1,000. The creator collects $2,375 in ticket revenue (after the 5% protocol fee). The creator spent nothing net, and turned an audience moment into a real win for one fan.

**A self-fundraiser without a payment processor.** Someone in your community is in a bad spot. They put up a small prize (say $200 they already own) and run a raffle for themselves. Tickets are $10. Five hundred people pitch in to help. The winner gets the $200. The person fundraising walks away with $4,750 to cover what they actually need. No GoFundMe taking 8%, no PayPal freezing the account, no platform owning the relationship.

## Try it now

The fastest path from "what is this" to "I'm in":

1. Visit **[raffl.fun](https://raffl.fun)**.
2. Sign in with email, Google, or a Solana wallet.
3. Grab some devnet SOL from [the faucet](https://faucet.solana.com). A quarter of a SOL is plenty.
4. Browse open raffles and buy a five-dollar ticket, **or** click "Start a raffle" and run a small one yourself.

Five minutes from cold start to "I just won (or lost) a real on-chain raffle."

## What makes it different

1. **Nobody can rig it.** Switchboard VRF picks every winner on-chain. The prize sits in a per-raffle vault that even the creator can't drain early. Anyone can verify the math after the fact.
2. **No crypto wallet required.** Email, Google, or your own wallet. raffl mints embedded Solana wallets for users who don't have one.
3. **Refunds if it doesn't fill.** Buyers pull their own money back from the vault. No support ticket, no chargeback, no waiting.
4. **Internally audited (May 2026).** Three findings, all fixed before deploy. Mitigations in the [program docs](./docs/architecture.md).

<p align="center">
  <img src="https://res.cloudinary.com/resourcefulmind-inc/image/upload/v1778427935/Screenshot_2026-05-10_at_4.37.33_PM_qcatsk.png" alt="A real raffle on raffl: 0.50 SOL prize, 7 of 50 tickets sold, recent buyers visible" width="900" />
</p>

<p align="center"><sub>A real raffle that ran on the live system: 0.50 SOL prize, 0.05 SOL tickets, recent buyers visible on-chain.</sub></p>

## What's coming

raffl is **v0.1, devnet-only**. What that means:

- Prizes are SOL only. SPL tokens, NFTs, and USDC arrive in v0.2.
- The protocol fee is 5%, capped at 20% by the program itself.
- Mainnet ships post-hackathon. Soon, not "tomorrow."
- A few edge cases lack automated recovery today. v0.2 adds force-settle, claim timeouts, and SPL token prizes.

Architecture and v0.1 deep-dives in [docs/architecture.md](./docs/architecture.md).

## Built with

**Program:** [Anchor 1.0.1](https://www.anchor-lang.com/) (Rust 1.89), [Switchboard On-Demand](https://docs.switchboard.xyz/product-documentation/randomness) for verifiable randomness, [LiteSVM](https://github.com/litesvm/litesvm) for in-process tests (sub-second, no validator).

**Frontend:** [Next.js 16](https://nextjs.org/) with React 19 and Tailwind v4, [@solana/kit](https://github.com/anza-xyz/kit) with a [Codama](https://github.com/codama-idl/codama)-generated typed client.

**Partners:** [Switchboard](https://switchboard.xyz/) provides the on-demand VRF that picks every winner. [Helius](https://www.helius.dev/) provides the RPC. [Privy](https://www.privy.io/) handles auth and the embedded wallets that let non-crypto users in.

<p align="center">
  <a href="https://www.anchor-lang.com/"><img src="https://img.shields.io/badge/Anchor-1.0.1-512BD4?style=flat" alt="Anchor"/></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.89-000000?style=flat&logo=rust&logoColor=white" alt="Rust"/></a>
  <a href="https://github.com/litesvm/litesvm"><img src="https://img.shields.io/badge/tests-36%20passing-success?style=flat" alt="Tests"/></a>
  <a href="https://docs.switchboard.xyz/product-documentation/randomness"><img src="https://img.shields.io/badge/VRF-Switchboard-00D4AA?style=flat" alt="Switchboard VRF"/></a>
  <a href="https://www.helius.dev/"><img src="https://img.shields.io/badge/RPC-Helius-FF4D00?style=flat" alt="Helius"/></a>
  <a href="https://www.privy.io/"><img src="https://img.shields.io/badge/Auth-Privy-7B61FF?style=flat" alt="Privy"/></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js"/></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/></a>
</p>

## For developers

```
.
├── program/                    Anchor 1.0.1 workspace; Rust + LiteSVM tests
├── web/                        Next.js 16 app deployed to raffl.fun
├── docs/                       Architecture and program deep-dives
└── README.md
```

**Local development:**

```bash
# Program
cd program
anchor build
cargo test --test test_lifecycle -- --nocapture --test-threads=1

# Web
cd web
pnpm install
cp .env.example .env.local       # fill in values per the comments
pnpm dev
```

**Documentation:**

- [docs/architecture.md](./docs/architecture.md): overview, account topology, money flow, trust boundaries
- [docs/program/](./docs/program/): lifecycle, accounts, randomness, payouts, cancel/refund deep-dives
- [raffl.fun/docs](https://raffl.fun/docs): public-facing user docs

**Contributing:** A `CONTRIBUTING.md` is on the doc backlog. Until then, open an issue or PR on [GitHub](https://github.com/meowyx/raffl).

## License

TBD. Will be set before mainnet launch.
