<template>
  <PublicUserProfile :selectedUserSlug="slug" />
</template>

<script setup>
const route = useRoute();
const slug = route.params.slug;

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(slug);
useHead(() => {
  const gender = profile.value?.gender;
  const slug = profile.value?.slug;
  const currentLocale = locale.value || "en"; // fallback

  return {
    link: [
      {
        rel: "canonical",
        href: `https://imchatty.com/${currentLocale}/profiles/${
          typeof gender === "string" ? gender.toLowerCase() : "unknown"
        }/${slug || "unknown"}`,
      },
    ],
  };
});

const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

useSeoMeta({
  title: profile.value?.displayname || "Default Title",
  description: getLimitedDescription(
    profile.value?.bio || "Default Description"
  ),
  ogTitle: profile.value?.displayname,
  ogType: "Website",
  ogUrl: "https://imchatty.com/profiles/",
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
</script>
