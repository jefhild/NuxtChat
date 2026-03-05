import { defineEventHandler, deleteCookie, parseCookies } from "h3";

type CookiePart = {
  name: string;
  value: string;
  index: number | null;
};

const SUPABASE_AUTH_COOKIE_RE = /^sb-[a-z0-9-]+-auth-token(?:\.(\d+))?$/i;

function toBase64(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  return padding ? `${normalized}${"=".repeat(4 - padding)}` : normalized;
}

function looksLikeValidSupabaseToken(rawValue: string): boolean {
  if (!rawValue) return false;

  let decoded = rawValue;
  try {
    decoded = decodeURIComponent(rawValue);
  } catch {
    return false;
  }

  let payload = decoded;
  if (payload.startsWith("base64-")) {
    try {
      payload = Buffer.from(toBase64(payload.slice(7)), "base64").toString("utf8");
    } catch {
      return false;
    }
  }

  if (payload.startsWith("{")) {
    try {
      const parsed = JSON.parse(payload);
      return Boolean(parsed?.access_token || parsed?.refresh_token);
    } catch {
      return false;
    }
  }

  if (payload.startsWith("[")) {
    try {
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) && parsed.length >= 2;
    } catch {
      return false;
    }
  }

  // Conservative fallback: if format is unfamiliar, keep it.
  return true;
}

function isContiguousChunkSet(parts: CookiePart[]): boolean {
  const chunked = parts.filter((part) => part.index !== null);
  if (!chunked.length) return true;

  const indices = chunked
    .map((part) => part.index as number)
    .sort((a, b) => a - b);

  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i) return false;
  }

  return true;
}

export default defineEventHandler((event) => {
  const cookies = parseCookies(event);
  const groups = new Map<string, CookiePart[]>();

  for (const [name, value] of Object.entries(cookies)) {
    const match = name.match(SUPABASE_AUTH_COOKIE_RE);
    if (!match) continue;

    const index = match[1] !== undefined ? Number.parseInt(match[1], 10) : null;
    const base = index === null ? name : name.replace(/\.\d+$/, "");

    const existing = groups.get(base) || [];
    existing.push({ name, value: String(value || ""), index });
    groups.set(base, existing);
  }

  if (!groups.size) return;

  const cookieNamesToDrop = new Set<string>();

  for (const [base, parts] of groups.entries()) {
    const hasBaseCookie = parts.some((part) => part.index === null);
    const hasChunks = parts.some((part) => part.index !== null);

    // Mixed formats for the same key usually mean stale leftovers; reset cleanly.
    if (hasBaseCookie && hasChunks) {
      for (const part of parts) cookieNamesToDrop.add(part.name);
      continue;
    }

    if (!isContiguousChunkSet(parts)) {
      for (const part of parts) cookieNamesToDrop.add(part.name);
      continue;
    }

    let reconstructed = "";
    if (hasBaseCookie) {
      reconstructed = parts.find((part) => part.index === null)?.value || "";
    } else {
      reconstructed = parts
        .slice()
        .sort((a, b) => (a.index as number) - (b.index as number))
        .map((part) => part.value)
        .join("");
    }

    if (!looksLikeValidSupabaseToken(reconstructed)) {
      for (const part of parts) cookieNamesToDrop.add(part.name);
      // Also drop unsuffixed base key in case it exists but was not parsed.
      cookieNamesToDrop.add(base);
    }
  }

  if (!cookieNamesToDrop.size) return;

  // Remove bad auth cookies from this request so downstream SSR can continue as logged-out.
  const filteredPairs = Object.entries(cookies).filter(
    ([name]) => !cookieNamesToDrop.has(name)
  );
  event.node.req.headers.cookie = filteredPairs
    .map(([name, value]) => `${name}=${encodeURIComponent(String(value || ""))}`)
    .join("; ");

  // Expire from browser so subsequent requests are clean.
  for (const name of cookieNamesToDrop) {
    deleteCookie(event, name, {
      path: "/",
      sameSite: "lax",
    });
  }
});
