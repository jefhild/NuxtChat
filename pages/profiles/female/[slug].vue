<template>
  <PublicUserProfile :selectedUserSlug="slug" />
</template>

<script setup>
const { locale } = useI18n();
const route = useRoute();
const slug = route.params.slug;

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(slug);

// ✅ Define before it's used
const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

// ✅ Call composable AFTER the function is declared
useSeoI18nMeta("profiles.female", {
  dynamic: {
    title: profile.value?.displayname,
    description: getLimitedDescription(profile.value?.bio),
    ogTitle: profile.value?.displayname,
    ogDescription: getLimitedDescription(profile.value?.bio),
    ogImage: profile.value?.avatar_url,
    twitterTitle: profile.value?.displayname,
    twitterDescription: getLimitedDescription(profile.value?.bio),
    twitterImage: profile.value?.avatar_url,
  },
});
</script>