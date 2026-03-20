const NUMERIC_HANDLE_RE = /^\d+$/;

const TAXONOMY_MINIMUM_COUNTS = {
  category: 3,
  tag: 5,
  person: 5,
} as const;

type TaxonomyIndexType = keyof typeof TAXONOMY_MINIMUM_COUNTS;

export function shouldIndexTaxonomyPage(
  articleCount: number,
  taxonomyType: TaxonomyIndexType = "category",
  minimumCount?: number
) {
  const threshold =
    typeof minimumCount === "number"
      ? minimumCount
      : TAXONOMY_MINIMUM_COUNTS[taxonomyType];
  return Number(articleCount || 0) >= threshold;
}

type IndexableArticle = {
  title?: string;
  summary?: string;
  content?: string;
  category?: { name?: string; slug?: string } | null;
  tags?: Array<{ name?: string; slug?: string }> | null;
  people?: Array<{ name?: string; slug?: string }> | null;
  newsmesh_meta?: {
    summary?: string;
    description?: string;
  } | null;
  rewrite_meta?: {
    headline?: string;
    summary?: string;
    body?: string;
  } | null;
  article_translations?: Array<{
    headline?: string;
    summary?: string;
    body?: string;
  }> | null;
};

const stripHtml = (value?: string | null) =>
  String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function shouldIndexArticle(
  article: IndexableArticle | null | undefined,
  options?: {
    minContentLength?: number;
    minSummaryLength?: number;
    minTaxonomySignals?: number;
  }
) {
  if (!article) return false;

  // Keep evergreen/manual content indexable by default and only gate thin news-driven pages.
  if (!article.newsmesh_meta) return true;

  const minContentLength = Number(options?.minContentLength || 900);
  const minSummaryLength = Number(options?.minSummaryLength || 140);
  const minTaxonomySignals = Number(options?.minTaxonomySignals || 2);

  const categorySignals = article.category?.name || article.category?.slug ? 1 : 0;
  const tagSignals = Array.isArray(article.tags) ? article.tags.length : 0;
  const peopleSignals = Array.isArray(article.people) ? article.people.length : 0;
  const taxonomySignals = categorySignals + tagSignals + peopleSignals;

  if (stripHtml(article.content).length >= minContentLength) return true;
  if (taxonomySignals >= minTaxonomySignals) return true;

  const rewriteText = [
    article.rewrite_meta?.headline,
    article.rewrite_meta?.summary,
    article.rewrite_meta?.body,
  ]
    .map((value) => stripHtml(value))
    .join(" ")
    .trim();
  if (rewriteText.length >= minContentLength) return true;

  const hasSubstantiveTranslation = Array.isArray(article.article_translations)
    ? article.article_translations.some((entry) => {
        const translatedText = [
          entry?.headline,
          entry?.summary,
          entry?.body,
        ]
          .map((value) => stripHtml(value))
          .join(" ")
          .trim();
        return translatedText.length >= minSummaryLength;
      })
    : false;
  if (hasSubstantiveTranslation) return true;

  const summaryText = stripHtml(
    article.rewrite_meta?.summary ||
      article.summary ||
      article.newsmesh_meta?.summary ||
      article.newsmesh_meta?.description
  );

  return summaryText.length >= minSummaryLength && taxonomySignals >= 1;
}

type IndexableProfile = {
  is_private?: boolean;
  displayname?: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  slug?: string;
};

export function shouldIndexProfile(
  profile: IndexableProfile | null | undefined,
  options?: { minBioLength?: number }
) {
  if (!profile || profile.is_private) return false;

  const minBioLength = Number(options?.minBioLength || 80);
  const displayname = String(profile.displayname || "").trim();
  const bio = String(profile.bio || "").trim();
  const tagline = String(profile.tagline || "").trim();
  const avatarUrl = String(profile.avatar_url || "").trim();
  const slug = String(profile.slug || "").trim().toLowerCase();

  if (!displayname) return false;
  if (!avatarUrl) return false;
  if (NUMERIC_HANDLE_RE.test(displayname) || NUMERIC_HANDLE_RE.test(slug)) return false;
  if (bio.length < minBioLength && tagline.length < 24) return false;

  return true;
}
