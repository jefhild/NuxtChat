import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";

export const WEEKLY_DIGEST_DEFAULT_LOCALE = "en";
export const WEEKLY_DIGEST_LOCALES = ["en", "fr", "ru", "zh"] as const;

type WeeklyDigestLocale = (typeof WEEKLY_DIGEST_LOCALES)[number];

type WeeklyDigestContentRow = {
  locale: string;
  enabled: boolean | null;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  updated_at?: string | null;
};

type WeeklyDigestContentValue = {
  locale: string;
  enabled: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

const EMAIL_BLOCK_SANITIZE_OPTIONS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ["p", "br", "em", "strong", "a", "ul", "ol", "li", "blockquote"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true,
});

const normalizeMarkdown = (value = "") =>
  String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();

const toSafeDigestUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^mailto:/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
};

const applySafeMarkdownLinks = (body: string) => {
  const tokens = markdown.parse(normalizeMarkdown(body), {});

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "link_open") continue;

    const hrefIndex = token.attrIndex("href");
    const href = hrefIndex >= 0 ? token.attrs?.[hrefIndex]?.[1] : "";
    const safeHref = toSafeDigestUrl(href);

    if (!safeHref) {
      token.type = "span_open";
      token.tag = "span";
      token.attrs = [];

      let depth = 1;
      for (let closeIndex = index + 1; closeIndex < tokens.length; closeIndex += 1) {
        const closeToken = tokens[closeIndex];
        if (closeToken.type === "link_open") depth += 1;
        if (closeToken.type === "link_close") {
          depth -= 1;
          if (depth === 0) {
            closeToken.type = "span_close";
            closeToken.tag = "span";
            closeToken.attrs = [];
            break;
          }
        }
      }
      continue;
    }

    if (hrefIndex >= 0 && token.attrs) {
      token.attrs[hrefIndex][1] = safeHref;
    } else {
      token.attrPush(["href", safeHref]);
    }

    const targetIndex = token.attrIndex("target");
    if (targetIndex >= 0 && token.attrs) token.attrs[targetIndex][1] = "_blank";
    else token.attrPush(["target", "_blank"]);

    const relIndex = token.attrIndex("rel");
    if (relIndex >= 0 && token.attrs) {
      token.attrs[relIndex][1] = "noopener noreferrer";
    } else {
      token.attrPush(["rel", "noopener noreferrer"]);
    }
  }

  return markdown.renderer.render(tokens, markdown.options, {});
};

const styleEmailBlockHtml = (html = "") =>
  String(html)
    .replace(/<p>/g, '<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.65;">')
    .replace(
      /<ul>/g,
      '<ul style="margin:0 0 12px;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.65;">'
    )
    .replace(
      /<ol>/g,
      '<ol style="margin:0 0 12px;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.65;">'
    )
    .replace(/<li>/g, '<li style="margin:0 0 6px;">')
    .replace(
      /<blockquote>/g,
      '<blockquote style="margin:0 0 12px;padding:0 0 0 14px;border-left:3px solid #c7d2fe;color:#4b5563;">'
    )
    .replace(
      /<a /g,
      '<a style="color:#4f46e5;text-decoration:underline;font-weight:600;" '
    );

export const normalizeWeeklyDigestLocale = (value: unknown): WeeklyDigestLocale => {
  if (typeof value !== "string") return WEEKLY_DIGEST_DEFAULT_LOCALE;
  const locale = value.trim().split("-")[0]?.toLowerCase();
  if ((WEEKLY_DIGEST_LOCALES as readonly string[]).includes(locale)) {
    return locale as WeeklyDigestLocale;
  }
  return WEEKLY_DIGEST_DEFAULT_LOCALE;
};

export const isMissingWeeklyDigestTableError = (error: any) =>
  Boolean(
    error &&
      typeof error.message === "string" &&
      (error.message.includes("weekly_digest_content") ||
        (error.message.includes("relation") && error.message.includes("does not exist")))
  );

