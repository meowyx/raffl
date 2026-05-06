import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";
import { BrandMark } from "./wheel";

export function Nav({ active = "home" }: { active?: string }) {
  return (
    <nav className="nav">
      <Link className="brand" href="/">
        <BrandMark size={32} />
      </Link>
      <div className="nav-links">
        <a href="#" className={active === "explore" ? "active" : ""}>
          Explore
        </a>
        <a href="#" className={active === "create" ? "active" : ""}>
          Create
        </a>
        <a href="#" className={active === "dashboard" ? "active" : ""}>
          Dashboard
        </a>
        <a href="#">Docs</a>
      </div>
      <div className="nav-cta">
        <ConnectButton />
        <button className="btn btn-primary">Launch app</button>
      </div>
    </nav>
  );
}
