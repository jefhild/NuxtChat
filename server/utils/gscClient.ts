/**
 * Google Search Console API client
 *
 * Uses a service account (JWT) to authenticate server-side.
 * Env vars required:
 *   GSC_SERVICE_ACCOUNT_KEY  — full JSON key as a string (from Google Cloud Console)
 *   GSC_SITE_URL             — e.g. "sc-domain:imchatty.com"
 */

interface GscRow {
  keys: string[];   // [page, query] when dimensions: ["page", "query"]
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface GscPageSummary {
  page_url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  top_queries: { query: string; impressions: number; clicks: number; position: number }[];
}

async function getGscAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsigned = `${encode(header)}.${encode(claim)}`;

  // Sign with RSA-SHA256 using the private key from the service account JSON
  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(key.private_key, "base64url");

  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC token error: ${err}`);
  }

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

export async function fetchGscData(
  serviceAccountKey: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GscPageSummary[]> {
  const token = await getGscAccessToken(serviceAccountKey);
  const encodedSite = encodeURIComponent(siteUrl);

  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page", "query"],
        rowLimit: 5000,
        dataState: "all",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC query error: ${err}`);
  }

  const data = await res.json() as { rows?: GscRow[] };
  const rows: GscRow[] = data.rows || [];

  // Aggregate by page, collecting top queries per page
  const pageMap = new Map<string, GscPageSummary>();

  for (const row of rows) {
    const page = row.keys[0];
    const query = row.keys[1];
    if (!page) continue;  // skip malformed rows

    const existing = pageMap.get(page);
    if (!existing) {
      pageMap.set(page, {
        page_url: page,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        avg_position: row.position,
        top_queries: [{ query: query ?? "", impressions: row.impressions, clicks: row.clicks, position: row.position }],
      });
    } else {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.top_queries.push({ query: query ?? "", impressions: row.impressions, clicks: row.clicks, position: row.position });
      // Recalculate averages
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      existing.avg_position =
        existing.top_queries.reduce((s, q) => s + q.position, 0) / existing.top_queries.length;
    }
  }

  // Sort top_queries by impressions descending, keep top 10 per page
  for (const summary of pageMap.values()) {
    summary.top_queries.sort((a, b) => b.impressions - a.impressions);
    summary.top_queries = summary.top_queries.slice(0, 10);
  }

  return Array.from(pageMap.values());
}
