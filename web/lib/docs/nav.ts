export type DocsNavItem = {
  slug: string;
  name: string;
  badge?: string;
};

export type DocsNavSection = {
  label: string;
  items: DocsNavItem[];
};

export const DOCS_NAV: DocsNavSection[] = [
  {
    label: "Get started",
    items: [
      { slug: "introduction", name: "Introduction" },
      { slug: "getting-started", name: "Getting started" },
      { slug: "core-concepts", name: "Core concepts" },
    ],
  },
  {
    label: "Run a raffle",
    items: [
      { slug: "creators-overview", name: "For creators" },
      { slug: "create-raffle", name: "Create a raffle" },
      { slug: "manage-raffle", name: "Manage & cancel" },
      { slug: "payouts", name: "Payouts" },
    ],
  },
  {
    label: "Enter a raffle",
    items: [
      { slug: "buyers-overview", name: "For buyers" },
      { slug: "buy-tickets", name: "Buying tickets" },
      { slug: "claim-prize", name: "Claiming prizes" },
    ],
  },
  {
    label: "Protocol",
    items: [
      { slug: "on-chain", name: "On-chain program" },
      { slug: "pdas", name: "PDAs & accounts" },
      { slug: "instructions", name: "Instructions" },
      { slug: "idl", name: "IDL", badge: "json" },
    ],
  },
  {
    label: "Fairness",
    items: [
      { slug: "vrf", name: "Switchboard VRF" },
      { slug: "verify-draw", name: "Verify a draw" },
    ],
  },
  {
    label: "Reference",
    items: [
      { slug: "fees", name: "Fees & limits" },
      { slug: "sdk", name: "TS SDK", badge: "v0.4" },
      { slug: "rest", name: "REST API" },
      { slug: "faq", name: "FAQ" },
    ],
  },
];

const FLAT: DocsNavItem[] = DOCS_NAV.flatMap((s) => s.items);

export function getDocsItem(slug: string): DocsNavItem | undefined {
  return FLAT.find((it) => it.slug === slug);
}

export function getDocsSection(slug: string): DocsNavSection | undefined {
  return DOCS_NAV.find((s) => s.items.some((it) => it.slug === slug));
}

export function getAllSlugs(): string[] {
  return FLAT.map((it) => it.slug);
}

export function getPager(slug: string): {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
} {
  const idx = FLAT.findIndex((it) => it.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? FLAT[idx - 1] : null,
    next: idx < FLAT.length - 1 ? FLAT[idx + 1] : null,
  };
}
