/* eslint-disable @next/next/no-img-element */
const markStyle: React.CSSProperties = {
  height: 24,
  width: "auto",
  maxHeight: 24,
  objectFit: "contain",
  display: "block",
  flexShrink: 0,
};

export function TrustStrip() {
  return (
    <section className="trust-strip">
      <div className="trust-row">
        <span className="trust-label">Built on</span>
        <div className="trust-logos">
          <span className="trust-logo">
            <img src="/solana-logo.png" alt="Solana" style={markStyle} />
            Solana
          </span>
          <span className="trust-logo">
            <span
              role="img"
              aria-label="Switchboard"
              style={{
                width: 24,
                height: 24,
                backgroundImage: "url(/switchboard-logo.svg)",
                backgroundSize: "auto 24px",
                backgroundPosition: "left center",
                backgroundRepeat: "no-repeat",
                flexShrink: 0,
                display: "block",
              }}
            />
            Switchboard&nbsp;VRF
          </span>
          <span className="trust-logo">
            <img src="/privy-logo.png" alt="Privy" style={markStyle} />
            Privy
          </span>
          <span className="trust-logo">
            <img src="/helius-logo.png" alt="Helius" style={markStyle} />
            Helius
          </span>
        </div>
        <span className="trust-label">Devnet · v0.1</span>
      </div>
    </section>
  );
}
