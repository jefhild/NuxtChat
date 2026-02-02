// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { getAllDynamicRoutes } from "./composables/useDynamicRoutes";

export default defineNuxtConfig({
  // devtools: { enabled: true },
  ssr: true,

  css: ["@/assets/css/util.css"],

  app: {
    head: {
      script: [
        ...(process.env.TERMLY_ID
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
    langDir: "./locales/",
    // langDir: "i18n/locales",
    // langDir: "locales",
    lazy: true,
    // strategy: "prefix_and_default",
    strategy: "prefix_except_default",
    // strategy: "prefix",
    locales: [
      { code: "en", iso: "en-US", file: "en-US.json" },
      { code: "fr", iso: "fr-FR", file: "fr-FR.json" },
      { code: "ru", iso: "ru-RU", file: "ru-RU.json" },
      { code: "zh", iso: "zh-CN", file: "zh-CN.json" },
    ],
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      // Redirect users without a locale cookie when they hit a non-prefixed route.
      redirectOn: "no prefix",
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
        "*/chat",
        "/chat",
        "*/about",
        "/*/about",
        "/about",
        "*/faq",
        "/*/faq",
        "/faq",
        "*/feeds",
        "/*/feeds",
        "/feeds",
        "/*/logout",
        "/logout",
        "/signin",
        "/*/signin",
        "/terms",
        "/*/terms",
        "/people",
        "/*/people",
        "/people/**",
        "*/people/**",
        "/privacy",
        "/*/privacy",
        "/*/profiles",
        "/*/profiles/**",
        "/profiles",
        "/profiles/**",
        "/articles",
        "/*/articles/*",
        "/*/articles",
        "/articles/*",
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
      "/terms",
      "/privacy",
      "/settings",
      "/admin",
      "/callback",
      "/cdn-cgi",
    ],
    allow: ["/", "/_nuxt/"],
    sitemap: "https://imchatty.com/sitemap.xml",
  },

  runtimeConfig: {
    // Private keys (accessible only on the server)
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
    META_IG_USER_ID: process.env.META_IG_USER_ID,
    META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || "v20.0",
    HCAPTCHA_SECRET: process.env.HCAPTCHA_SECRET,
    INDEXNOW_KEY: process.env.INDEXNOW_KEY,
    INDEXNOW_ENDPOINT: process.env.INDEXNOW_ENDPOINT,

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
      SITE_URL: process.env.SITE_URL || "http://localhost:3000",
      HCAPTCHA_SITE_KEY: process.env.NUXT_PUBLIC_HCAPTCHA_SITE_KEY || "",
      IMCHATTY_ID:
        process.env.IMCHATTY_ID || "a3962087-516b-48df-a3ff-3b070406d832",
    },
  },

  compatibilityDate: "2025-03-13",

  routeRules: {
    "/people/**": { prerender: false, swr: 3600 },
    "/profiles/**": { prerender: false },
    "/articles/**": { prerender: false, swr: 3600 },
    "/tags/**": { prerender: false, swr: 3600 },
  },

  nitro: {
    prerender: {
      routes: ["/"],
      crawlLinks: false, // avoid crawling dynamic lists (profiles, etc.) to keep prerender set bounded
      concurrency: 4,
      ignore: [
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
      nitroConfig.prerender.routes?.push(...dynamicRoutes);

      // TEMP: log prerender route counts to diagnose OOM
      const profileCount = dynamicRoutes.filter((r) =>
        r.includes("/profiles/"),
      ).length;
      const articleCount = dynamicRoutes.filter((r) =>
        r.includes("/articles/"),
      ).length;
      const peopleCount = dynamicRoutes.filter((r) =>
        r.includes("/people/"),
      ).length;
      const tagCount = dynamicRoutes.filter((r) => r.includes("/tags/")).length;
      const categoryCount = dynamicRoutes.filter((r) =>
        r.includes("/categories/"),
      ).length;
      console.info("prerender totals", {
        total: dynamicRoutes.length,
        profiles: profileCount,
        articles: articleCount,
        people: peopleCount,
        tags: tagCount,
        categories: categoryCount,
      });
    },
  },

  sitemap: {
    sources: ["/api/sitemap/urls"],
    exclude: [
      "/login",
      "/logout",
      "/loginemail",
      "/loginfacebook",
      "/terms",
      "/privacy",
      "/settings",
      "/admin",
    ],
  },
});
