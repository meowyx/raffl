"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "@/lib/docs/nav";

export function DocsSidebar() {
  const pathname = usePathname();
  const activeSlug = pathname?.split("/").pop();

  return (
    <aside className="docs-sidebar">
      {DOCS_NAV.map((sec) => (
        <div key={sec.label} className="sidebar-section">
          <div className="label">{sec.label}</div>
          {sec.items.map((it) => (
            <Link
              key={it.slug}
              href={`/docs/${it.slug}`}
              className={`sidebar-link ${activeSlug === it.slug ? "active" : ""}`}
            >
              <span>{it.name}</span>
              {it.badge && <span className="badge">{it.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
