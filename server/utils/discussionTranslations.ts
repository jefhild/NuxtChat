import { normalizeLocale, translateText } from "@/server/utils/translate";

export const SUPPORTED_DISCUSSION_LOCALES = ["en", "fr", "ru", "zh"] as const;
type DiscussionLocale = (typeof SUPPORTED_DISCUSSION_LOCALES)[number];

const DEFAULT_LOCALE: DiscussionLocale = "en";

export const normalizeDiscussionLocale = (
  value: string | null | undefined
): DiscussionLocale => {
  const normalized = normalizeLocale(value || null);
  if (
    normalized &&
    SUPPORTED_DISCUSSION_LOCALES.includes(normalized as DiscussionLocale)
  ) {
    return normalized as DiscussionLocale;
  }
  return DEFAULT_LOCALE;
};

type EnsureTranslationArgs = {
  supa: any;
  message: any;
  targetLocale: string;
  config: any;
  sourceLocaleHint?: string | null;
};

export const ensureDiscussionMessageTranslation = async ({
  supa,
  message,
  targetLocale,
  config,
  sourceLocaleHint = null,
}: EnsureTranslationArgs) => {
  const messageId = String(message?.id || "");
  const content = String(message?.content || "").trim();
  const locale = normalizeDiscussionLocale(targetLocale);
  if (!messageId || !content) return null;

  const { data: existing, error: existingErr } = await supa
    .from("discussion_message_translations")
    .select("message_id, locale, content, source_locale, provider")
    .eq("message_id", messageId)
    .eq("locale", locale)
    .maybeSingle();

  if (!existingErr && existing?.content) {
    return existing;
  }

  const fallbackHint =
    sourceLocaleHint ||
    message?.meta?.source_locale ||
    message?.meta?.original_language ||
    null;

  const translated = await translateText({
    text: content,
    targetLocale: locale,
    sourceLocaleHint: fallbackHint,
    config,
  });

  if (!translated?.ok || !translated?.translatedText) {
    return null;
  }

  const payload = {
    message_id: messageId,
    locale,
    content: translated.translatedText,
    source_locale: translated.sourceLocale || normalizeDiscussionLocale(fallbackHint),
    provider: translated.engine || null,
    translated_at: new Date().toISOString(),
  };

  const { data, error } = await supa
    .from("discussion_message_translations")
    .upsert(payload, { onConflict: "message_id,locale" })
    .select("message_id, locale, content, source_locale, provider")
    .maybeSingle();

  if (error) {
    console.warn(
      "[discussion.translate] upsert failed:",
      error?.message || error
    );
    return {
      message_id: messageId,
      locale,
      content: translated.translatedText,
      source_locale: translated.sourceLocale || null,
      provider: translated.engine || null,
    };
  }

  return data || {
    message_id: messageId,
    locale,
    content: translated.translatedText,
    source_locale: translated.sourceLocale || null,
    provider: translated.engine || null,
  };
};
