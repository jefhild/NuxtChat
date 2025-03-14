<template>
  <v-layout>
    <ClientOnly>
      <NavBar />
    </ClientOnly>
    <v-main>
      <slot />
      <Footer />
    </v-main>
  </v-layout>
</template>
<script setup></script>

<style scoped>

</style>