// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { getAllDynamicRoutes } from "./composables/useDynamicRoutes";

export default defineNuxtConfig({
  // devtools: { enabled: true },
  ssr: true,

  css: ["@/assets/css/util.css"],

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

    // "@nuxtjs/robots",
    "nuxt-gtag",
    "@nuxtjs/i18n",
  ],

  i18n: {
    // Define available locales
    defaultLocale: "en",
    langDir: "./locales/",
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
      send_page_view: true,
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
        "/^/chat/articles(/.*)?$/",
        "*/about",
        "/*/about",
        "/about",
        "/*/logout",
        "/logout",
        "/signin",
        "/*/signin",
        "/terms",
        "/*/terms",
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

    public: {
      // Non-sensitive keys (accessible on both server and client)
      SUPABASE_BUCKET: process.env.NUXT_PUBLIC_SUPABASE_BUCKET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_REDIRECT: process.env.SUPABASE_REDIRECT,
      GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
      TERMLY_ID: process.env.TERMLY_ID,
      ADSENSE_CLIENT: process.env.ADSENSE_CLIENT || "",
      SITE_URL: process.env.SITE_URL || "http://localhost:3000",
      IMCHATTY_ID:
        process.env.IMCHATTY_ID || "a3962087-516b-48df-a3ff-3b070406d832",
    },
  },

  compatibilityDate: "2025-03-13",
  nitro: {
    prerender: {
      routes: ["/"],
      crawlLinks: true,
      ignore: [
        "/settings",
        "/fr/settings",
        "/ru/settings",
        "/zh/settings",
        "/**/settings",
      ],
      failOnError: false,
    },
    debug: false,
  },

  hooks: {
    async "nitro:config"(nitroConfig) {
      if (process.env.NODE_ENV === "development") return;
      let dynamicRoutes: string[] = await getAllDynamicRoutes().catch(() => []);
      // guard: never push settings routes into prerender
      dynamicRoutes = dynamicRoutes.filter((r) => !/\/settings$/.test(r));

      if (nitroConfig?.prerender?.routes) {
        nitroConfig.prerender.routes.push(...dynamicRoutes);
      }
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
