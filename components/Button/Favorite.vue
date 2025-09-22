<template>
  <!-- {{ authStore.user.id }} {{ props.profile.id }} -->

  <v-btn
    :color="isFavorite ? 'red darken-2' : 'red medium-emphasis'"
    :icon="isFavorite ? 'mdi-star' : 'mdi-star-outline'"
    size="small"
    @click="handleFavoriteToggle"
  ></v-btn>

  <v-dialog v-model="loginDialog" max-width="400">
    <template #default>
      <v-card>
        <v-card-title>{{ $t("components.button-favorite.please-log-in") }}</v-card-title>
        <v-card-text
          >{{ $t("components.button-favorite.need-log-in") }}</v-card-text
        >
        <v-card-actions>
          <v-btn color="primary" @click="redirectToLogin">{{ $t("components.button-favorite.log-in") }}</v-btn>
          <v-btn text @click="loginDialog = false">{{ $t("components.button-favorite.cancel") }}</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1"; 
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const { getCountUserFavorites, deleteFavorite, insertFavorite } = useDb();

// Initialize stores and utilities
const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();
// Props
const props = defineProps({
  profile: Object,
});

// Reactive state
const isAuthenticated = ref(false);
const isFavorite = ref(false);
const loginDialog = ref(false);
const isLoading = ref(true);

// Determine if the user is authenticated
const checkAuthStatus = () => {
  isAuthenticated.value = !!authStore.user;
};

// Fetch favorite status for the profile
const fetchFavoriteStatus = async () => {
  if (isAuthenticated.value && props.profile) {

    const count = await getCountUserFavorites(authStore.user.id,props.profile.user_id);
    isFavorite.value = count > 0;
    // console.log("Favorite status:", isFavorite.value);

  } else {
    console.log("User not authenticated or profile missing");
  }
};

// Handle the favorite toggle
const handleFavoriteToggle = async () => {
  if (!isAuthenticated.value) {
    // console.log("User not authenticated");
    loginDialog.value = true;
  } else {
    if (isFavorite.value) {
      await deleteFavorite(authStore.user.id, props.profile.user_id);
    } else {
      console.log("Adding favorite");

      await insertFavorite(authStore.user.id, props.profile.user_id);
    }
    isFavorite.value = !isFavorite.value;
  }
};

// Redirect to login
const redirectToLogin = () => {
  router.push(localPath("/signin1"));
};

// Run on component mount
onMounted(async () => {
  await authStore.checkAuth(); // Ensure this checks and sets authStore.user
  checkAuthStatus();
  await fetchFavoriteStatus();
  isLoading.value = false;
});
</script>
