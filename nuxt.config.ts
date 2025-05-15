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
  ],

  gtag: {
    id: process.env.GOOGLE_ANALYTICS_ID,
    initCommands: [
      // Setup up consent mode
      ['consent', 'default', {
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        ad_storage: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500,
      }]
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

  // alias: {
  //   pinia: "/node_modules/@pinia/nuxt/node_modules/pinia/dist/pinia.mjs",
  // },

  // turnstile: {
  //   siteKey: "0x4AAAAAAAeTlr6xNa6aQYsi",
  // },

  supabase: {
    redirectOptions: {
      login: "/",
      callback: "/",
      exclude: [
        "/about",
        "/login",
        "/logout",
        "/signin",
        "/loginemail",
        "/loginfacebook",
        "/terms",
        "/privacy",
        "/profiles",
        "/profiles/",
        "/profiles/*",
        "/profiles/**",
        "/articles/*",
        "/articles",
        "/tags/*",
        "/tags",
        "/cookies",
        "/categories/*",
        "/categories",
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
