
# SEO Page Route Localization: Complexity Analysis

## Overview

This document analyzes the complexity of localizing routes for the four SEO page sections
managed via the admin panel: **landing**, **guide**, **topic**, and **compare**.

---

## Completed Work ✅

### Admin locale switcher (April 2026)
- The Edit SEO Page dialog now shows which locale variants already exist (e.g. `EN`, `FR (new)`)
- Switching locales in the dropdown loads that variant's content into the form for independent editing
- Switching to a locale with no DB record starts a blank form for that locale (saves as a new row)
- Hero image and photo credits carry over across all locale variants (they are language-agnostic)
- The Published toggle auto-saves immediately without requiring a full form save
- `editLocaleVariants` is refreshed after translation completes so newly translated rows are immediately available in the switcher

### API published-only fallback fix (April 2026)
- The public API (`/api/seo-pages/[type]/[slug]`) previously served unpublished locale variants as real content
- Fixed: `preferred` row and `availableLocales` are now derived from `publishedRows` only
- Unpublished locales fall back to the English published row and receive `noindex,follow` via `useSeoI18nMeta`
- hreflang links only reference published locale variants

---

## Page Types & Route Structure

| Type      | Route Pattern                   | Page File(s)                    |
|-----------|--------------------------------|----------------------------------|
| `landing` | `/[slug]`                      | 7 individual `.vue` files       |
| `guide`   | `/guides/[slug]`               | `pages/guides/[slug].vue`       |
| `topic`   | `/topics/[slug]`               | `pages/topics/[slug].vue`       |
| `compare` | `/compare/[slug]`              | `pages/compare/[slug].vue`      |

**Landing pages (7):**
`/anonymous-chat`, `/chat-without-signup`, `/mood-based-chat`,
`/meet-new-people-online`, `/talk-to-strangers-online`,
`/need-someone-to-talk-to`, `/cant-sleep-chat`

---

## i18n Strategy

- Strategy: `prefix_except_default` (English = no prefix; others = `/fr/`, `/ru/`, `/zh/`)
- Locales: `en`, `fr`, `ru`, `zh`
- With this strategy, `nuxt-i18n` **automatically creates locale-prefixed versions of all pages**:
  - `/fr/guides/my-slug`, `/zh/topics/my-slug`, `/fr/chat-without-signup` all exist today.

---

## What Is Already Implemented ✅

### Route Infrastructure (COMPLETE)
1. **`redirectOptions.exclude`** in `nuxt.config.ts` already covers all sections:
   - `guides/**` and `*/guides/**`
   - `topics/**` and `*/topics/**`
   - `compare/**` and `*/compare/**`
   - All 7 landing pages with both bare (`/chat-without-signup`) and all locale-prefixed variants
2. **API layer** (`/api/seo-pages/[type]/[slug]`) already:
   - Accepts `?locale=` query param
   - Returns `availableLocales` array for hreflang generation
   - Falls back to `en` when requested locale doesn't exist in DB
3. **`useSeoI18nMeta` composable** already handles:
   - Canonical URL selection based on available locales
   - `noindex,follow` for pages served in wrong locale
   - `hreflang` alternate link generation
4. **AI translation pipeline** (`server/utils/seoPageTranslation.ts`) already:
   - Translates all SEO page fields (title, meta, body, highlights, CTA, related links) via OpenAI
   - Upserts translated rows into `seo_pages` table with correct `(page_type, locale, slug)` unique key
   - Accessible from admin panel (`AdminSeoPages` component)

### Data Layer (COMPLETE)
- `seo_pages` table has a `locale` column — translated variants are separate rows with the same `slug`
- `seoPageTranslationQueue.ts` manages async translation jobs

---

## Gaps Identified (What's Missing)

### 1. Guide / Topic / Compare — Content Only (LOWEST complexity)
- **Routes**: ✅ Already work with all locale prefixes
- **Infrastructure**: ✅ Complete
- **Gap**: Just need translated content rows in the `seo_pages` DB table
- **How to fix**: Use the existing translation trigger in Admin → SEO Pages to generate `fr`, `ru`, `zh` variants for each page
- **Effort**: No code changes needed — purely a content operation via the admin panel

