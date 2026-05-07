"use client";

import { useEffect, useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { useWallets } from "@privy-io/react-auth/solana";
import { DashHeader, type DashTab } from "./dash-header";
import { CreatorView } from "./creator-view";
import { BuyerView } from "./buyer-view";
import {
  groupMyTicketsByRaffle,
  selectMyCreated,
} from "@/lib/mock-data";
import {
  useAllTickets,
  useRaffles,
  useTicketsForBuyer,
} from "@/lib/hooks";

export function DashboardContent({ initialTab }: { initialTab?: DashTab }) {
  const [tab, setTab] = useState<DashTab>(initialTab ?? "creator");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { wallets } = useWallets();
  const me = wallets[0]?.address ?? null;

  const { data: raffles } = useRaffles();
  const { data: myTickets } = useTicketsForBuyer(me);
  const { data: allTickets } = useAllTickets();

  const creatorCount = selectMyCreated(raffles, me).filter(
    (r) => r.state === "active" || r.state === "drawing",
  ).length;
  const buyerCount = groupMyTicketsByRaffle(myTickets, raffles, me).filter(
    (g) => g.raffle.state === "active",
  ).length;

  return (
    <TabsPrimitive.Root
      value={tab}
      onValueChange={(v) => setTab(v as DashTab)}
      className="dash-shell"
    >
      <DashHeader creatorCount={creatorCount} buyerCount={buyerCount} />
      <div className="dash-body">
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
