const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://raffl.fun",
];

const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  return false;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = process.env.HELIUS_RPC_URL;
  if (!upstream) {
    return new Response("HELIUS_RPC_URL not configured", { status: 500 });
  }

  const body = await request.text();
  const res = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
