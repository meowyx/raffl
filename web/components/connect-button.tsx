"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return (
      <button className="btn btn-ghost" disabled>
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn btn-ghost" onClick={login}>
        Connect wallet
      </button>
    );
  }

  const active = wallets[0];
  const label = active ? shortAddress(active.address) : "Connected";

  return (
    <button className="btn btn-ghost" onClick={logout} title="Disconnect">
      {label}
    </button>
  );
}
