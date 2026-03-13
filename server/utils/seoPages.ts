import { createError } from "h3";

export const SEO_PAGE_TYPES = ["compare", "guide", "topic"] as const;
export const SEO_PAGE_IMAGE_BUCKET = "profile-avatars";
export const SEO_PAGE_IMAGE_FOLDER = "seo-pages/heroes";

export type SeoPageType = (typeof SEO_PAGE_TYPES)[number];

export type SeoPageRow = {
  id: string;
  page_type: SeoPageType;
  locale: string;
  slug: string;
  title: string;
  subtitle: string | null;
  meta_title: string | null;
  meta_description: string | null;
  hero_title: string | null;
  hero_body: string | null;
  hero_image_path: string | null;
  hero_image_url: string | null;
  photo_credits_url: string | null;
  photo_credits_html: string | null;
  body: string | null;
  highlights_json: unknown[];
  faq_entry_ids_json: unknown[];
  related_links_json: unknown[];
  cta_label: string | null;
  cta_href: string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const SEO_PAGE_SELECT = `
  id,
  page_type,
  locale,
  slug,
  title,
  subtitle,
  meta_title,
  meta_description,
  hero_title,
  hero_body,
  hero_image_path,
  hero_image_url,
  photo_credits_url,
  photo_credits_html,
  body,
  highlights_json,
  faq_entry_ids_json,
  related_links_json,
  cta_label,
  cta_href,
  is_published,
  created_at,
  updated_at
`;

const TYPE_ALIASES: Record<string, SeoPageType> = {
  compare: "compare",
  compares: "compare",
  guide: "guide",
  guides: "guide",
  topic: "topic",
  topics: "topic",
};

export const normalizeSeoPageType = (value: unknown): SeoPageType => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const match = TYPE_ALIASES[normalized];
  if (!match) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid SEO page type",
    });
  }
  return match;
};

export const slugifySeoPage = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeLocaleCode = (value: unknown, fallback = "en") => {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .split("-")[0];
  return normalized || fallback;
};

const sanitizeString = (value: unknown) => {
  const clean = String(value ?? "").trim();
  return clean || null;
};

const sanitizeStringList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const sanitizeFaqEntryIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const sanitizeRelatedLinks = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: String(item?.label || "").trim(),
      href: String(item?.href || "").trim(),
    }))
    .filter((item) => item.label && item.href);
};

export const sanitizeSeoPagePayload = (input: Record<string, unknown>) => {
  const pageType = normalizeSeoPageType(input.page_type || input.pageType);
  const locale = normalizeLocaleCode(input.locale || "en");
  const title = String(input.title || "").trim();
  const slug = slugifySeoPage(input.slug || title);

  if (!title) {
    throw createError({
      statusCode: 400,
      statusMessage: "Title is required",
    });
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }

  return {
    id: sanitizeString(input.id),
    page_type: pageType,
    locale,
    slug,
    title,
    subtitle: sanitizeString(input.subtitle),
    meta_title: sanitizeString(input.meta_title ?? input.metaTitle),
    meta_description: sanitizeString(
      input.meta_description ?? input.metaDescription
    ),
    hero_title: sanitizeString(input.hero_title ?? input.heroTitle),
    hero_body: sanitizeString(input.hero_body ?? input.heroBody),
    hero_image_path: sanitizeString(input.hero_image_path ?? input.heroImagePath),
    hero_image_url: sanitizeString(input.hero_image_url ?? input.heroImageUrl),
    photo_credits_url: sanitizeString(
      input.photo_credits_url ?? input.photoCreditsUrl
    ),
    photo_credits_html: sanitizeString(
      input.photo_credits_html ?? input.photoCreditsHtml
    ),
    body: sanitizeString(input.body),
    highlights_json: sanitizeStringList(
      input.highlights_json ?? input.highlights ?? []
    ),
    faq_entry_ids_json: sanitizeFaqEntryIds(
      input.faq_entry_ids_json ?? input.faqEntryIds ?? []
    ),
    related_links_json: sanitizeRelatedLinks(
      input.related_links_json ?? input.relatedLinks ?? []
    ),
    cta_label: sanitizeString(input.cta_label ?? input.ctaLabel) || "Start chatting",
    cta_href: sanitizeString(input.cta_href ?? input.ctaHref) || "/chat",
    is_published: Boolean(input.is_published ?? input.isPublished),
    updated_at: new Date().toISOString(),
  };
};

export const normalizeSeoPageRecord = (row: SeoPageRow) => ({
  id: row.id,
  pageType: row.page_type,
  locale: normalizeLocaleCode(row.locale),
  slug: row.slug,
  title: row.title,
  subtitle: row.subtitle || "",
  metaTitle: row.meta_title || "",
  metaDescription: row.meta_description || "",
  heroTitle: row.hero_title || row.title || "",
  heroBody: row.hero_body || row.subtitle || "",
  heroImagePath: row.hero_image_path || "",
  heroImageUrl: row.hero_image_url || "",
  photoCreditsUrl: row.photo_credits_url || "",
  photoCreditsHtml: row.photo_credits_html || "",
  body: row.body || "",
  highlights: Array.isArray(row.highlights_json) ? row.highlights_json : [],
  faqEntryIds: Array.isArray(row.faq_entry_ids_json)
    ? row.faq_entry_ids_json
    : [],
  faqs: [],
  relatedLinks: Array.isArray(row.related_links_json) ? row.related_links_json : [],
  ctaLabel: row.cta_label || "Start chatting",
  ctaHref: row.cta_href || "/chat",
  isPublished: Boolean(row.is_published),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
  path:
    row.page_type === "compare"
      ? `/compare/${row.slug}`
      : row.page_type === "guide"
      ? `/guides/${row.slug}`
      : `/topics/${row.slug}`,
});

export const buildSeoHeroImageUrl = (
  storageBase: string | null | undefined,
  imagePath: string | null | undefined
) => {
  const base = String(storageBase || "").replace(/\/+$/, "");
  const cleanPath = String(imagePath || "").replace(/^\/+/, "");
  if (!base || !cleanPath) return "";
  return `${base}/${SEO_PAGE_IMAGE_BUCKET}/${cleanPath}`;
};

export const pickBestLocaleRows = (
  rows: SeoPageRow[] = [],
  targetLocale = "en"
) => {
  const preferredLocale = normalizeLocaleCode(targetLocale);
  const bySlug = new Map<string, SeoPageRow>();

  rows.forEach((row) => {
    const key = String(row.slug || "").trim().toLowerCase();
    if (!key) return;
    const current = bySlug.get(key);
    const rowLocale = normalizeLocaleCode(row.locale);
    if (!current) {
      bySlug.set(key, row);
      return;
    }
    const currentLocale = normalizeLocaleCode(current.locale);
    if (currentLocale !== preferredLocale && rowLocale === preferredLocale) {
      bySlug.set(key, row);
    }
  });

  return Array.from(bySlug.values());
};
