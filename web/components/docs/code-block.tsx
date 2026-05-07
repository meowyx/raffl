"use client";

import { useState } from "react";

export type CodeTab = {
  label: string;
  lang: "ts" | "js" | "rust" | "bash" | "json" | "text";
  code: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code: string, lang: CodeTab["lang"]): string {
  let s = escapeHtml(code);
  if (lang === "rust") {
    s = s.replace(/(\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
    s = s.replace(
      /\b(pub|fn|let|mut|use|struct|impl|self|Self|return|if|else|match|for|in|loop|as|crate|mod|where|async|await|trait|type|enum)\b/g,
      '<span class="tok-kw">$1</span>',
    );
    s = s.replace(/("[^"]*")/g, '<span class="tok-str">$1</span>');
    s = s.replace(/\b(\d+(?:_\d+)*(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === "ts" || lang === "js") {
    s = s.replace(/(\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
    s = s.replace(
      /\b(import|export|from|const|let|var|function|return|if|else|await|async|new|class|interface|type|extends|implements|public|private|for|of|in|throw|try|catch|finally)\b/g,
      '<span class="tok-kw">$1</span>',
    );
    s = s.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="tok-str">$1</span>');
    s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  } else if (lang === "bash") {
    s = s.replace(/(#[^\n]*)/g, '<span class="tok-com">$1</span>');
    s = s.replace(/^(\$\s)/gm, '<span class="tok-com">$1</span>');
  } else if (lang === "json") {
    s = s.replace(/("(?:[^"\\]|\\.)*")(?=\s*:)/g, '<span class="tok-fn">$1</span>');
    s = s.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="tok-str">$1</span>');
    s = s.replace(/\b(true|false|null)\b/g, '<span class="tok-kw">$1</span>');
    s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  }
  return s;
}

export function CodeBlock({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[active];

  const copy = () => {
    navigator.clipboard?.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <div className="code-block-head">
        <div className="code-tabs">
          {tabs.map((t, i) => (
            <button
              key={i}
              type="button"
              className={`code-tab ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`code-copy ${copied ? "copied" : ""}`}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code
          dangerouslySetInnerHTML={{ __html: highlight(current.code, current.lang) }}
        />
      </pre>
    </div>
  );
}

export function SimpleCode({ code, lang }: { code: string; lang: CodeTab["lang"] }) {
  return <CodeBlock tabs={[{ label: lang, lang, code }]} />;
}
