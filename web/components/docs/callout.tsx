import type { ReactNode } from "react";

type Variant = "info" | "warn";

const ICONS: Record<Variant, ReactNode> = {
  info: (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4m0 3v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  warn: (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2 1.5 17h17L10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8v4m0 2v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: Variant;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`callout ${variant}`}>
      {ICONS[variant]}
      <div className="body">
        <strong>{title}</strong>
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </div>
  );
}
