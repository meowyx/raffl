import Link from "next/link";
import { BrandMark } from "./wheel";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <BrandMark size={32} />
          <p className="footer-brand-tag">
            Permissionless on-chain raffles on Solana. Provably fair,
            programmatically settled.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li>
              <Link href="/dashboard?tab=buyer">Browse raffles</Link>
            </li>
            <li>
              <Link href="/dashboard?tab=creator">Create raffle</Link>
            </li>
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Build</h4>
          <ul>
            <li>
              <a
                href="https://explorer.solana.com/address/Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anchor program
              </a>
            </li>
            <li>
              <a
                href="https://github.com/meowyx/raffl/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs
              </a>
            </li>
            <li>
              <a
                href="https://docs.switchboard.xyz/product-documentation/randomness"
                target="_blank"
                rel="noopener noreferrer"
              >
                Switchboard VRF
              </a>
            </li>
            <li>
              <a
                href="https://github.com/meowyx/raffl"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Connect</h4>
          <ul>
            <li>
              <a href="https://github.com/meowyx/raffl">GitHub</a>
            </li>
            <li>
              <a href="#">Twitter / X</a>
            </li>
            <li>
              <a href="#">Discord</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <span>raffl.fun · v0.1 · Solana devnet</span>
        <span>© 2026 raffl labs</span>
      </div>
    </footer>
  );
}
