import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { sanitizeJsonResponse } from "~/server/utils/articleTranslation";
import {
  hasWeeklyDigestContent,
  normalizeWeeklyDigestLocale,
  sanitizeWeeklyDigestContentPayload,
  validateWeeklyDigestCtaUrl,
} from "~/server/utils/weeklyDigestContent";

const cleanText = (value: unknown) => String(value || "").trim();

export const translateWeeklyDigestContent = async ({
  runtimeConfig,
  supabase,
  sourceLocale,
  targetLocales,
  content,
  overwrite = false,
}: {
  runtimeConfig: any;
  supabase: any;
  sourceLocale: string;
  targetLocales: string[];
  content: Record<string, unknown>;
  overwrite?: boolean;
}) => {
  const normalizedSource = normalizeWeeklyDigestLocale(sourceLocale);
  const sourceContent = sanitizeWeeklyDigestContentPayload({
    ...content,
    locale: normalizedSource,
  });

  if (!hasWeeklyDigestContent(sourceContent)) {
    const error = new Error("Add content before translating the weekly digest block.");
    (error as any).statusCode = 400;
    throw error;
  }

  const normalizedTargets = Array.from(
    new Set((Array.isArray(targetLocales) ? targetLocales : []).map(normalizeWeeklyDigestLocale))
  ).filter((locale) => locale && locale !== normalizedSource);

  if (!normalizedTargets.length) {
    const error = new Error("Choose at least one target locale.");
    (error as any).statusCode = 400;
    throw error;
  }

  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig,
    model: runtimeConfig.OPENAI_MODEL || "gpt-4.1-mini",
  });

  if (!apiKey || !openai) {
    const error = new Error("OPENAI_API_KEY is not configured");
    (error as any).statusCode = 400;
    throw error;
  }

  const translated: string[] = [];
  const skipped: string[] = [];

  for (const targetLocale of normalizedTargets) {
    if (!overwrite) {
      const { data: existing, error: existingError } = await supabase
        .from("weekly_digest_content")
        .select("enabled, title, body, cta_label, cta_url")
        .eq("locale", targetLocale)
        .maybeSingle();

      if (existingError) throw existingError;

      if (
        existing &&
        hasWeeklyDigestContent({
          title: existing.title,
          body: existing.body,
          ctaLabel: existing.cta_label,
          ctaUrl: existing.cta_url,
        })
      ) {
        skipped.push(targetLocale);
        continue;
      }
    }

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You translate weekly digest email copy. Return JSON only with keys `title`, `body`, and `ctaLabel`. Preserve markdown in `body`, especially links and list formatting. Do not invent URLs.",
        },
        {
          role: "user",
          content: [
            `Translate this weekly digest custom block from ${normalizedSource} to ${targetLocale}.`,
            "Preserve markdown in the body field.",
            "If the CTA label is blank, keep it blank.",
            "",
            JSON.stringify({
              title: sourceContent.title,
              body: sourceContent.body,
              ctaLabel: sourceContent.ctaLabel,
            }),
          ].join("\n"),
        },
      ],
    });

    const contentPayload = response.choices?.[0]?.message?.content || "";
    const parsed = sanitizeJsonResponse(contentPayload) as Record<string, unknown>;

    const { error: upsertError } = await supabase.from("weekly_digest_content").upsert(
      {
        locale: targetLocale,
        enabled: sourceContent.enabled,
        title: cleanText(parsed?.title) || sourceContent.title,
        body: cleanText(parsed?.body) || sourceContent.body,
        cta_label: cleanText(parsed?.ctaLabel) || sourceContent.ctaLabel,
        cta_url: validateWeeklyDigestCtaUrl(sourceContent.ctaUrl),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "locale" }
    );

    if (upsertError) throw upsertError;

    translated.push(targetLocale);
  }

  return { translated, skipped };
};
