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
      id: "languagePractice",
      name: t("components.navbar.languagePractice"),
      path: localePath("/language-practice"),
    },
    {
      id: "topics",
      name: t("components.footer.topics") || "Topics",
      path: localePath("/topics"),
    },
    {
      id: "guides",
      name: t("components.footer.guides") || "Guides",
      path: localePath("/guides"),
    },
    {
      id: "compare",
      name: t("components.footer.compare") || "Compare",
      path: localePath("/compare"),
    },
  ]);

  return {
    primaryNavItems,
  };
}
