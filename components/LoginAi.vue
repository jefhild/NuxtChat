<template>
  <v-container class="fill-height d-flex align-center justify-center text-center">
    <v-row class="py-15 d-flex align-center justify-center text-center">
      <v-col cols="6">
        <h1 class="text-h2 font-weight-bold">NuxtChat</h1>
        <h2 class="text-title-1">A free anonymous chat platform</h2>
        <p class="text-subtitle-1 text-grey-darken-1">Chat with AI personas</p>
      </v-col>

      <v-col cols="6">
        <DialogAiSignUp />
      </v-col>
    </v-row>

    <v-row class="py-10 align-center justify-center">
      <v-col cols="7">
        <h1 class="text-h3 font-weight-bold">Chat with an AI persona</h1>
      </v-col>
      <v-col cols="5">
        <v-carousel :show-arrows="false" hide-controls hide-delimiters cycle="true" interval="2000">
          <v-carousel-item v-for="(item,i) in items" :key="i" :src="item.src"
            transition="scale-transition"></v-carousel-item>
        </v-carousel>
      </v-col>
    </v-row>
  </v-container>
</template>


<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity
const errorMessages = ref([]);
const aiDialog = ref(false);

const items = [
  { src: "/images/avatars/ai/santa.jpg" },
  { src: "/images/avatars/ai/HarryPotter.png" },
  { src: "/images/avatars/ai/DonaldTrump.png" },
];

const updateFormValidity = () => {
  isFormValid.value = isAgeConfirmed.value;
};

function handleDialogClose() {
  // console.log('Dialog closed!');
  aiDialog.value = false;
}

const handleAILogin = async () => {
  errorMessages.value = []; // Clear previous error messages

  try {
    // await authStore.checkAuthGoogle();
    aiDialog.value = true;
    // console.log("AI login clicked");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

// Ensure initial form validity state is set correctly
updateFormValidity();
</script>

<style scoped>
@keyframes scroll {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-100%);
  }
}

.carousel {
  display: flex;
  overflow: hidden;
  white-space: nowrap;
}

.carousel .v-slide-group__content {
  display: flex;
  animation: scroll 10s linear infinite;
  /* Adjust speed */
}

.carousel-item {
  width: 200px;
  height: 150px;
  margin: 0 10px;
  flex-shrink: 0;
}
</style>