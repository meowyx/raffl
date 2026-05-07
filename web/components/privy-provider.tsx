"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { rpc, rpcSubscriptions } from "@/lib/rpc";
import { PrivyToasts } from "@/components/privy-toasts";

const solanaConnectors = toSolanaWalletConnectors();

export function RafflPrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet", "email", "google", "twitter"],
        appearance: {
          showWalletLoginFirst: true,
          walletChainType: "solana-only",
          theme: "dark",
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        solana: {
          rpcs: {
            "solana:devnet": { rpc, rpcSubscriptions },
          },
        },
      }}
    >
      <PrivyToasts>{children}</PrivyToasts>
    </PrivyProvider>
  );
}
