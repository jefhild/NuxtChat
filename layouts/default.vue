<template>
  <v-layout class="fill-height">
    <ClientOnly>
      <NavBar />
    </ClientOnly>
    <v-main class="d-flex flex-column">
      <slot />
      <Footer />
    </v-main>
  </v-layout>
</template>
<script setup></script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