export const sanitizeWeeklyDigestContentPayload = (value: any): WeeklyDigestContentValue => ({
  locale: normalizeWeeklyDigestLocale(value?.locale),
  enabled: value?.enabled !== false,
  title: String(value?.title || "").trim(),
  body: String(value?.body || "").trim(),
  ctaLabel: String(value?.ctaLabel || "").trim(),
  ctaUrl: String(value?.ctaUrl || "").trim(),
});

export const hasWeeklyDigestContent = (value: {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) =>
  Boolean(
    String(value?.title || "").trim() ||
      String(value?.body || "").trim() ||
      String(value?.ctaLabel || "").trim() ||
      String(value?.ctaUrl || "").trim()
  );

export const validateWeeklyDigestCtaUrl = (value: unknown) => {
  if (!String(value || "").trim()) return "";
  const safeUrl = toSafeDigestUrl(value);
  if (!safeUrl) {
    const error = new Error("CTA URL must use https:// or mailto:.");
    (error as any).statusCode = 400;
    throw error;
  }
  return safeUrl;
};

export const fetchWeeklyDigestContent = async (supabase: any, locale: unknown) => {
  const normalizedLocale = normalizeWeeklyDigestLocale(locale);
  const localeList =
    normalizedLocale === WEEKLY_DIGEST_DEFAULT_LOCALE
      ? [normalizedLocale]
      : [normalizedLocale, WEEKLY_DIGEST_DEFAULT_LOCALE];

  const { data, error } = await supabase
    .from("weekly_digest_content")
    .select("locale, enabled, title, body, cta_label, cta_url, updated_at")
    .in("locale", localeList)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingWeeklyDigestTableError(error)) {
      return {
        storageReady: false,
        content: {
          locale: normalizedLocale,
          enabled: true,
          title: "",
          body: "",
          ctaLabel: "",
          ctaUrl: "",
          hasOverride: false,
        },
      };
    }
    throw error;
  }

  const rows = (data || []) as WeeklyDigestContentRow[];
  const exact = rows.find((row) => row.locale === normalizedLocale) || null;
  const fallback = rows.find((row) => row.locale === WEEKLY_DIGEST_DEFAULT_LOCALE) || null;
  const selected = exact || fallback;

  return {
    storageReady: true,
      content: {
        locale: exact?.locale || selected?.locale || normalizedLocale,
        enabled: exact?.enabled ?? selected?.enabled ?? true,
        title: String(selected?.title || "").trim(),
        body: String(selected?.body || "").trim(),
        ctaLabel: String(selected?.cta_label || "").trim(),
      ctaUrl: String(selected?.cta_url || "").trim(),
      hasOverride: hasWeeklyDigestContent({
        title: exact?.title,
        body: exact?.body,
        ctaLabel: exact?.cta_label,
        ctaUrl: exact?.cta_url,
      }),
    },
  };
};

export type WeeklyDigestRenderedBlock = {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
} | null;

export const buildWeeklyDigestRenderedBlock = (value: {
  enabled?: boolean;
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): WeeklyDigestRenderedBlock => {
  const enabled = value?.enabled !== false;
  const title = String(value?.title || "").trim();
  const body = normalizeMarkdown(value?.body || "");
  const ctaLabel = String(value?.ctaLabel || "").trim();
  const ctaUrl = toSafeDigestUrl(value?.ctaUrl) || "";

  if (!enabled || (!title && !body && !ctaLabel)) {
    return null;
  }

  const renderedBody = body
    ? styleEmailBlockHtml(
        DOMPurify.sanitize(applySafeMarkdownLinks(body), EMAIL_BLOCK_SANITIZE_OPTIONS)
      )
    : "";

  return {
    title,
    bodyHtml: renderedBody,
    ctaLabel,
    ctaUrl,
  };
};
