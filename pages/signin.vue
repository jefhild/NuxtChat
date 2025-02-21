<template>
  <v-container fluid>
    <HomeRow1 />
    <div v-if="!isAuthenticated">
      <!-- <HomeRow2 /> -->
      <HomeMain />
    </div>
    <div v-else>
      <v-fade-transition mode="out-in">
        <v-container
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center d-flex flex-column align-center">
              <h1 class="green--text-h1">You're already logged in</h1>
              <h2 class="text-h6">Where would you like to go?</h2>
              <v-row
                ><v-col>
                  <v-btn to="/chat" class="mt-4"
                    >Chat <v-icon right>mdi-arrow-right</v-icon></v-btn
                  ></v-col
                ><v-col>
                  <v-btn to="/settings" class="mt-4"
                    >Settings <v-icon right>mdi-arrow-right</v-icon></v-btn
                  ></v-col
                ></v-row
              >
            </v-col>
          </v-row>
        </v-container>
      </v-fade-transition>
    </div>

    <!-- <SignIn /> -->
  </v-container>
</template>
<script setup>
import { useAuthStore } from "@/stores/authStore";

// Track the current step
const authStore = useAuthStore();
const isAuthenticated = ref(false);
const isLoading = ref(false);
isLoading.value = true; // Set loading to true initially
await authStore.checkAuth();
// console.log("User:", authStore.user); // Debug to see if the user is correctly fetched
isAuthenticated.value = authStore.user !== null;

isLoading.value = false;
</script>
