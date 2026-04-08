// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { getAllDynamicRoutes } from "./composables/useDynamicRoutes";
import { landingPageSlugs } from "./config/landingPageSlugs";

export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: true,
  experimental: {
    // Avoid Vite trying to resolve the generated `#app-manifest` alias during dev startup.
    appManifest: false,
    // Keep Nuxt on the legacy Vite build path. The newer environment API path is
    // causing a second client-manifest read after the file has already been removed.
    viteEnvironmentApi: false,
  },

  css: ["@/assets/css/util.css"],

  app: {
    head: {
      script: [
        ...(process.env.TERMLY_ID && process.env.NODE_ENV === "production"
          ? [
              {
                id: "termly-resource-blocker",
                src: `https://app.termly.io/resource-blocker/${process.env.TERMLY_ID}?autoBlock=on`,
                tagPosition: "head",
                priority: -1000,
              },
            ]
          : []),
      ],
    },
  },

  build: {
    transpile: ["vuetify"],
  },

  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }));
      });
    },
    "@nuxtjs/supabase",
    "@nuxt/eslint",
    "@pinia/nuxt",
    "@nuxt/image",
    "@nuxtjs/google-fonts",
    "@nuxtjs/seo",
    // "nuxt-site-config",
    // "@nuxtjs/robots",
    "nuxt-gtag",
    "@nuxtjs/i18n",
  ],

  i18n: {
    // Define available locales
    defaultLocale: "en",
    vueI18n: "./i18n.config.ts",
    langDir: "./locales/",
    lazy: true,
    // strategy: "prefix_and_default",
    strategy: "prefix_except_default",
    // strategy: "prefix",
    locales: [
      { code: "en", language: "en-US", file: "en-US.json" },
      { code: "fr", language: "fr-FR", file: "fr-FR.json" },
      { code: "ru", language: "ru-RU", file: "ru-RU.json" },
      { code: "zh", language: "zh-CN", file: "zh-CN.json" },
    ],
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      // Restrict language detection redirects to "/" to keep non-root URLs stable for crawl/index.
      redirectOn: "root",
      useCookie: true,
    },
  },

  gtag: {
    id: process.env.GOOGLE_ANALYTICS_ID,
    initCommands: [
      // Setup up consent mode
      [
        "consent",
        "default",
        {
          ad_user_data: "denied",
          ad_personalization: "denied",
          ad_storage: "denied",
          analytics_storage: "granted",
          wait_for_update: 500,
        },
      ],
    ],
    config: {
      anonymize_ip: true,
      send_page_view: false,
      disableAutoPageTrack: true,
    },
  },

  googleFonts: {
    display: "swap",
    families: {
      "Amatic+SC": [400, 700],
      Poppins: {
        wght: [300, 400, 500, 600, 700],
        ital: [400],
      },
    },
  },
  image: {
    domains: ["home.imchatty.com"],
  },
  supabase: {
    redirectOptions: {
      login: "/",
      callback: "/callback",
      exclude: [
        "/en",
        "/fr",
        "/ru",
        "/zh",
        "/callback",
        "/*/callback",
        "/callback/*",
        "/*/chat",
        "/chat",
        "/*/about",
        "/about",
        // Landing pages — managed via config/landingPageSlugs.ts
        ...landingPageSlugs.flatMap((slug) => [`/*/${slug}`, `/${slug}`]),
        "/*/compare",
        "/*/compare/**",
        "/compare",
        "/compare/**",
        "/*/faq",
        "/*/faq/topic",
        "/*/faq/topic/**",
        "/faq",
        "/faq/topic",
        "/faq/topic/**",
        "/*/feeds",
        "/feeds",
        "/*/mood",
        "/*/mood/**",
        "/mood",
        "/mood/**",
        "/*/guides",
        "/*/guides/**",
        "/guides",
        "/guides/**",
        "/logout",
        "/*/logout",
        "/signin",
        "/*/signin",
        "/terms",
        "/*/terms",
        "/people",
        "/*/people",
        "/*/people/*",
        "/*/people/**",
        "/people/**",
        "/privacy",
        "/*/privacy",
        "/*/profiles",
        "/*/profiles/**",
        "/profiles",
        "/profiles/**",
        "/*/tags/*",
        "/*/tags",
        "/tags/*",
        "/tags",
        "/*/cookies",
        "/cookies",
        "/categories",
        "/*/categories/*",
        "/*/categories",
        "/categories/*",
        "/sitemap.xml",
        "/*/topics",
        "/*/topics/**",
        "/topics",
        "/topics/**",
        "/match",
        "/en/match",
        "/fr/match",
        "/ru/match",
        "/zh/match",
      ],
    },

    clientOptions: {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // <-- AUTO exchange on first load of /callback
        // Derive a stable storageKey from SUPABASE_URL (no hard-coding)
        storageKey: process.env.SUPABASE_URL?.split("//")[1]?.split(".")[0] // project ref
          ? `sb-${
              process.env.SUPABASE_URL.split("//")[1].split(".")[0]
            }-auth-token`
          : "sb-auth-token",
      },
    },
  },

  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },

  site: {
    url: "https://imchatty.com",
    name: "ImChatty",
    description: "ImChatty is a free anonymous chat site.",
    defaultLocale: "en", // not needed if you have @nuxtjs/i18n installed
  },

  robots: {
    disallow: [
      "/login",
      "/signin",
      "/settings",
      "/*/settings",
      "/admin",
      "/callback",
      "/*/callback",
      "/cdn-cgi",
    ],
    allow: ["/", "/_nuxt/"],
    sitemap: "https://imchatty.com/sitemap_index.xml",
  },

  runtimeConfig: {
    // Private keys (accessible only on the server)
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    MOLTBOOK_APP_KEY: process.env.MOLTBOOK_APP_KEY,
    MOLTBOOK_AGENT_API_KEY: process.env.MOLTBOOK_AGENT_API_KEY,
    MOLTBOOK_AGENT_KEYS_JSON: process.env.MOLTBOOK_AGENT_KEYS_JSON || "{}",
    MOLTBOOK_ARTICLE_AUTOPUBLISH:
      process.env.MOLTBOOK_ARTICLE_AUTOPUBLISH || "false",
    MOLTBOOK_ARTICLE_AGENT_NAME:
      process.env.MOLTBOOK_ARTICLE_AGENT_NAME || "imchatty",
    MOLTBOOK_ARTICLE_SUBMOLT:
      process.env.MOLTBOOK_ARTICLE_SUBMOLT || "general",
    MOLTBOOK_AGENT_NAME: process.env.MOLTBOOK_AGENT_NAME || "imchatty",
    MOLTBOOK_AGENT_DESCRIPTION:
      process.env.MOLTBOOK_AGENT_DESCRIPTION ||
      "AI chat companion for anonymous conversation, onboarding, and social discovery.",
    MOLTBOOK_AUDIENCE: process.env.MOLTBOOK_AUDIENCE || "",
    MOLTBOOK_AUTOMATION_SECRET:
      process.env.MOLTBOOK_AUTOMATION_SECRET ||
      process.env.AUTOMATION_SECRET ||
      "",
    AUTOMATION_SECRET: process.env.AUTOMATION_SECRET || "",
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
    META_IG_USER_ID: process.env.META_IG_USER_ID,
    META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || "v20.0",
    TURNSTILE_SECRET: process.env.TURNSTILE_SECRET,
    INDEXNOW_KEY: process.env.INDEXNOW_KEY,
    INDEXNOW_ENDPOINT: process.env.INDEXNOW_ENDPOINT,
    SITEMAP_ALERT_WEBHOOK_URL: process.env.SITEMAP_ALERT_WEBHOOK_URL,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || "",
    SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || "ImChatty",
    SENDGRID_UNSUBSCRIBE_GROUP_ID: process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "",
    CRON_SECRET: process.env.CRON_SECRET || "",
    GSC_SERVICE_ACCOUNT_KEY: process.env.GSC_SERVICE_ACCOUNT_KEY || "",
    GSC_SITE_URL: process.env.GSC_SITE_URL || "",
    BING_WEBMASTER_API_KEY: process.env.BING_WEBMASTER_API_KEY || "",
    BING_SITE_URL: process.env.BING_SITE_URL || "",

    public: {
      // Non-sensitive keys (accessible on both server and client)
      SUPABASE_BUCKET: process.env.NUXT_PUBLIC_SUPABASE_BUCKET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_REDIRECT: process.env.SUPABASE_REDIRECT,
      GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
      TERMLY_ID: process.env.TERMLY_ID,
      CLARITY_ID: process.env.CLARITY_ID,
      CLARITY_ENABLED: process.env.NUXT_PUBLIC_CLARITY_ENABLED ?? "true",
      CLARITY_REQUIRE_CONSENT:
        process.env.NUXT_PUBLIC_CLARITY_REQUIRE_CONSENT ?? "true",
      CLARITY_CONSENT_COOKIE:
        process.env.NUXT_PUBLIC_CLARITY_CONSENT_COOKIE ?? "TERMLY_API_CACHE",
      CLARITY_CONSENT_STORAGE:
        process.env.NUXT_PUBLIC_CLARITY_CONSENT_STORAGE ?? "both",
      CLARITY_CONSENT_STORAGE_KEY:
        process.env.NUXT_PUBLIC_CLARITY_CONSENT_STORAGE_KEY ??
        "TERMLY_API_CACHE",
      CLARITY_CONSENT_REGEX:
        process.env.NUXT_PUBLIC_CLARITY_CONSENT_REGEX ?? "",
      ADSENSE_CLIENT: process.env.ADSENSE_CLIENT || "",
      TWITTER_SITE: process.env.NUXT_PUBLIC_TWITTER_SITE || "@imchatty_news",
      SITE_URL: process.env.SITE_URL || "http://localhost:3000",
      TURNSTILE_SITE_KEY: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || "",
      IMCHATTY_ID:
        process.env.IMCHATTY_ID || "a3962087-516b-48df-a3ff-3b070406d832",
    },
  },

  compatibilityDate: "2025-03-13",

  routeRules: {
    "/settings": {
      headers: { "x-robots-tag": "noindex, nofollow, noarchive" },
    },
    "/*/settings": {
      headers: { "x-robots-tag": "noindex, nofollow, noarchive" },
    },
    "/callback": {
      headers: { "x-robots-tag": "noindex, nofollow, noarchive" },
    },
    "/*/callback": {
      headers: { "x-robots-tag": "noindex, nofollow, noarchive" },
    },
    "/mood": {
      robots: "noindex, follow",
    },
    "/*/mood": {
      robots: "noindex, follow",
    },
    "/mood/**": {
      robots: "noindex, follow",
      prerender: false,
      swr: 3600,
    },
    "/*/mood/**": {
      robots: "noindex, follow",
      prerender: false,
      swr: 3600,
    },
    "/people/**": { prerender: false, swr: 3600 },
    "/profiles/**": { prerender: false },
    "/tags/**": { prerender: false, swr: 3600 },
  },

  nitro: {
    prerender: {
      routes: process.env.PRERENDER_HOME === "true" ? ["/"] : [],
      crawlLinks: false, // avoid crawling dynamic lists (profiles, etc.) to keep prerender set bounded
      concurrency: 4,
      ignore: [
        "/sitemap.xml",
        "/api/sitemap/urls",
        "/__sitemap__/**",
        "/settings",
        "/fr/settings",
        "/ru/settings",
        "/zh/settings",
        "/**/settings",
      ],
      failOnError: false,
    },
    externals: {
      inline: [
        "@supabase/supabase-js",
        "@supabase/auth-js",
        "@supabase/functions-js",
        "@supabase/realtime-js",
        "@supabase/storage-js",
        "@supabase/postgrest-js",
        "@supabase/ssr",
        "tslib",
      ],
    },
    debug: false,
    // Scheduled tasks only run in production (no cron scheduler in dev anyway)
    ...(process.env.NODE_ENV !== "development" && {
      experimental: {
        tasks: true,
      },
      scheduledTasks: {
        "*/2 * * * *": ["agent:proactive"],
        "* * * * *":   ["agent:reactive"],
        "0 6 * * *":   ["seo:daily-snapshot"],
      },
    }),
  },

  hooks: {
    // async "nitro:config"(nitroConfig) {
    //   if (process.env.NODE_ENV === "development") return;
    //   let dynamicRoutes: string[] = await getAllDynamicRoutes().catch(() => []);
    //   // guard: never push settings routes into prerender
    //   dynamicRoutes = dynamicRoutes.filter((r) => !/\/settings$/.test(r));

    //   if (nitroConfig?.prerender?.routes) {
    //     nitroConfig.prerender.routes.push(...dynamicRoutes);
    //   }

    async "nitro:config"(nitroConfig) {
      if (process.env.NODE_ENV === "development") return;
      if (process.env.PRERENDER_DYNAMIC !== "true") return; // keep builds light by default
      let dynamicRoutes = await getAllDynamicRoutes().catch(() => []);
      dynamicRoutes = dynamicRoutes.filter((r) => !/\/settings$/.test(r));

      console.info("prerender totals", {
        discovered: dynamicRoutes.length,
        injected: 0,
      });
    },
  },

  linkChecker: {
    runOnBuild: false,
    failOnError: false,
  },

  sitemap: {
    sources: ["/api/sitemap/urls"],
    exclude: [
      "/login",
      "/signin",
      "/logout",
      "/loginemail",
      "/loginfacebook",
      "/settings",
      "/**/settings",
      "/admin",
      "/callback",
      "/**/callback",
      "/articles",
      "/**/articles",
      "/**/articles/**",
      "/chat/articles",
      "/**/chat/articles",
      "/**/chat/articles/**",
      "/tags",
      "/**/tags",
      "/**/tags/**",
      "/people",
      "/**/people",
      "/**/people/**",
      "/categories",
      "/**/categories",
      "/**/categories/**",
    ],
  },
});
