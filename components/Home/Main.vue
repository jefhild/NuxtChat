<template>
  <v-container>
    <v-row class="mt-3 mb-3">
      <!-- First Column: Hidden on small screens, shown on md and up -->
      <v-col cols="12" sm="4" order="1" order-sm="1">
        <!-- Single v-row to stack the row count and card without unnecessary spacing -->
        <v-row no-gutters>
          <!-- The v-card directly under the row count -->
          <v-col>
            <p class="text-center green-text-poppins mb-2">
              {{ rowCount }} users online
            </p>
            <v-card>
              <v-card-title
                ><h1 class="green--text-h1">Sign In</h1></v-card-title
              >
              <v-card-text>
                <v-row no-gutters
                  ><v-col>
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="selectedModel = 'LoginAi'"
                    >
                      <h2 class="green--text-h2">With AI</h2></v-btn
                    ></v-col
                  ></v-row
                >
                <v-row no-gutters
                  ><v-col>
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="selectedModel = 'LoginGoogle'"
                    >
                      <h2 class="green--text-h2">With Google</h2>
                    </v-btn></v-col
                  ></v-row
                >
                <v-row no-gutters
                  ><v-col>
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="selectedModel = 'LoginFacebook'"
                    >
                      <h2 class="green--text-h2">With Facebook</h2>
                    </v-btn></v-col
                  ></v-row
                >
                <v-row no-gutters
                  ><v-col>
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="selectedModel = 'LoginEmail'"
                    >
                      <h2 class="green--text-h2">With Email</h2></v-btn
                    ></v-col
                  ></v-row
                >
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <!-- Dropdown for small screens -->
      <!-- <v-col cols="4" class="d-flex d-md-none">
        <v-row align="center">
          <v-col>
            <v-select
              v-model="selectedModel"
              :items="dropdownOptions"
              item-title="text"
              item-value="value"
              label="Login Options"
              variant="underlined"
              class="ml-3"
              @change="handleLoginSelection" /></v-col
        ></v-row>
      </v-col> -->

      <!-- Second Column: Main Content -->
      <v-col cols="12" sm="8" order="2" order-sm="2">
        <v-card>
          <!-- <v-card-title class="d-none d-md-flex">{{
            selectedPhrase
          }}</v-card-title> -->
          <v-card-text>
            <LoginContainer :selectedModel="selectedModel" />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Third Column: Hidden on small screens, shown on md and up -->
      <!-- <v-col cols="auto" md="4" lg="3" class="d-none d-md-flex">
        <v-sheet>
          <v-row>
            <v-col class="text-center">
              <h1 class="green--text-h1">
                <span class="imchattyLogo">imchatty</span> is a free chat site
                and app that lets you connect with people all over the world.
              </h1>
            </v-col>
          </v-row>
        </v-sheet>
      </v-col> -->
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useOnlineRowCount } from "@/composables/useOnlineRowCount";

const { rowCount, getOnlineRowCount } = useOnlineRowCount();

const authStore = useAuthStore();

const selectedModel = ref("LoginGoogle");
const modelPhrases = {
  // LoginAnony: "Anonymously",
  LoginGoogle: "With Google",
  LoginFacebook: "With Facebook",
  LoginEmail: "With Email",
  LoginAi: "With AI",
};

const fetchOnlineRowCount = () => {
  getOnlineRowCount();
};

onMounted(() => {
  fetchOnlineRowCount();
});
</script>

<style scoped>
.image-shadow {
  box-shadow: 0 4px 6px rgb(186, 214, 174); /* Adjust the shadow here */
}

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

.green-text-poppins {
  font-family: "poppins", sans-serif;
  color: rgb(51, 90, 78);
}

.green--text-h2 {
  font-family: "poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 500;
  color: rgb(51, 90, 78);
}
</style>
