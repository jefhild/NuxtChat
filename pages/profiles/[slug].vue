<template>
  <PublicUserProfile :selectedUserSlug="slug" />
</template>

<script setup>
import { computed } from "vue";
import { shouldIndexProfile } from "@/composables/useIndexability";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const { locale } = useI18n();
const localPath = useLocalePath();
const route = useRoute();
const slug = route.params.slug;

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(slug);

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: "Profile not found" });
}

const requestedSlug = String(slug || "").trim().toLowerCase();
const canonicalSlug = String(profile.value?.slug || "")
  .trim()
  .toLowerCase();
const canonicalGender = String(profile.value?.gender || "")
  .trim()
  .toLowerCase();
const canonicalRoute =
  canonicalGender === "male" || canonicalGender === "female" || canonicalGender === "other"
    ? `/profiles/${canonicalGender}/${canonicalSlug}`
    : `/profiles/${canonicalSlug}`;
if (canonicalSlug && canonicalSlug !== requestedSlug) {
  await navigateTo(localPath(canonicalRoute), { redirectCode: 301 });
}

const localized = computed(() =>
  resolveProfileLocalization({
    profile: profile.value,
    readerLocale: locale?.value,
  })
);

// ✅ Define before it's used
const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;
const shouldIndex = computed(() => shouldIndexProfile(profile.value));

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
    ogType: "profile",
  },
});

useHead(() => ({
  meta: shouldIndex.value ? [] : [{ name: "robots", content: "noindex, nofollow" }],
}));
</script>
