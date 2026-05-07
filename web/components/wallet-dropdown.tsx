"use client";

import Link from "next/link";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Check, Copy, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortAddress } from "@/lib/types";
import { useActiveWallet } from "@/lib/wallet";

export function WalletDropdown() {
  const { ready, authenticated, logout } = usePrivy();
  const { wallet: active } = useActiveWallet();
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return (
      <div className="wallet-pill">
        <span className="wallet-avatar" aria-hidden />
        <span className="addr">…</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="wallet-pill">
        <span className="wallet-avatar" aria-hidden />
        <span className="addr">not connected</span>
      </div>
    );
  }

  const address = active?.address;

  const onCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="wallet-pill" aria-label="Wallet menu">
          <span className="wallet-avatar" aria-hidden />
          <span className="balance">solana · devnet</span>
          <span className="addr">{address ? shortAddress(address) : "no wallet"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCopy} onSelect={(e) => e.preventDefault()}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy address
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} variant="destructive">
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
