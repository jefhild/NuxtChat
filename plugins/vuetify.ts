// import this after install `@mdi/font` package
import "@mdi/font/css/materialdesignicons.css";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import { onNuxtReady } from "#app";

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
  // Keep first render deterministic across SSR/static HTML and client hydration.
  // Apply the persisted mode after mount.
  const initialTheme = "light";

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
    onNuxtReady(() => {
      // Apply persisted/system theme only when Nuxt is fully ready so
      // async component hydration has already settled.
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
