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
              <a href="#">Explore raffles</a>
            </li>
            <li>
              <a href="#">Create raffle</a>
            </li>
            <li>
              <a href="#">Dashboard</a>
            </li>
            <li>
              <a href="#">Featured</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Build</h4>
          <ul>
            <li>
              <a href="#">Anchor program</a>
            </li>
            <li>
              <a href="#">IDL</a>
            </li>
            <li>
              <a href="#">Switchboard VRF</a>
            </li>
            <li>
              <a href="#">Audit report</a>
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
