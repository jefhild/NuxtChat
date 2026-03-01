import { computed } from "vue";

export function usePrimaryNavigation() {
  const { t } = useI18n();
  const localePath = useLocalePath();

  const primaryNavItems = computed(() => [
    {
      id: "chat",
      name: t("components.navbar.chat"),
      path: localePath("/chat"),
    },
    {
      id: "blog",
      name: t("components.navbar.blog"),
      path: localePath("/articles"),
    },
    {
      id: "feeds",
      name: t("components.navbar.feeds") || "Mood Feed",
      path: localePath("/feeds"),
    },
  ]);

  return {
    primaryNavItems,
  };
}
