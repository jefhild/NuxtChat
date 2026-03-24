import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { sanitizeJsonResponse } from "~/server/utils/articleTranslation";
import {
  normalizeAboutLocale,
  sanitizeAboutSectionPayload,
} from "~/server/utils/aboutContent";

const cleanText = (value: unknown) => String(value || "").trim();

export const translateAboutSections = async ({
  runtimeConfig,
  supabase,
  sourceLocale,
  targetLocales,
  sections,
  overwrite = false,
}: {
  runtimeConfig: any;
  supabase: any;
  sourceLocale: string;
  targetLocales: string[];
  sections: Array<{ key: string; title: string; body: string }>;
  overwrite?: boolean;
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

  const normalizedSource = normalizeAboutLocale(sourceLocale);
  const normalizedTargets = Array.from(
    new Set((Array.isArray(targetLocales) ? targetLocales : []).map(normalizeAboutLocale))
  ).filter((locale) => locale && locale !== normalizedSource);

  const sourceSections = sections
    .map(sanitizeAboutSectionPayload)
    .filter(Boolean)
    .filter((section) => section.title || section.body);

  if (!normalizedTargets.length || !sourceSections.length) {
    const error = new Error("Missing translation parameters.");
    (error as any).statusCode = 400;
    throw error;
  }

  const translated: string[] = [];
  const skipped: string[] = [];

  for (const targetLocale of normalizedTargets) {
    let existingKeys = new Set<string>();
    if (!overwrite) {
      const { data: existing, error: existingError } = await supabase
        .from("about_page_translations")
        .select("section_key")
        .eq("locale", targetLocale)
        .in(
          "section_key",
          sourceSections.map((section) => section.key)
        );

      if (existingError) throw existingError;
      existingKeys = new Set((existing || []).map((row: any) => String(row.section_key || "")));
    }

    const sectionsToTranslate = overwrite
      ? sourceSections
      : sourceSections.filter((section) => !existingKeys.has(section.key));

    if (!sectionsToTranslate.length) {
      skipped.push(targetLocale);
      continue;
    }

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You translate About page section content. Return JSON only with a top-level key `sections`, an array of objects containing keys: key, title, body. Preserve markdown formatting in body, especially links.",
        },
        {
          role: "user",
          content: [
            `Translate these About page sections from ${normalizedSource} to ${targetLocale}.`,
            "Preserve markdown in body fields.",
            "Do not change section keys.",
            "",
            JSON.stringify({ sections: sectionsToTranslate }),
          ].join("\n"),
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content || "";
    const parsed = sanitizeJsonResponse(content);
    const translatedSections = Array.isArray((parsed as any)?.sections)
      ? (parsed as any).sections
      : [];

    if (!translatedSections.length) {
      throw new Error("Failed to parse About page translation.");
    }

    const byKey = new Map(
      translatedSections.map((section: any) => [
        String(section?.key || "").trim(),
        section,
      ])
    );

    const rows = sectionsToTranslate.map((section) => {
      const translatedSection = byKey.get(section.key) || {};
      return {
        section_key: section.key,
        locale: targetLocale,
        title: cleanText(translatedSection.title) || section.title,
        body: cleanText(translatedSection.body) || section.body,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("about_page_translations")
      .upsert(rows, {
        onConflict: "section_key,locale",
      });

    if (upsertError) throw upsertError;
    translated.push(targetLocale);
  }

  return { translated, skipped };
};

