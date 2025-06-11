// composables/useSeoI18nMeta.ts
import { useI18n } from "vue-i18n";
import { useHead, useRequestURL } from "#imports";

export function useSeoI18nMeta(section: string) {
  const { t } = useI18n();
  const url = useRequestURL();

  const key = (suffix: string) => `pages.${section}.meta.${suffix}`;
  const tf = (suffix: string) =>
    t(key(suffix)) || t(key(suffix), { locale: "en" });

  useHead(() => ({
    title: tf("title"),
    link: [
      {
        rel: "canonical",
        href: `${url.origin}${url.pathname}`,
      },
    ],
    meta: [
      { name: "description", content: tf("description") },
      { property: "og:title", content: tf("ogTitle") },
      { property: "og:description", content: tf("ogDescription") },
      { property: "og:type", content: tf("ogType") },
      { property: "og:url", content: tf("ogUrl") },
      { property: "og:image", content: tf("ogImage") },
      { name: "twitter:card", content: tf("twitterCard") },
      { name: "twitter:title", content: tf("twitterTitle") },
      { name: "twitter:description", content: tf("twitterDescription") },
      { name: "twitter:image", content: tf("twitterImage") },
    ],
  }));
}
