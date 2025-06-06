<template>
  <v-row justify="center" align="center" v-if="isLoading">
    <v-col cols="12" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-col>
  </v-row>

  <v-row justify="center" align="center" v-else>
    <v-col cols="12" class="text-center">
      <h1>{{ $t("pages.loginemail.welcome") }}</h1>
      <h2>{{ $t("pages.loginemail.choices") }}</h2>

      <v-row justify="center" align="center" class="mt-4">
        <v-col cols="auto">
          <v-btn color="primary" @click="getChatting">{{ $t("pages.loginemail.get-chatting") }}</v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" @click="goToSettings">{{ $t("pages.loginemail.profile") }}</v-btn>
        </v-col>
      </v-row>
    </v-col>
  </v-row>

</template>
<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);
const { getUserProfileFromId,  authGetUser, authRefreshSession } = useDb();
const localPath = useLocalePath();

onMounted(async () => {

  //try and refresh the sessio
  const { data: sessionData } = await authGetUser();

  if (!sessionData.session) {
    await authRefreshSession();
  }

  //check if user.id is present in the profiles table, if not go create account
  const { data: userProfileData } = await getUserProfileFromId(sessionData?.user?.id);

  if (!userProfileData) {
    console.log("user doesnt exist", sessionData?.user?.id);
    router.push(localPath("/"));
    return;
  }

  try {
    await authStore.checkAuthEmail();

    const user = authStore.user;

    if (user && user.id && authStore.userProfile?.provider !== "email")
    {
      const { updateProvider, updateUsername } = useDb();
      await updateProvider('email',user.id);
      await updateUsername(sessionData?.user?.email, user.id);
      
    }

    isLoading.value = false;

  } catch (error) {
    console.error("Inside catch error: ", error);
    // router.push("/");
  }
});

const goToSettings = () => {
  router.push(localPath("/settings"));
};

const getChatting = () =>
{
  router.push(localPath("/chat"));
};
</script>
