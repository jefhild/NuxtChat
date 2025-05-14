<template>
  <PublicUserProfile :selectedUserSlug="slug" />
</template>

<script setup>
const route = useRoute();
const slug = route.params.slug;

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(slug);

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com" + "/profiles/" + profile.value.gender.toLowerCase() + "/" + profile.value.slug,
    },
  ],
}));

const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

useSeoMeta({
  title: profile.value?.displayname || "Default Title",
  description: getLimitedDescription(
    profile.value?.bio || "Default Description"
  ),
  ogTitle: profile.value?.displayname,
  ogDescription: getLimitedDescription(
    profile.value?.bio || "Default Description"
  ),
  ogImage: profile.value?.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: profile.value?.displayname,
  twitterDescription: getLimitedDescription(
    profile.value?.bio || "Default Description"
  ),
  twitterImage: profile.value?.avatar_url,
});

// useSeoMeta({
//   title: profile.value?.displayname || "Default Title",
//   description: profile.value?.bio || "Default Description",
//   ogTitle: profile.value?.displayname,
//   ogDescription: profile.value?.bio,
//   ogImage: profile.value?.avatar_url,
//   twitterCard: "summary_large_image",
//   twitterTitle: profile.value?.displayname,
//   twitterDescription: profile.value?.bio,
//   twitterImage: profile.value?.avatar_url,
// });
</script>