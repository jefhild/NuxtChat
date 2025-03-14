<template>
  <v-layout class="rounded rounded-md">
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