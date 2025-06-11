// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
import { getAllDynamicRoutes } from "./composables/useDynamicRoutes";

export default defineNuxtConfig({
  // devtools: { enabled: true },
  ssr: true,

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
    "nuxt-gtag",
    "@nuxtjs/i18n",
  ],

  i18n: {
    // Define available locales
    defaultLocale: "en",
    langDir: "./locales/",
    lazy: true,
    strategy: "prefix_and_default",
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
          analytics_storage: "denied",
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
        "/*/about",
        "/about",
        "/*/login",
        "/login",
        "/*/logout",
        "/logout",
        "/signin",
        "/*/signin",
        "/loginemail",
        "/*/loginemail",
        "/loginfacebook",
        "/*/loginfacebook",
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
        "/*/categories/*",
        "/*/categories",
        "/categories/*",
        "/*/insights",
        "/insights",
        "/*/guides/*",
        "/*/guides",
        "/guides/*",
        "/guides",
        "/sitemap.xml",
      ],
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
      "/loginemail",
      "/loginfacebook",
      "/terms",
      "/privacy",
      "/settings",
      "/chat",
      "/admin",
      "_nuxt",
      "/cdn-cgi",
    ],
    allow: "/",
    sitemap: "https://imchatty.com/sitemap.xml",
  },

  runtimeConfig: {
    // Private keys (accessible only on the server)
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    public: {
      // Non-sensitive keys (accessible on both server and client)
      SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_REDIRECT: process.env.SUPABASE_REDIRECT,
      GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
      TERMLY_ID: process.env.TERMLY_ID,
      ADSENSE_CLIENT: process.env.ADSENSE_CLIENT || "",
      SITE_URL: process.env.SITE_URL || "http://localhost:3000",
    },
  },

  compatibilityDate: "2024-07-09",
  nitro: {
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
    debug: false,
  },

  hooks: {
    async "nitro:config"(nitroConfig) {
      if (process.env.NODE_ENV === "development") return;

      // Fetch dynamic routes asynchronously
      let dynamicRoutes: string[];
      try {
        dynamicRoutes = await getAllDynamicRoutes();
        // console.log("dynamicRoutes fetched:", dynamicRoutes);
      } catch (error) {
        console.error("Error fetching dynamic routes:", error);
        dynamicRoutes = [];
      }

      // Log the type of dynamicRoutes to verify it's an array
      // console.log("Type of dynamicRoutes:", typeof dynamicRoutes);
      if (!Array.isArray(dynamicRoutes)) {
        console.error("dynamicRoutes is not an array, it's:", dynamicRoutes);
        dynamicRoutes = []; // Fallback to an empty array
      }

      // Add the fetched dynamic routes to Nitro's prerender config
      if (nitroConfig?.prerender?.routes) {
        console.log(
          "Adding dynamic routes to Nitro prerender config:",
          dynamicRoutes
        );
        nitroConfig.prerender.routes.push(...dynamicRoutes);

        // console.log(
        //   "Final routes passed to Nitro:",
        //   nitroConfig.prerender.routes
        // );
      } else {
        console.error("prerender.routes is not defined in nitroConfig.");
      }
    },
  },

  sitemap: {
    sources: ["/api/sitemap/urls"],
    exclude: [
      "/login",
      "/loginemail",
      "/loginfacebook",
      "/terms",
      "/privacy",
      "/settings",
      "/chat",
      "/admin",
    ],
  },
});
