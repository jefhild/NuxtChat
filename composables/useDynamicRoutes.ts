import {
  getRegisteredUsersDisplaynames,
  getAllPublishedArticlesWithTags,
  getPublishedSeoPageRoutes,
  getUserSlugFromDisplayName,
} from "../lib/supabaseHelpers";
import { getGenderFromId } from "../lib/dbUtils";
import { shouldIndexProfile } from "./useIndexability";
import { buildSeoPagePath } from "../utils/seoPagePaths";

/**
 * Returns an array of dynamic route strings.
 * Used for Nitro prerendering (must return string[]).
 */
const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
const defaultLocale = "en";
const supabaseArticlesBase = (
  process.env.NUXT_PUBLIC_SUPABASE_BUCKET || ""
).replace(/\/+$/, "");
const INDEXABLE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function localizePath(path: string, locale: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function buildArticleImageUrl(imagePath?: string | null) {
  if (!imagePath || !supabaseArticlesBase) return null;
  const cleanPath = String(imagePath).replace(/^\/+/, "");
  return cleanPath ? `${supabaseArticlesBase}/articles/${cleanPath}` : null;
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

function getArticleAvailableLocales(article: any): string[] {
  const available = new Set<string>();
  const originalLocale = normalizeLocaleCode(article?.original_language_code);
  if (originalLocale) {
    available.add(originalLocale);
  } else {
    available.add(defaultLocale);
  }

  const translations = Array.isArray(article?.article_translations)
    ? article.article_translations
    : [];

  translations.forEach((entry: any) => {
    const locale = normalizeLocaleCode(entry?.locale);
    if (locale) available.add(locale);
  });

  return SUPPORTED_LOCALES.filter((locale) => available.has(locale));
}

export async function getAllDynamicRoutes(): Promise<string[]> {
  try {
    const [
      { data: profiles, error },
      articleData,
      seoPageData,
    ] =
      await Promise.all([
        getRegisteredUsersDisplaynames(),
        getAllPublishedArticlesWithTags(),
        getPublishedSeoPageRoutes(),
      ]);

    if (
      !profiles ||
      !articleData ||
      !seoPageData ||
      error
    ) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const profileRoutes = (
      await Promise.all(
        profiles
          .map(async (profile) => {
            if (!shouldIndexProfile(profile)) return null;
            const slug =
              profile.slug ||
              (await getUserSlugFromDisplayName(profile.displayname));

            const normalizedSlug = normalizeIndexableSlug(slug);
            if (!normalizedSlug) return null;

            const gender = getGenderFromId(profile.gender_id) || "unknown";
            return `/profiles/${gender}/${normalizedSlug}`;
          })
      )
    ).filter((route): route is string => Boolean(route));

    const articleRoutes = articleData
      .map((a) => {
        const slug = normalizeIndexableSlug(a?.slug);
        if (!slug) return null;
        return {
          path: `/articles/${slug}`,
          locales: getArticleAvailableLocales(a),
        };
      })
      .filter((route): route is { path: string; locales: string[] } => Boolean(route));
    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
      "/articles",
      "/compare",
      "/guides",
      "/profiles",
      "/topics",
    ];
    const homeRoutes = ["/"];

    const allRoutes = [
      ...homeRoutes,
      ...staticPages,
      ...profileRoutes,
    ];

    const localizedRoutes = allRoutes.flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => localizePath(route, locale))
    );

    const localizedArticleRoutes = articleRoutes.flatMap((route) =>
      route.locales.map((locale) => localizePath(route.path, locale))
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

    return [
      ...new Set([
        ...localizedRoutes,
        ...localizedArticleRoutes,
        ...localizedSeoPageRoutes,
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
    const [
      { data: profiles, error },
      articleData,
      seoPageData,
    ] = await Promise.all([
      getRegisteredUsersDisplaynames(),
      getAllPublishedArticlesWithTags(),
      getPublishedSeoPageRoutes(),
    ]);

    if (
      !profiles ||
      !articleData ||
      !seoPageData ||
      error
    ) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
      "/articles",
      "/compare",
      "/guides",
      "/profiles",
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

    const profileRoutes = (
      await Promise.all(
        profiles
          .map(async (profile) => {
            if (!shouldIndexProfile(profile)) return null;
            const slug =
              profile.slug ||
              (await getUserSlugFromDisplayName(profile.displayname));

            const normalizedSlug = normalizeIndexableSlug(slug);
            if (!normalizedSlug) return null;

            const gender = getGenderFromId(profile.gender_id) || "unknown";
            return `/profiles/${gender}/${normalizedSlug}`;
          })
      )
    ).filter((route): route is string => Boolean(route));

    profileRoutes.forEach((route) => addLocalizedRoutes(route));

    articleData.forEach((article) => {
      const articleSlug = normalizeIndexableSlug(article?.slug);
      if (!articleSlug) return;
      const imageUrl = buildArticleImageUrl(article?.image_path);
      const localizedArticlePath = `/articles/${articleSlug}`;
      const locales = getArticleAvailableLocales(article);
      locales.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(localizedArticlePath, locale),
          lastmod: article?.created_at || fallbackLastmod,
          images: imageUrl ? [{ loc: imageUrl }] : undefined,
        });
      });
    });

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
