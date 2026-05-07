"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

// Returns the wallet the user actually authenticated with, not just `wallets[0]`.
// When a user has multiple Solana wallet extensions installed (e.g. Phantom +
// Solflare), `useWallets()` returns all connected ones in undefined order. The
// authenticated identity lives in `usePrivy().user.wallet.address` — match it
// against the wallets array to find the right signer for transactions.
export function useActiveWallet() {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const activeAddress = user?.wallet?.address;
  const wallet = activeAddress
    ? wallets.find((w) => w.address === activeAddress) ?? null
    : (wallets[0] ?? null);

  return { wallet, ready: privyReady && walletsReady };
}
