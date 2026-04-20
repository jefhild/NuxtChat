// import this after install `@mdi/font` package
import "@mdi/font/css/materialdesignicons.css";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import { onNuxtReady } from "#app";

export default defineNuxtPlugin((app) => {
  const THEME_COOKIE_KEY = "imchatty_theme";
  const RESOLVED_THEME_COOKIE_KEY = "imchatty_theme_resolved";
  const normalizeThemeMode = (value) =>
    value === "dark" || value === "light" || value === "system"
      ? value
      : "system";
  const normalizeResolvedTheme = (value) =>
    value === "dark" || value === "light" ? value : null;
  const resolveSystemTheme = () => {
    if (import.meta.client) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  };
  const themeCookie = useCookie(THEME_COOKIE_KEY, {
    sameSite: "lax",
    path: "/",
  });
  const resolvedThemeCookie = useCookie(RESOLVED_THEME_COOKIE_KEY, {
    sameSite: "lax",
    path: "/",
  });
  const initialMode = normalizeThemeMode(themeCookie.value);
  const initialTheme =
    initialMode === "dark" || initialMode === "light"
      ? initialMode
      : normalizeResolvedTheme(resolvedThemeCookie.value) || "light";

  const vuetify = createVuetify({
    defaults: {
      VOverlay: {
        // Default to no page-dimming for lightweight overlays (menus/selects/tooltips).
        scrim: false,
      },
      VDialog: {
        // Keep modal dialogs dimmed.
        scrim: true,
      },
      VMenu: {
        // Dropdown/menu overlays should never dim or hide the page.
        scrim: false,
        attach: "body",
        contained: false,
        scrollStrategy: "reposition",
        locationStrategy: "connected",
      },
      VSelect: {
        menuProps: {
          scrim: false,
          attach: "body",
          contained: false,
          scrollStrategy: "reposition",
          locationStrategy: "connected",
        },
      },
      VAutocomplete: {
        menuProps: {
          scrim: false,
          attach: "body",
          contained: false,
          scrollStrategy: "reposition",
          locationStrategy: "connected",
        },
      },
      VCombobox: {
        menuProps: {
          scrim: false,
          attach: "body",
          contained: false,
          scrollStrategy: "reposition",
          locationStrategy: "connected",
        },
      },
      VTooltip: {
        scrim: false,
        openOnClick: false,
      },
    },
    theme: {
      // Keep SSR + client deterministic to avoid hydration mismatches.
      defaultTheme: initialTheme,
      themes: {
        light: {
          dark: false,
          colors: {
            primary: "#3f51b5",
            secondary: "#5c6bc0",
            accent: "#1976d2",
            background: "#f7f8fc",
            surface: "#ffffff",
            error: "#d32f2f",
            info: "#0288d1",
            success: "#2e7d32",
            warning: "#ed6c02",
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: "#90caf9",
            secondary: "#b39ddb",
            accent: "#64b5f6",
            background: "#121418",
            surface: "#1b1f27",
            "on-background": "#e6edf5",
            "on-surface": "#e6edf5",
            "on-primary": "#0b1220",
            error: "#ef5350",
            info: "#4fc3f7",
            success: "#66bb6a",
            warning: "#ffb74d",
          },
        },
      },
    },
  });

  const applyThemeMode = (mode) => {
    const normalizedMode = normalizeThemeMode(mode);
    const themeName =
      normalizedMode === "system" ? resolveSystemTheme() : normalizedMode;

    if (vuetify.theme?.global?.name?.value !== themeName) {
      vuetify.theme.global.name.value = themeName;
    }
    if (typeof vuetify.theme.change === "function") {
      vuetify.theme.change(themeName);
    } else if (typeof vuetify.theme.global.change === "function") {
      vuetify.theme.global.change(themeName);
    }
    if (import.meta.client) {
      document.documentElement.style.colorScheme = themeName;
      document.documentElement.dataset.imchattyTheme = themeName;
    }
    themeCookie.value = normalizedMode;
    resolvedThemeCookie.value = themeName;
  };

  if (import.meta.client) {
    // Apply before app mount so SSR's deterministic light fallback does not
    // linger visibly on first paint when the browser/user preference is dark.
    applyThemeMode(themeCookie.value || "system");

    onNuxtReady(() => {
      const syncActiveTheme = () => {
        applyThemeMode(themeCookie.value || "system");
      };

      // Apply persisted/system theme only when Nuxt is fully ready so
      // async component hydration has already settled.
      syncActiveTheme();

      // First visit: no cookie yet. Persist "system" mode by default.
      if (!themeCookie.value) {
        themeCookie.value = "system";
      }

      app.hook("page:finish", syncActiveTheme);

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemChange = () => {
        const currentMode = normalizeThemeMode(themeCookie.value);
        if (currentMode === "system") {
          applyThemeMode("system");
        }
      };

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", handleSystemChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(handleSystemChange);
      }
    });
  }

  app.vueApp.use(vuetify);
});
