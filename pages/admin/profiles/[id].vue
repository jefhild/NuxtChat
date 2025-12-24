<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-btn
          variant="text"
          prepend-icon="mdi-arrow-left"
          :to="localPath('/admin')"
        >
          Back to Admin
        </v-btn>
      </v-col>
      <v-col cols="12">
        <v-alert
          v-if="loadError"
          type="error"
          variant="tonal"
          class="mb-4"
          border="start"
          border-color="red"
        >
          {{ loadError }}
        </v-alert>
        <LoadingContainer v-else-if="loading" text="Loading profile..." />
        <SettingsProfileForm
          v-else-if="userProfile"
          :userProfile="userProfile"
          :adminMode="true"
        />
        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mb-4"
          border="start"
          border-color="primary"
        >
          Profile not found.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();
const route = useRoute();
const { getUserProfileFromId } = useDb();

const userProfile = ref(null);
const loading = ref(true);
const loadError = ref("");

const fetchProfile = async () => {
  const userId = String(route.params.id || "");
  if (!userId) {
    loadError.value = "Missing profile id.";
    return;
  }

  try {
    const { data, error } = await getUserProfileFromId(userId);
    if (error) throw error;
    userProfile.value = data;
  } catch (error) {
    console.error("[admin][profile] load error", error);
    loadError.value =
      error?.message || "Unable to load the selected profile.";
  }
};

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    router.push(localPath("/"));
    return;
  }

  await fetchProfile();
  loading.value = false;
});
</script>
