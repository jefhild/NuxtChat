<template>
  <v-container v-if="!isLoading" fluid>
    <HomeRow1 />
    <v-row>
      <v-col>
        <SettingsContainer/>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);

const { getUserProfileFromId } = useDb();

onMounted(async () =>
{
  const { data: userProfileData } = await getUserProfileFromId(authStore.user?.id);

  if (!userProfileData)
  {
    router.push("/"); // Redirect to home page
    return;
  }

  isLoading.value = false;
});
</script>