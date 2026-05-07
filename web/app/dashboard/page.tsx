import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { DashTab } from "@/components/dashboard/dash-header";

const VALID_TABS: DashTab[] = ["creator", "buyer", "analytics", "history"];

function parseTab(raw: string | string[] | undefined): DashTab | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  return (VALID_TABS as string[]).includes(value) ? (value as DashTab) : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialTab = parseTab(sp.tab);
  return <DashboardContent initialTab={initialTab} />;
}
