"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectButton } from "@/components/connect-button";
import { BrandMark } from "./wheel";

type NavProps = { active?: string };

export function Nav({ active = "home" }: NavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <nav className="nav">
        <Link className="brand" href="/" onClick={close}>
          <BrandMark size={32} />
        </Link>
        <div className="nav-links">
          <Link
            href="/dashboard"
            className={active === "dashboard" ? "active" : ""}
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/meowyx/raffl/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </div>
        <div className="nav-cta">
          <ConnectButton />
          <Link href="/dashboard" className="btn btn-primary">
            Launch app
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M5 5L15 15M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="nav-menu-mobile">
          <Link
            href="/dashboard"
            className={active === "dashboard" ? "active" : ""}
            onClick={close}
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/meowyx/raffl/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            Docs
          </a>
          <Link href="/dashboard" className="btn btn-primary" onClick={close}>
            Launch app
          </Link>
        </div>
      )}
    </>
  );
}
