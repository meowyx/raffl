import Link from "next/link";
import { BrandMark } from "@/components/landing/wheel";
import { DocsSearchTrigger } from "./docs-search";

export function DocsNav() {
  return (
    <header className="docs-nav">
      <Link href="/" className="brand" aria-label="raffl home">
        <BrandMark size={24} />
        <span className="brand-tag">docs</span>
      </Link>
      <div className="center">
        <DocsSearchTrigger />
      </div>
      <div className="right">
        <Link href="/" className="btn btn-ghost btn-sm">
          ← Site
        </Link>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          Dashboard
        </Link>
        <Link href="/dashboard" className="btn btn-accent btn-sm">
          Launch app
        </Link>
      </div>
    </header>
  );
}
