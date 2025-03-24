<template>
  <v-container>
    <v-row class="mt-3 mb-3">
      <v-col cols="12" sm="4" order="1" order-sm="1">
        <v-row no-gutters>
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
                      @click="switchModel('LoginGoogle')"
                    >
                      <h2 class="green--text-h2">With Google</h2>
                    </v-btn></v-col
                  ></v-row
                >
                <v-row no-gutters
                  ><v-col>
                    <!-- <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="selectedModel = 'LoginFacebook'"
                    >
                      <h2 class="green--text-h2">With Facebook</h2>
                    </v-btn> -->
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="switchModel('LoginFacebook')"
                    >
                      <h2 class="green--text-h2">With Facebook</h2>
                    </v-btn>
                  </v-col></v-row
                >
                <v-row no-gutters
                  ><v-col>
                    <v-btn
                      class="text-blue"
                      variant="plain"
                      @click="switchModel('LoginEmail')"
                    >
                      <h2 class="green--text-h2">With Email</h2>
                    </v-btn></v-col
                  ></v-row
                >
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <!-- Second Column: Main Content -->
      <v-col cols="12" sm="8" order="2" order-sm="2">
        <!-- <v-card>
          <v-card-text>
            <LoginContainer :selectedModel="selectedModel" />
          </v-card-text>
        </v-card> -->
        <v-card :class="{ 'highlight-card': highlight }">
          <v-card-text>
            <LoginContainer :selectedModel="selectedModel" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useOnlineRowCount } from "@/composables/useOnlineRowCount";

const { rowCount, getOnlineRowCount } = useOnlineRowCount();
const highlight = ref(false);

const selectedModel = ref("LoginGoogle");

const fetchOnlineRowCount = () => {
  getOnlineRowCount();
};

const switchModel = (model) => {
  selectedModel.value = model;
  // Trigger highlight
  highlight.value = false;
  requestAnimationFrame(() => {
    highlight.value = true;
  });
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

.highlight-card {
  animation: pulse-highlight 0.4s ease;
}

@keyframes pulse-highlight {
  0% {
    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 10px rgba(51, 90, 78, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
    transform: scale(1);
  }
}
</style>
