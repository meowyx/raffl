export function WhyRaffl() {
  return (
    <section className="section section-tight">
      <div className="container">
        <div className="section-eyebrow">/ why raffl</div>
        <h2 className="section-title">
          Built like a <em>contract</em>, not a casino.
        </h2>

        <div className="why-grid">
          <div className="why-card dark">
            <div className="why-header">
              Provably fair
              <span style={{ marginLeft: "auto", color: "var(--accent)" }}>
                VRF receipt
              </span>
            </div>
            <h3>Every draw is a public, verifiable transaction.</h3>
            <p>
              Switchboard signs the random number off-chain and writes it
              on-chain. Anyone can replay the math.
            </p>

            <div className="why-receipt">
              <div className="why-receipt-row">
                <span className="k">raffle</span>
                <span className="v">001 · Patek 5711</span>
              </div>
              <div className="why-receipt-row">
                <span className="k">tickets_sold</span>
                <span className="v">2,500</span>
              </div>
              <div className="why-receipt-row">
                <span className="k">vrf_result</span>
                <span className="v">Aio4…4ji2</span>
              </div>
              <div className="why-receipt-row">
                <span className="k">winning_ticket</span>
                <span className="v accent">#1,847</span>
              </div>
              <div className="why-receipt-row">
                <span className="k">winner</span>
                <span className="v">9mNx…kP4r</span>
              </div>
            </div>
          </div>

          <div className="why-card">
            <div className="why-header">No trust required</div>
            <h3>The protocol can&apos;t touch your prize.</h3>
            <p>
              Funds sit in a PDA vault that&apos;s program-locked. Even raffl
              admins can&apos;t drain it mid-raffle. Refunds run trustlessly if
              a raffle cancels.
            </p>

            <div className="why-features">
              <div className="why-feature">
                <span className="check">✓</span>
                <div>
                  <span className="label">PDA-escrowed prizes.</span>
                  <span className="desc">
                    Funds are program-owned, not custodial.
                  </span>
                </div>
              </div>
              <div className="why-feature">
                <span className="check">✓</span>
                <div>
                  <span className="label">No seed phrase needed.</span>
                  <span className="desc">
                    Sign up with email or Google. Keys via Privy MPC.
                  </span>
                </div>
              </div>
              <div className="why-feature">
                <span className="check">✓</span>
                <div>
                  <span className="label">Refunds are trustless.</span>
                  <span className="desc">
                    Buyer calls <code>claim_refund</code>. No admin.
                  </span>
                </div>
              </div>
              <div className="why-feature">
                <span className="check">✓</span>
                <div>
                  <span className="label">Open-source program.</span>
                  <span className="desc">
                    Anchor IDL published. Re-verify the build hash.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
