"use client";

import Link from "next/link";
import { Tabs as TabsPrimitive } from "radix-ui";
import { BrandMark } from "@/components/landing/wheel";
import { WalletDropdown } from "@/components/wallet-dropdown";

export type DashTab = "creator" | "buyer" | "analytics" | "history";

type DashHeaderProps = {
  creatorCount: number;
  buyerCount: number;
  exploreCount: number;
};

export function DashHeader({ creatorCount, buyerCount, exploreCount }: DashHeaderProps) {
  return (
    <div className="dash-header">
      <div className="dash-header-row">
        <Link href="/" className="dash-brand-link" aria-label="raffl home">
          <BrandMark size={32} />
          <span className="dash-eyebrow">/ dashboard</span>
        </Link>
        <div className="dash-header-actions">
          <Link href="/dashboard/create" className="btn btn-accent">
            + Create raffle
          </Link>
          <WalletDropdown />
        </div>
      </div>
      <TabsPrimitive.List className="dash-tabs">
        <TabsPrimitive.Trigger value="buyer" className="dash-tab">
          Buyer
          <span className="count">{buyerCount}</span>
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="creator" className="dash-tab">
          Creator
          <span className="count">{creatorCount}</span>
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="analytics" className="dash-tab">
          Analytics
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="history" className="dash-tab">
          History
        </TabsPrimitive.Trigger>
        <Link href="/explore" className="dash-tab dash-tab-link">
          Explore
          {exploreCount > 0 && (
            <span className="count">{exploreCount > 999 ? "999+" : exploreCount}</span>
          )}
          <span className="dash-tab-arrow" aria-hidden>↗</span>
        </Link>
      </TabsPrimitive.List>
    </div>
  );
}

