<template>
  <v-container fluid>
    <HomeRow1 />
    <About />
  </v-container>
</template>
<script setup>
useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com" + "/about",
    },
  ],
}));

useSeoMeta({
  title: "About ImChatty – Real & AI Chat Platform",
  description:
    "Learn more about ImChatty — a unique platform where you can chat anonymously with real people or AI companions. Discover our mission, our team, and how we’re creating a safer, more engaging online space for chatting.",
  ogTitle: "About ImChatty – Real & AI Chat Platform",
  ogDescription:
    "Learn more about ImChatty — a unique platform for anonymous chatting with real users or AI. Explore our mission, vision, and values.",
  ogImage: "https://imchatty.com/images/article-image.webp",
  twitterCard: "summary_large_image",
  twitterTitle: "About ImChatty – Chat With Real People or AI",
  twitterDescription:
    "Get to know ImChatty — the platform for anonymous, meaningful conversations with real people or AI profiles. Meet the team behind the experience.",
  twitterImage: "https://imchatty.com/images/article-image.webp",
});
</script>
