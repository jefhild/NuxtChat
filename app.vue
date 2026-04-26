<template>
  <div class="app-root">
    <NuxtLoadingIndicator color="#4b9cff" :height="4" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup></script>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
  width: 100%;
}

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
