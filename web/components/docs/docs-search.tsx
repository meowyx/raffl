"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCS_NAV } from "@/lib/docs/nav";

const FLAT = DOCS_NAV.flatMap((s) =>
  s.items.map((it) => ({ ...it, section: s.label })),
);

export function DocsSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="docs-search"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
      >
        <svg className="icon" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m11 11 3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="placeholder">Search docs</span>
        <span className="kbd">⌘ K</span>
      </button>
      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = q.trim()
    ? FLAT.filter(
        (it) =>
          it.name.toLowerCase().includes(q.toLowerCase()) ||
          it.section.toLowerCase().includes(q.toLowerCase()),
      )
    : FLAT.slice(0, 6);

  const jump = (slug: string) => {
    router.push(`/docs/${slug}`);
    onClose();
  };

  return (
    <div className="docs-search-backdrop" onClick={onClose}>
      <div
        className="docs-search-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search documentation"
      >
        <div className="docs-search-input-row">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="m11 11 3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) jump(results[0].slug);
            }}
          />
          <button type="button" onClick={onClose} className="kbd">
            esc
          </button>
        </div>
        <div className="docs-search-results">
          {results.length === 0 ? (
            <div className="docs-search-empty">No results for &ldquo;{q}&rdquo;</div>
          ) : (
            results.map((it) => (
              <button
                key={it.slug}
                type="button"
                className="docs-search-result"
                onClick={() => jump(it.slug)}
              >
                <div>
                  <div className="name">{it.name}</div>
                  <div className="section">{it.section}</div>
                </div>
                <span className="arrow">→</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
