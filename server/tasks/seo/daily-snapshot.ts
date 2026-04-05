/**
 * seo:daily-snapshot — runs once a day at 6:00 AM UTC
 *
 * Fetches page-level data from Google Search Console and Bing Webmaster Tools,
 * stores daily snapshots in seo_snapshots, then generates and stores an AI brief
 * in seo_briefs. Can also be triggered manually via POST /api/admin/seo-fetch.
 */

import { getServiceRoleClient } from "~/server/utils/aiBots";
import { fetchGscData } from "~/server/utils/gscClient";
import { fetchBingData } from "~/server/utils/bingWebmasterClient";
import { generateSeoBrief } from "~/server/utils/seoAnalyzer";

export interface SeoSnapshotTaskResult {
  snapshotDate: string;
  gscPages: number;
  bingPages: number;
  briefGenerated: boolean;
  errors: string[];
}

export async function runSeoSnapshot(event?: unknown): Promise<SeoSnapshotTaskResult> {
  const runtimeConfig = useRuntimeConfig(event as Parameters<typeof useRuntimeConfig>[0]);
  const supabase = await getServiceRoleClient(event);
  const errors: string[] = [];

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let gscPages = 0;
  let bingPages = 0;

  // --- Fetch GSC data ---
  const gscKey = (runtimeConfig as Record<string, unknown>).GSC_SERVICE_ACCOUNT_KEY as string | undefined;
  const gscSite = (runtimeConfig as Record<string, unknown>).GSC_SITE_URL as string | undefined;

  if (gscKey && gscSite) {
    try {
      const gscRows = await fetchGscData(gscKey, gscSite, sevenDaysAgo, yesterday);
      gscPages = gscRows.length;

      if (gscRows.length > 0) {
        // Deduplicate by page_url before upsert
        const seen = new Map<string, typeof gscRows[0]>();
        for (const r of gscRows) {
          if (!seen.has(r.page_url)) seen.set(r.page_url, r);
        }

        const upsertRows = Array.from(seen.values()).map((r) => ({
          snapshot_date: today,
          source: "gsc",
          page_url: r.page_url,
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: r.ctr,
          avg_position: r.avg_position,
          top_queries: r.top_queries,
        }));

        const { error } = await supabase
          .from("seo_snapshots")
          .upsert(upsertRows, { onConflict: "snapshot_date,source,page_url" });

        if (error) errors.push(`GSC upsert error: ${error.message}`);
      }
    } catch (err) {
      errors.push(`GSC fetch error: ${(err as Error).message}`);
    }
  } else {
    errors.push("GSC credentials not configured (GSC_SERVICE_ACCOUNT_KEY / GSC_SITE_URL)");
  }

  // --- Fetch Bing data ---
  const bingKey = (runtimeConfig as Record<string, unknown>).BING_WEBMASTER_API_KEY as string | undefined;
  const bingSite = (runtimeConfig as Record<string, unknown>).BING_SITE_URL as string | undefined;

  if (bingKey && bingSite) {
    try {
      const bingRows = await fetchBingData(bingKey, bingSite, sevenDaysAgo, yesterday);
      bingPages = bingRows.length;

      if (bingRows.length > 0) {
        // Deduplicate by page_url — Bing can return the same query/URL more than once
        const seen = new Map<string, typeof bingRows[0]>();
        for (const r of bingRows) {
          if (!seen.has(r.page_url)) seen.set(r.page_url, r);
        }

        const upsertRows = Array.from(seen.values()).map((r) => ({
          snapshot_date: today,
          source: "bing",
          page_url: r.page_url,
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: r.ctr,
          avg_position: r.avg_position > 0 ? r.avg_position : null,
          top_queries: r.top_queries,
        }));

        const { error } = await supabase
          .from("seo_snapshots")
          .upsert(upsertRows, { onConflict: "snapshot_date,source,page_url" });

        if (error) errors.push(`Bing upsert error: ${error.message}`);
      }
    } catch (err) {
      errors.push(`Bing fetch error: ${(err as Error).message}`);
    }
  } else {
    errors.push("Bing credentials not configured (BING_WEBMASTER_API_KEY / BING_SITE_URL)");
  }

  // --- Generate AI brief ---
  let briefGenerated = false;

  try {
    // Load current 7-day snapshots
    const { data: currentRows } = await supabase
      .from("seo_snapshots")
      .select("page_url, source, impressions, clicks, ctr, avg_position, top_queries")
      .eq("snapshot_date", today);

    // Load prior 7-day snapshots (snapshot from 7 days ago)
    const priorDate = sevenDaysAgo;
    const { data: priorRows } = await supabase
      .from("seo_snapshots")
      .select("page_url, source, impressions, clicks, ctr, avg_position, top_queries")
      .eq("snapshot_date", priorDate);

    // Load all existing SEO pages (published + drafts) with type so we can build full paths
    const { data: seoPages } = await supabase
      .from("seo_pages")
      .select("slug, page_type")
      .order("slug");

    // Deduplicate slugs (same slug exists per locale) and build full paths
    const seenSlugs = new Set<string>();
    const existingPaths: string[] = [];
    for (const p of (seoPages ?? []) as { slug: string; page_type: string }[]) {
      const key = `${p.page_type}:${p.slug}`;
      if (seenSlugs.has(key)) continue;
      seenSlugs.add(key);
      const type = (p.page_type || "landing").toLowerCase();
      if (type === "landing") existingPaths.push(`/${p.slug}`);
      else if (type === "guide") existingPaths.push(`/guides/${p.slug}`);
      else if (type === "topic") existingPaths.push(`/topics/${p.slug}`);
      else existingPaths.push(`/compare/${p.slug}`);
    }

    if (currentRows && currentRows.length > 0) {
      const brief = await generateSeoBrief(
        currentRows,
        priorRows ?? [],
        existingPaths,
        runtimeConfig
      );

      const { error } = await supabase.from("seo_briefs").upsert(
        {
          brief_date: today,
          headline: brief.headline,
          pages_working: brief.pages_working,
          pages_to_optimize: brief.pages_to_optimize,
          pages_to_create: brief.pages_to_create,
          action_plan: brief.action_plan,
          data_window_days: 7,
          sources_used: [
            ...(gscPages > 0 ? ["gsc"] : []),
            ...(bingPages > 0 ? ["bing"] : []),
          ],
        },
        { onConflict: "brief_date" }
      );

      if (error) {
        errors.push(`Brief upsert error: ${error.message}`);
      } else {
        briefGenerated = true;
      }
    } else {
      errors.push("No snapshot data available to generate brief");
    }
  } catch (err) {
    errors.push(`Brief generation error: ${(err as Error).message}`);
  }

  return { snapshotDate: today, gscPages, bingPages, briefGenerated, errors };
}

// Nitro task export
export default {
  async run({ payload: _payload, context }: { payload: unknown; context: Record<string, unknown> }) {
    const event = context?.event;
    const result = await runSeoSnapshot(event);
    console.log("[seo:daily-snapshot]", JSON.stringify(result));
    return result;
  },
};