### 2. Landing Pages — Fallback Content (LOW complexity)
- **Routes**: ✅ Already work with all locale prefixes (individually listed in `redirectOptions.exclude`)
- **Infrastructure**: ✅ `useLandingSeoPage` composable fetches locale-aware content from DB
- **Gap**: `utils/marketingPages.ts` (the hardcoded fallback) only contains English copy. If no DB record exists for a landing page in `fr`/`ru`/`zh`, visitors see **English fallback content** under the locale-prefixed URL.
- **How to fix**:
  - Option A (Recommended): Create DB records for each landing page per locale via admin panel + trigger AI translation
  - Option B: Add `fr`, `ru`, `zh` keys to the `pageCopy` object in `marketingPages.ts`
- **Effort**: Option A = content-only via admin (no code); Option B = code change to one utility file

### 3. Locale-Native Slugs — Not Implemented (HIGH complexity, future work)
- **Current**: All slugs are English (e.g., `/zh/anonymous-chat`)
- **True path localization**: Would be `/zh/匿名聊天` or `/fr/chat-anonyme`
- **Why this matters**: Without locale-native slugs, non-English URLs still contain English words, which limits locale-specific SEO signal strength
- **What this requires**:
  - New `slug_locale` or per-locale slug DB column
  - Custom Nuxt routing (can't rely on `[slug].vue` alone)
  - Separate `redirectOptions.exclude` entries per locale-slug
  - Dynamic sitemap updates for per-locale slugs
  - Translation of slugs in AI pipeline
- **This is a significant architectural change** — implement only if targeting strong locale-specific SEO signals

---

## Complexity Summary

| Section               | Route Work | Code Work | Content Work | Overall |
|-----------------------|------------|-----------|--------------|---------|
| Guide / Topic / Compare | None ✅    | None ✅   | Trigger translation in admin ✅  | **Done** |
| Landing pages (route) | None ✅    | None ✅   | Trigger translation in admin ✅  | **Done** |
| Landing fallback copy | None ✅    | Minimal*  | Add DB rows  | **Low** |
| Locale-native slugs   | Significant| Significant | Significant | **High / Future** |

*If using admin-panel DB records (Option A), no code change needed.

---

## Recommended Path Forward

1. **Trigger AI translations** for any pages not yet translated — use Admin → SEO Pages → Edit → Translate button. The locale switcher now shows `FR (new)` / `RU (new)` / `ZH (new)` for missing variants.
2. **Publish translated variants** using the Published toggle (auto-saves immediately).
3. **Optional code fix**: Add French/Russian/Chinese fallback copy to `utils/marketingPages.ts` as a safety net for landing pages before DB records exist.
4. **Future**: Implement locale-native slugs for stronger locale-specific SEO signals (see gap #3 above).

---

## Files Relevant to This Feature

| File | Purpose |
|------|---------|
| `nuxt.config.ts` | `redirectOptions.exclude` + i18n config |
| `pages/guides/[slug].vue` | Guide route |
| `pages/topics/[slug].vue` | Topic route |
| `pages/compare/[slug].vue` | Compare route |
| `pages/[landing-slug].vue` (×7) | Landing page routes |
| `composables/useLandingSeoPage.ts` | Fetches landing page with locale + fallback |
| `server/api/seo-pages/[type]/[slug].get.ts` | API: serves locale-specific page from DB |
| `server/utils/seoPages.ts` | Types, normalization, DB query helpers |
| `server/utils/seoPageTranslation.ts` | AI translation pipeline |
| `utils/marketingPages.ts` | Hardcoded English fallback content |
| `utils/seoPagePaths.ts` | Route path builder per page type |
| `composables/useSeoI18nMeta.ts` | Canonical, hreflang, robots meta |
| `components/Admin2/SeoPages.vue` | Admin UI for managing SEO pages |
