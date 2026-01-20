<template>
  <PublicUserProfile :selectedUserSlug="slug" />
</template>

<script setup>
import { computed } from "vue";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const { locale } = useI18n();
const route = useRoute();
const slug = route.params.slug;

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(slug);

const localized = computed(() =>
  resolveProfileLocalization({
    profile: profile.value,
    readerLocale: locale?.value,
  })
);

// ✅ Define before it's used
const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

// ✅ Call composable AFTER the function is declared
useSeoI18nMeta("profiles.index", {
  dynamic: {
    title: localized.value?.displayname,
    description: getLimitedDescription(localized.value?.bio),
    ogTitle: localized.value?.displayname,
    ogDescription: getLimitedDescription(localized.value?.bio),
    ogImage: profile.value?.avatar_url,
    twitterTitle: localized.value?.displayname,
    twitterDescription: getLimitedDescription(localized.value?.bio),
    twitterImage: profile.value?.avatar_url,
  },
});
</script>
