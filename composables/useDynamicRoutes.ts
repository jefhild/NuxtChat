import {
  getRegisteredUsersDisplaynames,
  getPublishedSeoPageRoutes,
  getFaqTopicSlugs,
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
const INDEXABLE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const PROFILE_MIN_AGE_DAYS = 7;

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

/**
 * Returns the locales a profile should appear under in the sitemap:
 * the profile's preferred_locale + any locales with explicit translations.
 * Unlike getProfileTranslationLocales(), this does NOT auto-add 'en' unless
 * it is the preferred locale or has a real translation.
 */
function getProfileSitemapLocales(profile: any): string[] {
  const locales = new Set<string>();
  const preferred = normalizeLocaleCode(profile?.preferred_locale);
  if (preferred && SUPPORTED_LOCALES.includes(preferred)) {
    locales.add(preferred);
  } else {
    locales.add("en");
  }
  const translations = Array.isArray(profile?.profile_translations)
    ? profile.profile_translations
    : [];
  for (const t of translations) {
    const locale = normalizeLocaleCode(t?.locale);
    if (locale && SUPPORTED_LOCALES.includes(locale)) locales.add(locale);
  }
  return Array.from(locales);
}

export async function getAllDynamicRoutes(): Promise<string[]> {
  try {
    const [{ data: profiles, error }, seoPageData, faqTopics] = await Promise.all([
      getRegisteredUsersDisplaynames({ minAgeDays: PROFILE_MIN_AGE_DAYS }),
      getPublishedSeoPageRoutes(),
      getFaqTopicSlugs(),
    ]);

    if (!profiles || !seoPageData || error) {
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
            const basePath = `/profiles/${gender}/${normalizedSlug}`;
            const sitemapLocales = getProfileSitemapLocales(profile);
            return sitemapLocales.map((locale) => localizePath(basePath, locale));
          })
      )
    ).filter((routes): routes is string[] => Boolean(routes)).flat();

    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
      "/compare",
      "/guides",
      "/profiles",
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
        ...profileRoutes,
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
    const [{ data: profiles, error }, seoPageData, faqTopics] = await Promise.all([
      getRegisteredUsersDisplaynames({ minAgeDays: PROFILE_MIN_AGE_DAYS }),
      getPublishedSeoPageRoutes(),
      getFaqTopicSlugs(),
    ]);

    if (!profiles || !seoPageData || error) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const staticPages = [
      "/about",
      "/faq",
      "/cookies",
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
            const basePath = `/profiles/${gender}/${normalizedSlug}`;
            const lastmod = profile.created
              ? new Date(profile.created).toISOString()
              : fallbackLastmod;
            const sitemapLocales = getProfileSitemapLocales(profile);
            return sitemapLocales.map((locale) => ({
              loc: localizePath(basePath, locale),
              lastmod,
            }));
          })
      )
    ).filter((routes): routes is { loc: string; lastmod: string }[] => Boolean(routes)).flat();

    profileRoutes.forEach((route) => localizedRoutes.push(route));

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
