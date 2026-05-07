import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs/docs-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-shell">
      <DocsNav />
      <div className="docs-body">
        <DocsSidebar />
        {children}
      </div>
    </div>
  );
}
