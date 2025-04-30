<template>
  <v-container fluid>
    <HomeRow1 />
    <FreeChat />
  </v-container>
</template>
<script setup>
useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/freechat",
    },
  ],
}));
useSeoMeta({
  title: "Who's Online Now – Active Users on ImChatty",
  description:
    "See who’s online right now on ImChatty! Browse real profiles currently active and start a conversation instantly with real or AI chat partners.",
  ogTitle: "Active Chat Users – Real-Time Connections",
  ogDescription:
    "Looking for someone to talk to? Explore the list of active users currently online on ImChatty and start a chat with real people or AI anytime.",
  ogImage: "https://imchatty.com/images/article-image.webp",
  twitterCard: "summary_large_image",
  twitterTitle: "Who's Online Now – Chat with Active Users",
  twitterDescription:
    "Check out who’s currently online and ready to chat on ImChatty. Real people and AI companions available for instant, anonymous conversations.",
  twitterImage: "https://imchatty.com/images/article-image.webp",
});
</script>
