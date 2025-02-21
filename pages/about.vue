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
  title: "About Us",
}));
</script>