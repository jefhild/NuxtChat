export default defineNuxtPlugin((nuxtApp) => {
  const { mode, resolvedTheme, applyThemeMode } = useAppTheme();

  useHead({
    htmlAttrs: computed(() => ({
      class: resolvedTheme.value === "dark" ? "dark" : undefined,
      "data-imchatty-theme": resolvedTheme.value,
      style: `color-scheme: ${resolvedTheme.value};`,
    })),
  });

  if (import.meta.client) {
    applyThemeMode(mode.value || "system");

    onNuxtReady(() => {
      applyThemeMode(mode.value || "system");

      if (!mode.value) {
        applyThemeMode("system");
      }

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemChange = () => {
        if (mode.value === "system") {
          applyThemeMode("system");
        }
      };

      nuxtApp.hook("page:finish", () => {
        applyThemeMode(mode.value || "system");
      });

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", handleSystemChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(handleSystemChange);
      }
    });
  }
});
