import type OpenAI from "openai";
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { getServiceRoleClient } from "~/server/utils/aiBots";

const sanitizeJsonResponse = (input = "") => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const translateEntry = async (
  openai: OpenAI,
  source: { question: string; answer: string },
  sourceLocale: string,
  targetLocale: string,
  model: string
) => {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You translate FAQ content. Return JSON only with keys: question, answer.",
      },
      {
        role: "user",
        content: `Translate from ${sourceLocale} to ${targetLocale}.\nQuestion: ${source.question}\nAnswer: ${source.answer}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = sanitizeJsonResponse(content);
  if (!parsed?.question || !parsed?.answer) {
    throw new Error("Failed to parse FAQ translation.");
  }

  return {
    question: String(parsed.question).trim(),
    answer: String(parsed.answer).trim(),
  };
};

const translateTitle = async (
  openai: OpenAI,
  source: { title: string },
  sourceLocale: string,
  targetLocale: string,
  model: string
) => {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "Translate a short title. Return JSON only: {\"title\": \"\"}.",
      },
      {
        role: "user",
        content: `Translate from ${sourceLocale} to ${targetLocale}.\nTitle: ${source.title}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = sanitizeJsonResponse(content);
  if (!parsed?.title) {
    throw new Error("Failed to parse title translation.");
  }

  return {
    title: String(parsed.title).trim(),
  };
};

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { client: openai, apiKey, model } = getOpenAIClient({
      runtimeConfig: config,
      model: config.OPENAI_MODEL || "gpt-4.1-mini",
    });
    if (!apiKey || !openai) {
      setResponseStatus(event, 400);
      return { success: false, error: "OPENAI_API_KEY is not configured" };
    }

    const body = (await readBody(event)) || {};
    const type = body.type;
    const id = body.id;
    const sourceLocale = body.sourceLocale || "en-US";
    const targetLocales = Array.isArray(body.targetLocales)
      ? body.targetLocales.filter(Boolean)
      : [];

    if (!type || !id || !targetLocales.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing translation parameters" };
    }

    const supabase = await getServiceRoleClient(event);

    if (type === "entry") {
      const { data: sourceRow, error: sourceError } = await supabase
        .from("faq_translations")
        .select("question, answer")
        .eq("entry_id", id)
        .eq("locale", sourceLocale)
        .maybeSingle();

      if (sourceError || !sourceRow) {
        throw new Error("Source FAQ translation not found.");
      }

      const { data: existingTranslations, error: existingError } =
        await supabase
          .from("faq_translations")
          .select("locale")
          .eq("entry_id", id)
          .in("locale", targetLocales);

      if (existingError) throw existingError;

      const existingLocales = new Set(
        (existingTranslations || []).map((row) => row.locale)
      );

      const translated = [];

      for (const locale of targetLocales) {
        if (existingLocales.has(locale)) continue;
        const translation = await translateEntry(
          openai,
          sourceRow,
          sourceLocale,
          locale,
          model
        );

        const { error } = await supabase
          .from("faq_translations")
          .upsert(
            {
              entry_id: id,
              locale,
              question: translation.question,
              answer: translation.answer,
            },
            { onConflict: "entry_id,locale" }
          );
        if (error) throw error;

        translated.push(locale);
      }

      return { success: true, translated };
    }

    if (type === "topic" || type === "group") {
      const table =
        type === "topic" ? "faq_topic_translations" : "faq_group_translations";
      const idColumn = type === "topic" ? "topic_id" : "group_id";

      const { data: sourceRow, error: sourceError } = await supabase
        .from(table)
        .select("title")
        .eq(idColumn, id)
        .eq("locale", sourceLocale)
        .maybeSingle();

      if (sourceError || !sourceRow) {
        throw new Error("Source title translation not found.");
      }

      const { data: existingTranslations, error: existingError } =
        await supabase
          .from(table)
          .select("locale")
          .eq(idColumn, id)
          .in("locale", targetLocales);

      if (existingError) throw existingError;

      const existingLocales = new Set(
        (existingTranslations || []).map((row) => row.locale)
      );

      const translated = [];

      for (const locale of targetLocales) {
        if (existingLocales.has(locale)) continue;
        const translation = await translateTitle(
          openai,
          sourceRow,
          sourceLocale,
          locale,
          model
        );

        const { error } = await supabase
          .from(table)
          .upsert(
            {
              [idColumn]: id,
              locale,
              title: translation.title,
            },
            { onConflict: `${idColumn},locale` }
          );
        if (error) throw error;

        translated.push(locale);
      }

      return { success: true, translated };
    }

    setResponseStatus(event, 400);
    return { success: false, error: "Unsupported translation type" };
  } catch (error) {
    const err = error as any;
    console.error("[admin/faq/translate] error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to translate FAQ content",
    };
  }
});
