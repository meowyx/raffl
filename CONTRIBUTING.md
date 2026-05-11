# Contributing to raffl

## Prereqs

- [ ] Rust 1.89.0 (set via `program/rust-toolchain.toml`)
- [ ] Anchor 1.0.1 (declared in `program/programs/raffl/Cargo.toml`)
- [ ] Solana CLI 2.x (`agave-install` recommended)
- [ ] Node.js 20.x
- [ ] pnpm 9+
- [ ] A devnet wallet with some SOL ([faucet](https://faucet.solana.com))

The program workspace uses yarn (per `program/Anchor.toml`); the web app uses pnpm. Both work side by side.

## Local setup

```bash
git clone https://github.com/meowyx/raffl
cd raffl

# Program
cd program
anchor build

# Web
cd ../web
pnpm install
cp .env.example .env.local       # fill in values per the comments
```

## Run the program tests

LiteSVM runs in-process, no validator needed.

```bash
cd program
cargo test --test test_lifecycle -- --nocapture --test-threads=1
```

You'll see 7 tests pass in under a second. To run all 35 tests across the five test files:

```bash
cargo test -- --test-threads=1
```

The five test files: `test_initialize_platform`, `test_create_raffle`, `test_buy_ticket`, `test_cancel_refund_reclaim`, `test_lifecycle`.

## Run the web app

```bash
cd web
pnpm dev
```

App at `http://localhost:3000`. Hot-reload via Turbopack.

## After IDL changes

If you modify any `.rs` file under `program/programs/raffl/src/`, the IDL changes. Regenerate the typed client used by the frontend:

```bash
cd web
cp ../program/target/idl/raffl.json lib/idl/raffl.json
pnpm generate-client
```

Commit the resulting changes in `web/lib/program-client/` along with your program changes. Skipping this step puts diffs on unrelated PRs later.

## PR convention

- Branch: a descriptive name, no enforced prefix (existing branches use names like `tx-explorer`).
- Commit messages: lowercase, imperative, descriptive but terse. Match the existing log style: `added switchboard vrf`, `tx explorer link`, `payout fix`.
- Don't include AI attribution trailers (no `Co-Authored-By: Claude`, no "Generated with").
- One concern per PR. A typo fix and a new feature don't bundle.

## Common gotchas

- **Codama-generated files create spurious diffs.** `web/lib/program-client/` is auto-generated from the IDL. Regenerate it (`pnpm generate-client`) after IDL changes and commit the result; otherwise its diff appears on your next unrelated PR.
- **Prize description is bytes, not characters.** The program enforces a 128-byte cap (`MAX_PRIZE_DESCRIPTION_LEN`). The frontend approximates this with character count (`MAX_DESCRIPTION_LENGTH = 128` in `web/components/dashboard/create-form.tsx`), but UTF-8 multi-byte characters such as emoji can still exceed the on-chain limit and be rejected at submit.
- **Wallet path default.** `program/Anchor.toml` points the deployer wallet at `~/.config/solana/deployer.json`. Override or use a different keypair path if that's not where your devnet wallet lives.
- **`solana-account` must stay on `^3`.** LiteSVM 0.10 pins to this version. Bumping it breaks the test harness; see the dependency comment in `program/programs/raffl/Cargo.toml`.
- **`getrandom` SBF feature.** The program declares a no-op `getrandom` backend to satisfy transitive deps from `secp256k1`. Removing the shim breaks the build under SBF; see the comment in `program/programs/raffl/src/lib.rs`.

## Where to ask questions

Open an issue at [github.com/meowyx/raffl](https://github.com/meowyx/raffl).
