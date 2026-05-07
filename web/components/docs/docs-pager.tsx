import Link from "next/link";
import type { DocsNavItem } from "@/lib/docs/nav";

export function DocsPager({
  prev,
  next,
}: {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
}) {
  return (
    <div className="docs-pager">
      {prev ? (
        <Link className="pager-link prev" href={`/docs/${prev.slug}`}>
          <span className="dir">← Previous</span>
          <span className="name">{prev.name}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className="pager-link next" href={`/docs/${next.slug}`}>
          <span className="dir">Next →</span>
          <span className="name">{next.name}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
