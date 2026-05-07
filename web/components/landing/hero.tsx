import Link from "next/link";
import { BigWheel } from "./wheel";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          <span className="hero-eyebrow">
            <span className="dot" />
            LIVE ON SOLANA · DEVNET
          </span>

          <h1 className="hero-title">
            Anyone can run a raffle. The <em>chain</em> picks the winner.
          </h1>

          <p className="hero-sub">
            Permissionless on-chain raffles. Deposit a prize, set a ticket
            price, let buyers enter from any wallet (or none at all).
            Switchboard VRF picks the winner. No operator. No
            &ldquo;trust us.&rdquo;
          </p>

          <div className="hero-ctas">
            <Link href="/dashboard?tab=creator" className="btn btn-accent btn-lg">
              Start a raffle
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7h8M8 4l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link href="/dashboard?tab=buyer" className="btn btn-ghost btn-lg">
              Browse raffles
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="num">Devnet</span>
              <span className="lbl">Live now</span>
            </div>
            <div className="hero-stat">
              <span className="num">VRF</span>
              <span className="lbl">Random source</span>
            </div>
            <div className="hero-stat">
              <span className="num">5%</span>
              <span className="lbl">Protocol fee</span>
            </div>
          </div>
        </div>

        <div className="wheel-stage">
          <div className="wheel-tag tl">
            <span className="dot" />
            VRF · 0x7c3d…a91f
          </div>

          <BigWheel segments={12} winnerIndex={2} />

          <div className="wheel-callout bl">
            <span className="k">Winning wedge</span>
            <span className="v">ticket #1,847</span>
          </div>

          <div className="wheel-tag br">
            <span className="dot" />
            Switchboard verified
          </div>
        </div>
      </div>
    </section>
  );
}
