/**
 * Bing Webmaster Tools API client
 *
 * Uses GetQueryStats (site-wide query data) — GetPageStats requires a specific
 * page URL per request and can't enumerate all pages at once.
 *
 * Env vars required:
 *   BING_WEBMASTER_API_KEY — from Bing Webmaster Tools → Settings → API Access
 *   BING_SITE_URL          — e.g. "https://imchatty.com"
 */

interface BingPageStat {
  page_url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  top_queries: { query: string; impressions: number; clicks: number; position: number }[];
}

interface BingQueryStatsRow {
  Query: string;
  Impressions: number;
  Clicks: number;
  AvgClickPosition: number;
  AvgImpressionPosition: number;
}

async function bingGet(endpoint: string, apiKey: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ apikey: apiKey, ...params });
  const url = `https://ssl.bing.com/webmaster/api.svc/json/${endpoint}?${qs}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bing ${endpoint} HTTP ${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Bing ${endpoint} non-JSON response: ${text.slice(0, 300)}`);
  }
}

export async function fetchBingData(
  apiKey: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<BingPageStat[]> {
  // GetQueryStats returns all queries for the site in the date range
  const data = await bingGet("GetQueryStats", apiKey, { siteUrl, startDate, endDate });

  // Bing wraps results in { d: [...] } (WCF JSON format)
  const rows: BingQueryStatsRow[] = data?.d ?? data ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[Bing] GetQueryStats returned no rows. Raw:", JSON.stringify(data).slice(0, 500));
    return [];
  }

  const queries = rows
    .filter((q) => q.Query)
    .sort((a, b) => b.Impressions - a.Impressions);

  const totalImpressions = queries.reduce((s, q) => s + (q.Impressions ?? 0), 0);
  const totalClicks = queries.reduce((s, q) => s + (q.Clicks ?? 0), 0);
  const avgPosition = queries.length > 0
    ? queries.reduce((s, q) => s + (q.AvgImpressionPosition ?? 0), 0) / queries.length
    : 0;

  // Return one row per query so the analyzer can work with individual query gaps.
  // Also include a site-wide rollup row for trend tracking.
  const queryRows: BingPageStat[] = queries.slice(0, 100).map((q) => ({
    page_url: `${siteUrl.replace(/\/$/, "")}/?bing_query=${encodeURIComponent(q.Query)}`,
    impressions: q.Impressions ?? 0,
    clicks: q.Clicks ?? 0,
    ctr: (q.Impressions ?? 0) > 0 ? (q.Clicks ?? 0) / q.Impressions : 0,
    avg_position: q.AvgImpressionPosition ?? 0,
    top_queries: [{ query: q.Query, impressions: q.Impressions ?? 0, clicks: q.Clicks ?? 0, position: q.AvgImpressionPosition ?? 0 }],
  }));

  // Prepend a site-wide rollup row
  const rollup: BingPageStat = {
    page_url: siteUrl.replace(/\/$/, "") + "/",
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    avg_position: avgPosition,
    top_queries: queries.slice(0, 10).map((q) => ({
      query: q.Query,
      impressions: q.Impressions ?? 0,
      clicks: q.Clicks ?? 0,
      position: q.AvgImpressionPosition ?? 0,
    })),
  };

  return [rollup, ...queryRows];
}

/** Diagnostic — returns raw Bing API response for debugging */
export async function diagnoseBingConnection(apiKey: string, siteUrl: string) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  try {
    const data = await bingGet("GetQueryStats", apiKey, { siteUrl, startDate: sevenDaysAgo, endDate: yesterday });
    return { ok: true, endpoint: "GetQueryStats", raw: data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
