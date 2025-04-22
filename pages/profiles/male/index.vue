<template>
  <v-container fluid>
    <HomeRow1 />
        <!-- Display the loading spinner if the page is loading -->
    <v-row justify="center" align="center" v-if="isLoading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Conditional rendering based on authentication status -->
    <v-row v-else>
      <!-- If the user is authenticated -->
      <template v-if="isAuthenticated">
        <v-col cols="12">
          <v-row>
            <v-col class="green--text-h1 text-center mt-3">
              You're signed in! Enjoy free anonymous chat.</v-col
            >
          </v-row>
          <v-row>
            <v-col class="text-center">
              <v-btn to="/chat" color="purple">Keep Chatting</v-btn>
            </v-col>
          </v-row>
          <NewsContainer />
        </v-col>
      </template>

      <!-- If the user is not authenticated -->
      <template v-else>
        <HomeMain />
        <MoreMale />
      </template>
    </v-row>

  </v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const isLoading = ref(false);

onMounted(async () =>
{
  isLoading.value = true;
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;
});
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.imchattyLogo {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgb(80, 51, 90);
}
</style>
