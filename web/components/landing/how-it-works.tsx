export function HowItWorks() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-eyebrow">/ how it works</div>
        <h2 className="section-title">
          Three steps. <em>Zero</em> trust required.
        </h2>
        <p className="section-sub">
          Every raffle lives entirely on-chain. The contract holds the prize,
          mints tickets, calls the VRF, and pays the winner. No operator in
          the middle.
        </p>

        <div className="how-grid">
          <div className="how-card">
            <div className="how-num">01</div>
            <h3>Create &amp; deposit</h3>
            <p>
              Creator sets prize, ticket price, and end time. Prize escrows
              into a PDA vault that no one, not even raffl, can drain.
            </p>
            <div className="demo">
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>create_raffle</code>
                <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>
                  0.5 SOL
                </span>
              </div>
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>vault_deposit</code>
                <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>
                  1,247 SOL
                </span>
              </div>
            </div>
          </div>

          <div className="how-card">
            <div className="how-num">02</div>
            <h3>Buyers enter</h3>
            <p>
              Anyone connects with email, Google, or Phantom. Each ticket mints
              a PDA tied to their wallet. SOL flows to the vault.
            </p>
            <div className="demo">
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>buy_ticket</code>
                <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>
                  ×4
                </span>
              </div>
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>ticket_minted</code>
                <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>
                  #1839–1842
                </span>
              </div>
            </div>
          </div>

          <div className="how-card">
            <div className="how-num">03</div>
            <h3>Chain picks</h3>
            <p>
              Time elapses or tickets sell out. Switchboard VRF returns a
              verifiable random number. The winner claims the prize on-chain.
            </p>
            <div className="demo">
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>request_draw</code>
                <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>
                  vrf:Aio4…
                </span>
              </div>
              <div className="demo-row">
                <span style={{ color: "var(--accent)" }}>›</span>
                <code>claim_prize</code>
                <span style={{ marginLeft: "auto", color: "var(--positive)" }}>
                  ✓ settled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
