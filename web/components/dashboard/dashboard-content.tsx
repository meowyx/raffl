"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { usePrivy } from "@privy-io/react-auth";
import { useActiveWallet } from "@/lib/wallet";
import { DashHeader, type DashTab } from "./dash-header";
import { CreatorView } from "./creator-view";
import { BuyerView } from "./buyer-view";
import {
  groupMyTicketsByRaffle,
  selectMyCreated,
} from "@/lib/types";
import {
  useAllTickets,
  useRaffles,
  useTicketsForBuyer,
} from "@/lib/hooks";

export function DashboardContent({ initialTab }: { initialTab?: DashTab }) {
  const [tab, setTab] = useState<DashTab>(initialTab ?? "buyer");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { wallet } = useActiveWallet();
  const me = wallet?.address ?? null;

  const { data: raffles } = useRaffles();
  const { data: myTickets } = useTicketsForBuyer(me);
  const { data: allTickets } = useAllTickets();

  const locked = ready && !authenticated;

  const creatorCount = selectMyCreated(raffles, me).filter(
    (r) => r.state === "active" || r.state === "drawing",
  ).length;
  const buyerCount = groupMyTicketsByRaffle(myTickets, raffles, me).filter(
    (g) => g.raffle.state === "active",
  ).length;
  const exploreCount = raffles.filter((r) => r.state === "active").length;

  return (
    <TabsPrimitive.Root
      value={tab}
      onValueChange={(v) => setTab(v as DashTab)}
      className={`dash-shell${locked ? " dash-shell-locked" : ""}`}
    >
      <DashHeader
        creatorCount={creatorCount}
        buyerCount={buyerCount}
        exploreCount={exploreCount}
      />
      <div
        className="dash-body"
        aria-hidden={locked || undefined}
        inert={locked || undefined}
      >
        <TabsPrimitive.Content value="creator">
          <CreatorView
            now={now}
            raffles={raffles}
            recentTickets={allTickets}
            me={me}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="buyer">
          <BuyerView
            now={now}
            raffles={raffles}
            myTickets={myTickets}
            me={me}
          />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="analytics">
          <ComingSoon label="Analytics" />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="history">
          <ComingSoon label="History" />
        </TabsPrimitive.Content>
      </div>
      {locked && (
        <div className="dash-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="dash-lock-title">
          <div className="dash-lock-card">
            <h2 id="dash-lock-title">Connect to see your dashboard</h2>
            <p>
              Sign in to see raffles you&apos;ve created, tickets you hold, payouts ready to claim, and your buyer activity.
            </p>
            <div className="dash-lock-actions">
              <button type="button" className="btn btn-primary" onClick={login}>
                Login
              </button>
              <Link href="/" className="btn btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      )}
    </TabsPrimitive.Root>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{label}</h3>
      </div>
      <div className="empty">{label} view ships post-hackathon.</div>
    </div>
  );
}
