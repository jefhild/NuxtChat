/**
 * SEO Analyzer — builds an OpenAI prompt from snapshot data and returns a structured brief.
 */

import { getOpenAIClient } from "~/server/utils/openaiGateway";

interface SnapshotRow {
  page_url: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  avg_position: number | null;
  top_queries: { query: string; impressions: number; clicks: number; position: number }[] | null;
  source: string;
}

interface TrendedPage {
  page_url: string;
  current_impressions: number;
  current_clicks: number;
  current_ctr: number;
  current_position: number;
  prev_impressions: number;
  prev_clicks: number;
  impressions_delta: number;
  clicks_delta: number;
  top_queries: string[];
  sources: string[];
}

export interface SeoBrief {
  headline: string;
  pages_working: { url: string; reason: string; metric: string }[];
  pages_to_optimize: { url: string; issue: string; suggestion: string }[];
  pages_to_create: { suggested_slug: string; rationale: string; target_queries: string[] }[];
  action_plan: string;
}

function buildTrendedPages(
  currentRows: SnapshotRow[],
  priorRows: SnapshotRow[]
): TrendedPage[] {
  const priorMap = new Map<string, SnapshotRow>();
  for (const row of priorRows) {
    const key = `${row.source}:${row.page_url}`;
    const existing = priorMap.get(key);
    if (!existing || row.impressions > existing.impressions) {
      priorMap.set(key, row);
    }
  }

  // Group current rows by page (combining sources)
  const pageMap = new Map<string, TrendedPage>();
  for (const row of currentRows) {
    const existing = pageMap.get(row.page_url);
    const priorKey = `${row.source}:${row.page_url}`;
    const prior = priorMap.get(priorKey);

    if (!existing) {
      pageMap.set(row.page_url, {
        page_url: row.page_url,
        current_impressions: row.impressions,
        current_clicks: row.clicks,
        current_ctr: row.ctr ?? 0,
        current_position: row.avg_position ?? 0,
        prev_impressions: prior?.impressions ?? 0,
        prev_clicks: prior?.clicks ?? 0,
        impressions_delta: row.impressions - (prior?.impressions ?? 0),
        clicks_delta: row.clicks - (prior?.clicks ?? 0),
        top_queries: (row.top_queries ?? []).slice(0, 5).map((q) => q.query),
        sources: [row.source],
      });
    } else {
      existing.current_impressions += row.impressions;
      existing.current_clicks += row.clicks;
      existing.prev_impressions += prior?.impressions ?? 0;
      existing.prev_clicks += prior?.clicks ?? 0;
      existing.impressions_delta = existing.current_impressions - existing.prev_impressions;
      existing.clicks_delta = existing.current_clicks - existing.prev_clicks;
      existing.sources.push(row.source);
    }
  }

  return Array.from(pageMap.values()).sort(
    (a, b) => b.current_impressions - a.current_impressions
  );
}

export async function generateSeoBrief(
  currentRows: SnapshotRow[],
  priorRows: SnapshotRow[],
  existingSeoSlugs: string[],
  runtimeConfig: ReturnType<typeof useRuntimeConfig>
): Promise<SeoBrief> {
  const { client, model } = getOpenAIClient({ runtimeConfig });
  if (!client) throw new Error("OpenAI client not available");

  const trended = buildTrendedPages(currentRows, priorRows);
  const top50 = trended.slice(0, 50);

  // Collect all queries that appear but don't have a dedicated page
  const allQueries = new Set<string>();
  for (const row of currentRows) {
    for (const q of row.top_queries ?? []) {
      allQueries.add(q.query);
    }
  }

  const pageUrlsSet = new Set(trended.map((p) => p.page_url));
  const queriesWithoutPage = Array.from(allQueries).filter(
    (q) => !Array.from(pageUrlsSet).some((url) => url.toLowerCase().includes(q.toLowerCase().replace(/\s+/g, "-")))
  );

  const prompt = `You are an SEO strategist analyzing a chat platform called ImChatty (imchatty.com).

## EXISTING pages already published (DO NOT suggest creating any of these):
${existingSeoSlugs.map((s) => `- ${s}`).join("\n")}

## Top 50 pages by impressions (last 7 days vs prior 7 days):
${top50
  .map(
    (p) =>
      `- ${p.page_url}
    impressions: ${p.current_impressions} (${p.impressions_delta >= 0 ? "+" : ""}${p.impressions_delta} vs prior 7d)
    clicks: ${p.current_clicks} (${p.clicks_delta >= 0 ? "+" : ""}${p.clicks_delta})
    avg CTR: ${(p.current_ctr * 100).toFixed(2)}%
    avg position: ${p.current_position > 0 ? p.current_position.toFixed(1) : "n/a"}
    top queries: ${p.top_queries.join(", ") || "none"}`
  )
  .join("\n\n")}

## Queries users are searching that don't have a dedicated landing page yet:
${queriesWithoutPage.slice(0, 30).join(", ")}

## Your task:
Analyze the data and return a JSON object (no markdown, no explanation, just valid JSON) with this exact shape:
{
  "headline": "one-sentence summary of this week's SEO health",
  "pages_working": [
    { "url": "...", "reason": "...", "metric": "e.g. +120 impressions this week" }
  ],
  "pages_to_optimize": [
    { "url": "...", "issue": "e.g. high impressions but 0.8% CTR", "suggestion": "..." }
  ],
  "pages_to_create": [
    { "suggested_slug": "e.g. chat-with-strangers-free", "rationale": "...", "target_queries": ["...", "..."] }
  ],
  "action_plan": "A concise markdown action plan (3-5 bullet points) for this week"
}

Rules:
- pages_working: up to 5 pages showing positive momentum
- pages_to_optimize: up to 5 pages with high impressions but low CTR (< 2%) or declining clicks
- pages_to_create: up to 5 suggested NEW slugs — you MUST NOT suggest any path already in the existing pages list above, not even a close variant. Check carefully.
- Keep suggestions specific and actionable for a chat platform targeting lonely/bored/language-learning users
- Do not suggest pages that already exist in the slug list above`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as SeoBrief;
  } catch {
    return {
      headline: "Analysis parsing failed — raw output stored",
      pages_working: [],
      pages_to_optimize: [],
      pages_to_create: [],
      action_plan: raw,
    };
  }
}
