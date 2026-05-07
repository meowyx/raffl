import Link from "next/link";

export function CreatorSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="creator-block">
          <div className="creator-grid">
            <div>
              <div
                className="section-eyebrow"
                style={{ color: "rgba(246,243,236,0.5)" }}
              >
                / for creators
              </div>
              <h2 className="section-title">
                Run a raffle in <em>two minutes</em>.
              </h2>
              <p className="section-sub">
                Drop a prize. Pick a price. Walk away. The contract handles
                ticketing, the draw, and payouts. You get 95% of the pot. We
                take 5% only when a raffle settles.
              </p>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <Link
                  href="/dashboard?tab=creator"
                  className="btn btn-accent btn-lg"
                >
                  Create your first raffle
                </Link>
                <Link
                  href="/docs"
                  className="btn btn-ghost btn-lg"
                  style={{
                    color: "#f6f3ec",
                    borderColor: "rgba(246,243,236,0.2)",
                  }}
                >
                  Read the docs
                </Link>
              </div>
            </div>

            <div className="fee-card">
              <div className="fee-meta">
                Example payout · 1,000 tickets at 0.1 SOL
              </div>
              <div className="fee-row">
                <span className="k">Ticket revenue</span>
                <span className="v">100.000 SOL</span>
              </div>
              <div className="fee-row">
                <span className="k">Protocol fee (5%)</span>
                <span className="v">−5.000 SOL</span>
              </div>
              <div className="fee-row">
                <span className="k">Switchboard VRF</span>
                <span className="v">−0.002 SOL</span>
              </div>
              <div className="fee-row">
                <span className="k">Network rent</span>
                <span className="v">−0.012 SOL</span>
              </div>
              <div className="fee-row total">
                <span className="k">You receive</span>
                <span className="v">94.986 SOL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
