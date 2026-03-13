import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { sanitizeJsonResponse } from "~/server/utils/articleTranslation";
import {
  normalizeLocaleCode,
  SEO_PAGE_SELECT,
  type SeoPageRow,
} from "~/server/utils/seoPages";

const createServiceRoleClient = async (runtimeConfig: any) => {
  const { useDb } = await import("@/composables/useDB");
  const { getServerClientFrom } = useDb();
  return getServerClientFrom(
    runtimeConfig.public.SUPABASE_URL,
    runtimeConfig.SUPABASE_SERVICE_ROLE_KEY
  );
};

const cleanText = (value: unknown) => String(value || "").trim();

export const translateSeoPage = async ({
  runtimeConfig,
  pageId,
  targetLocales,
  sourceLocale,
  overwrite = false,
  onProgress,
}: {
  runtimeConfig: any;
  pageId: string;
  targetLocales: string[];
  sourceLocale: string;
  overwrite?: boolean;
  onProgress?: (payload: {
    status: string;
    currentLocale?: string | null;
    completedLocales?: string[];
    skippedLocales?: string[];
    error?: string | null;
  }) => void;
}) => {
  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig,
    model: runtimeConfig.OPENAI_MODEL || "gpt-4.1-mini",
  });

  if (!apiKey || !openai) {
    const error = new Error("OPENAI_API_KEY is not configured");
    (error as any).statusCode = 400;
    throw error;
  }

  const normalizedSource = normalizeLocaleCode(sourceLocale || "en");
  const normalizedTargets = Array.from(
    new Set((Array.isArray(targetLocales) ? targetLocales : []).map(normalizeLocaleCode))
  ).filter((locale) => locale && locale !== normalizedSource);

  if (!pageId || !normalizedTargets.length) {
    const error = new Error("Missing translation parameters.");
    (error as any).statusCode = 400;
    throw error;
  }

  const supabase = await createServiceRoleClient(runtimeConfig);
  const { data: page, error: pageError } = await supabase
    .from("seo_pages")
    .select(SEO_PAGE_SELECT)
    .eq("id", pageId)
    .maybeSingle<SeoPageRow>();

  if (pageError) throw pageError;
  if (!page) {
    const error = new Error("SEO page not found.");
    (error as any).statusCode = 404;
    throw error;
  }

  const existingLocales = new Set<string>();
  if (!overwrite) {
    const { data: existing, error: existingError } = await supabase
      .from("seo_pages")
      .select("locale")
      .eq("page_type", page.page_type)
      .eq("slug", page.slug)
      .in("locale", normalizedTargets);

    if (existingError) throw existingError;
    (existing || []).forEach((row) => {
      const locale = normalizeLocaleCode(row?.locale);
      if (locale) existingLocales.add(locale);
    });
  }

  const translated: string[] = [];
  const skipped: string[] = [];
  onProgress?.({
    status: "running",
    completedLocales: translated,
    skippedLocales: skipped,
  });

  for (const targetLocale of normalizedTargets) {
    if (!overwrite && existingLocales.has(targetLocale)) {
      skipped.push(targetLocale);
      onProgress?.({
        status: "running",
        currentLocale: targetLocale,
        completedLocales: [...translated],
        skippedLocales: [...skipped],
      });
      continue;
    }

    onProgress?.({
      status: "running",
      currentLocale: targetLocale,
      completedLocales: [...translated],
      skippedLocales: [...skipped],
    });

    const userPrompt = [
      `Translate this SEO landing page from ${normalizedSource} to ${targetLocale}.`,
      "Return JSON only with keys:",
      "title, subtitle, metaTitle, metaDescription, heroTitle, heroBody, body, highlights, ctaLabel, relatedLinkLabels.",
      "Rules:",
      "- Preserve markdown formatting in body.",
      "- Keep brand names and product names intact.",
      "- Keep links, slashes, and href targets unchanged.",
      "- Keep the slug untranslated. Do not return a slug.",
      "- highlights must be an array of strings.",
      "- relatedLinkLabels must be an array matching the source related link order.",
      "",
      `Title: ${cleanText(page.title)}`,
      page.subtitle ? `Subtitle: ${cleanText(page.subtitle)}` : "",
      page.meta_title ? `Meta title: ${cleanText(page.meta_title)}` : "",
      page.meta_description ? `Meta description: ${cleanText(page.meta_description)}` : "",
      page.hero_title ? `Hero title: ${cleanText(page.hero_title)}` : "",
      page.hero_body ? `Hero body: ${cleanText(page.hero_body)}` : "",
      page.body ? `Body markdown:\n${String(page.body)}` : "",
      Array.isArray(page.highlights_json) && page.highlights_json.length
        ? `Highlights JSON: ${JSON.stringify(page.highlights_json)}`
        : "",
      page.cta_label ? `CTA label: ${cleanText(page.cta_label)}` : "",
      Array.isArray(page.related_links_json) && page.related_links_json.length
        ? `Related links JSON: ${JSON.stringify(page.related_links_json)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You translate SEO landing page content. Return JSON only. Preserve markdown structure and do not invent links or sections.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices?.[0]?.message?.content || "";
    const parsed = sanitizeJsonResponse(content);
    if (!parsed || (typeof parsed !== "object")) {
      throw new Error("Failed to parse SEO page translation.");
    }

    const sourceRelatedLinks = Array.isArray(page.related_links_json)
      ? page.related_links_json
      : [];
    const translatedLabels = Array.isArray((parsed as any).relatedLinkLabels)
      ? (parsed as any).relatedLinkLabels
      : [];
    const translatedRelatedLinks = sourceRelatedLinks
      .map((link: any, index: number) => ({
        label: cleanText(translatedLabels[index] || link?.label),
        href: cleanText(link?.href),
      }))
      .filter((link) => link.label && link.href);

    const translationPayload = {
      page_type: page.page_type,
      locale: targetLocale,
      slug: page.slug,
      title: cleanText((parsed as any).title) || page.title,
      subtitle: cleanText((parsed as any).subtitle) || page.subtitle || null,
      meta_title: cleanText((parsed as any).metaTitle) || page.meta_title || null,
      meta_description:
        cleanText((parsed as any).metaDescription) || page.meta_description || null,
      hero_title: cleanText((parsed as any).heroTitle) || page.hero_title || null,
      hero_body: cleanText((parsed as any).heroBody) || page.hero_body || null,
      hero_image_path: page.hero_image_path || null,
      hero_image_url: page.hero_image_url || null,
      photo_credits_url: page.photo_credits_url || null,
      photo_credits_html: page.photo_credits_html || null,
      body: String((parsed as any).body || page.body || "").trim() || null,
      highlights_json: Array.isArray((parsed as any).highlights)
        ? (parsed as any).highlights.map((item: unknown) => cleanText(item)).filter(Boolean)
        : Array.isArray(page.highlights_json)
        ? page.highlights_json
        : [],
      faq_entry_ids_json: Array.isArray(page.faq_entry_ids_json)
        ? page.faq_entry_ids_json
        : [],
      related_links_json: translatedRelatedLinks,
      cta_label: cleanText((parsed as any).ctaLabel) || page.cta_label || "Start chatting",
      cta_href: page.cta_href || "/chat",
      is_published: Boolean(page.is_published),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("seo_pages").upsert(
      translationPayload,
      { onConflict: "page_type,locale,slug" }
    );

    if (upsertError) throw upsertError;
    translated.push(targetLocale);
    onProgress?.({
      status: "running",
      currentLocale: targetLocale,
      completedLocales: [...translated],
      skippedLocales: [...skipped],
    });
  }

  return { translated, skipped };
};
