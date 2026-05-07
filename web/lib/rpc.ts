"use client";

import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";

// Reads go through /api/rpc (Next route handler that proxies to HELIUS_RPC_URL,
// keeping the Helius API key server-side). WS subscriptions can't be cleanly
// proxied through a route handler, so they hit public devnet directly.
export const rpc = createSolanaRpc("/api/rpc");

export const rpcSubscriptions = createSolanaRpcSubscriptions(
  process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? "wss://api.devnet.solana.com",
);
