"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";

const solanaConnectors = toSolanaWalletConnectors();

const rpc = createSolanaRpc("/api/rpc");
const rpcSubscriptions = createSolanaRpcSubscriptions(
  process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? "wss://api.devnet.solana.com",
);

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
      {children}
    </PrivyProvider>
  );
}
