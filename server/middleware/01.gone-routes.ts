/**
 * Returns HTTP 410 Gone for URL paths that have been permanently removed.
 * Runs server-side so crawlers and direct requests get the correct status code
 * rather than a 404 or a client-side redirect.
 *
 * Covered patterns (with and without locale prefix en/fr/ru/zh):
 *   /articles, /articles/*
 *   /chat/articles, /chat/articles/*
 *   /tags, /tags/*
 *   /categories, /categories/*
 *   /people, /people/*
 */
import { createError, defineEventHandler, getRequestURL } from "h3";

const GONE_RE =
  /^\/(?:(?:en|fr|ru|zh)\/)?(?:articles|chat\/articles|tags|categories|people)(?:\/|$)/;

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;

  // Only apply to page requests — skip API, assets, and Nuxt internals.
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_nuxt/") ||
    path.startsWith("/__nuxt") ||
    path.startsWith("/_ipx/")
  ) {
    return;
  }

  if (GONE_RE.test(path)) {
    throw createError({ statusCode: 410, statusMessage: "Gone" });
  }
});
