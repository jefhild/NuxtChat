import {
  getPublishedSeoPageRoutes,
  getFaqTopicSlugs,
} from "../lib/supabaseHelpers";
import { buildSeoPagePath } from "../utils/seoPagePaths";

/**
 * Returns an array of dynamic route strings.
 * Used for Nitro prerendering (must return string[]).
 */
const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
const defaultLocale = "en";
const INDEXABLE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function localizePath(path: string, locale: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function normalizeLocaleCode(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return normalized || "";
}

function normalizeIndexableSlug(value?: string | null) {
  const slug = String(value || "")
    .trim()
    .toLowerCase();
  if (!slug || !INDEXABLE_SLUG_RE.test(slug)) return null;
  return slug;
}

export async function getAllDynamicRoutes(): Promise<string[]> {
  try {
    const [seoPageData, faqTopics] = await Promise.all([
      getPublishedSeoPageRoutes(),
      getFaqTopicSlugs(),
    ]);

    if (!seoPageData) {
      console.error("One or more data fetches failed.");
      return [];
    }

    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
      "/compare",
      "/guides",
      "/topics",
    ];
    const homeRoutes = ["/"];

    const localizedStaticRoutes = [...homeRoutes, ...staticPages].flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => localizePath(route, locale))
    );

    const localizedSeoPageRoutes = (seoPageData || [])
      .map((page: any) => {
        const slug = normalizeIndexableSlug(page?.slug);
        const locale = normalizeLocaleCode(page?.locale);
        const pageType = String(page?.page_type || "").trim().toLowerCase();
        if (!slug || !locale || !SUPPORTED_LOCALES.includes(locale)) return null;
        const basePath = ["compare", "guide", "topic", "landing"].includes(pageType)
          ? buildSeoPagePath(pageType, slug)
          : null;
        return basePath ? localizePath(basePath, locale) : null;
      })
      .filter((route): route is string => Boolean(route));

    const localizedFaqTopicRoutes = (faqTopics || []).flatMap((topic) =>
      SUPPORTED_LOCALES.map((locale) =>
        localizePath(`/faq/topic/${topic.slug}`, locale)
      )
    );

    return [
      ...new Set([
        ...localizedStaticRoutes,
        ...localizedSeoPageRoutes,
        ...localizedFaqTopicRoutes,
      ]),
    ];
  } catch (error) {
    console.error("Error fetching dynamic routes:", error);
    return [];
  }
}

/**
 * Returns dynamic routes in sitemap-compatible format.
 * Used for sitemap endpoint (loc + lastmod).
 */
export async function getAllDynamicRoutesWithMetadata(): Promise<
  { loc: string; lastmod: string; images?: { loc: string }[] }[]
> {
  try {
    const [seoPageData, faqTopics] = await Promise.all([
      getPublishedSeoPageRoutes(),
      getFaqTopicSlugs(),
    ]);

    if (!seoPageData) {
      console.error("One or more data fetches failed.");
      return [];
    }

    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
      "/compare",
      "/guides",
      "/topics",
    ];
    const homeRoutes = ["/"];
    const fallbackLastmod = new Date().toISOString();

    const localizedRoutes: {
      loc: string;
      lastmod: string;
      images?: { loc: string }[];
    }[] = [];

    const addLocalizedRoutes = (
      route: string,
      lastmod?: string,
      images?: { loc: string }[]
    ) => {
      SUPPORTED_LOCALES.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(route, locale),
          lastmod: lastmod || fallbackLastmod,
          images,
        });
      });
    };

    homeRoutes.forEach((route) => addLocalizedRoutes(route));
    staticPages.forEach((route) => addLocalizedRoutes(route));

    (seoPageData || []).forEach((page: any) => {
      const slug = normalizeIndexableSlug(page?.slug);
      const locale = normalizeLocaleCode(page?.locale);
      const pageType = String(page?.page_type || "").trim().toLowerCase();
      if (!slug || !locale || !SUPPORTED_LOCALES.includes(locale)) return;

      const path = ["compare", "guide", "topic", "landing"].includes(pageType)
        ? buildSeoPagePath(pageType, slug)
        : null;
      if (!path) return;

      localizedRoutes.push({
        loc: localizePath(path, locale),
        lastmod: page?.updated_at || fallbackLastmod,
      });
    });

    (faqTopics || []).forEach((topic) => {
      SUPPORTED_LOCALES.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(`/faq/topic/${topic.slug}`, locale),
          lastmod: topic.updatedAt || fallbackLastmod,
        });
      });
    });

    const deduped = new Map<string, { loc: string; lastmod: string; images?: { loc: string }[] }>();
    localizedRoutes.forEach((route) => {
      if (!deduped.has(route.loc)) {
        deduped.set(route.loc, route);
      }
    });

    return Array.from(deduped.values());
  } catch (error) {
    console.error("Error fetching dynamic routes:", error);
    return [];
  }
}
