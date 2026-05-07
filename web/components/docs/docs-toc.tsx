"use client";

import { useEffect, useState } from "react";

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function DocsToc({
  items,
  editPath,
}: {
  items: TocItem[];
  editPath?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;
    const onScroll = () => {
      let current = items[0].id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top < 120) current = it.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  return (
    <aside className="docs-toc">
      <div className="label">On this page</div>
      {items.length === 0 ? (
        <div className="docs-toc-empty">-</div>
      ) : (
        items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`toc-link lvl-${it.level} ${
              activeId === it.id ? "active" : ""
            }`}
          >
            {it.text}
          </a>
        ))
      )}
      <div className="feedback">
        {editPath && (
          <a
            href={`https://github.com/meowyx/raffl/edit/main/web/components/docs/pages/${editPath}`}
            target="_blank"
            rel="noreferrer"
          >
            ↗ Edit on GitHub
          </a>
        )}
        <a
          href="https://github.com/meowyx/raffl/issues/new"
          target="_blank"
          rel="noreferrer"
        >
          ✦ Was this helpful?
        </a>
      </div>
    </aside>
  );
}
