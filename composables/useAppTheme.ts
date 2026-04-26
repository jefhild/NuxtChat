const THEME_COOKIE_KEY = "imchatty_theme";
const RESOLVED_THEME_COOKIE_KEY = "imchatty_theme_resolved";

export const normalizeThemeMode = (value?: string | null) =>
  value === "dark" || value === "light" || value === "system"
    ? value
    : "system";

export const normalizeResolvedTheme = (value?: string | null) =>
  value === "dark" || value === "light" ? value : null;

export const resolveSystemTheme = () => {
  if (import.meta.client) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

export const resolveThemeName = (mode?: string | null) => {
  const normalizedMode = normalizeThemeMode(mode);
  return normalizedMode === "system" ? resolveSystemTheme() : normalizedMode;
};

const applyThemeDomState = (themeName: "light" | "dark") => {
  if (!import.meta.client) return;

  const root = document.documentElement;
  root.style.colorScheme = themeName;
  root.dataset.imchattyTheme = themeName;
  root.classList.toggle("dark", themeName === "dark");
};

export const useAppTheme = () => {
  const themeCookie = useCookie<string>(THEME_COOKIE_KEY, {
    sameSite: "lax",
    path: "/",
  });
  const resolvedThemeCookie = useCookie<string | null>(RESOLVED_THEME_COOKIE_KEY, {
    sameSite: "lax",
    path: "/",
  });

  const mode = useState<string>("app-theme-mode", () =>
    normalizeThemeMode(themeCookie.value)
  );
  const resolvedTheme = useState<"light" | "dark">("app-theme-resolved", () => {
    const normalizedMode = normalizeThemeMode(themeCookie.value);
    if (normalizedMode === "light" || normalizedMode === "dark") {
      return normalizedMode;
    }
    return normalizeResolvedTheme(resolvedThemeCookie.value) || "light";
  });

  const applyThemeMode = (nextMode?: string | null) => {
    const normalizedMode = normalizeThemeMode(nextMode);
    const nextThemeName = resolveThemeName(normalizedMode) as "light" | "dark";

    mode.value = normalizedMode;
    resolvedTheme.value = nextThemeName;
    themeCookie.value = normalizedMode;
    resolvedThemeCookie.value = nextThemeName;
    applyThemeDomState(nextThemeName);

    return nextThemeName;
  };

  return {
    mode,
    resolvedTheme,
    themeCookie,
    resolvedThemeCookie,
    applyThemeMode,
  };
};
