"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

// Picks the wallet matching the authenticated identity. With multiple Solana
// extensions installed, useWallets() returns them in undefined order, so
// always match against usePrivy().user.wallet.address.
export function useActiveWallet() {
  const { user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const activeAddress = user?.wallet?.address;
  const wallet = activeAddress
    ? wallets.find((w) => w.address === activeAddress) ?? null
    : (wallets[0] ?? null);

  return { wallet, ready: privyReady && walletsReady };
}
