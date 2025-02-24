<template>
  <v-layout class="rounded rounded-md">
    <NavBar />
    <v-main>
      <slot />
      <Footer />
    </v-main>
  </v-layout>
</template>
<script setup></script>