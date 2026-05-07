"use client";

import Link from "next/link";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Check, Copy, LogOut, ChevronDown, User } from "lucide-react";
import { useActiveWallet } from "@/lib/wallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallet: active } = useActiveWallet();
  const [copied, setCopied] = useState(false);

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
        Login
      </button>
    );
  }

  const address = active?.address;
  const label = address ? shortAddress(address) : "Connected";

  const onCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="btn btn-ghost inline-flex items-center gap-1.5">
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
