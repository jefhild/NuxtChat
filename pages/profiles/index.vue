<template>
  <v-container fluid>
    <HomeRow1 />
    <v-row>
      <v-col cols="12">
        <!-- Page Title -->
        <div class="d-flex justify-center mt-4">
          <h1>{{ $t("pages.profiles.index.title") }}</h1>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <NewsContainer />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
useSeoI18nMeta("profiles.index");

onMounted(async () => {
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
});
</script>
