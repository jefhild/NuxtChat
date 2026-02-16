// import this after install `@mdi/font` package
import "@mdi/font/css/materialdesignicons.css";

import "vuetify/styles";
import { createVuetify } from "vuetify";

export default defineNuxtPlugin((app) => {
  const THEME_COOKIE_KEY = "imchatty_theme";
  const normalizeThemeMode = (value) =>
    value === "dark" || value === "light" || value === "system"
      ? value
      : "system";
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
  const initialMode = normalizeThemeMode(themeCookie.value);
  const initialTheme =
    initialMode === "system" ? resolveSystemTheme() : initialMode;

  const vuetify = createVuetify({
    defaults: {
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

    if (typeof vuetify.theme.change === "function") {
      vuetify.theme.change(themeName);
    } else if (typeof vuetify.theme.global.change === "function") {
      vuetify.theme.global.change(themeName);
    }
    if (import.meta.client) {
      document.documentElement.style.colorScheme = themeName;
    }
    themeCookie.value = normalizedMode;
  };

  if (import.meta.client) {
    app.hook("app:mounted", () => {
      applyThemeMode(initialMode);

      // First visit: no cookie yet. Persist "system" mode by default.
      if (!themeCookie.value) {
        themeCookie.value = "system";
      }

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
