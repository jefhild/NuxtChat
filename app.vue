<template>
  <v-app>
    <NuxtLoadingIndicator color="#4b9cff" :height="4" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>

<script setup></script>

<style>
.nuxt-loading-indicator {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 160px;
  height: 4px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  z-index: 3000;
}
</style>
