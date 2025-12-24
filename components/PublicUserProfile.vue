<template>
  <v-container fluid>
    <!-- {{ profile }} -->
    <v-row justify="center">
      <v-col cols="12" md="8">
        <ProfileCard :profile="profile" :avatar-decoration="avatarDecoration" />

        <v-container v-if="isPublic">
          <v-row class="mt-2" justify="center" v-if="isAuthenticated"
            ><v-col cols="auto">
              <NuxtLink :to="localPath('/settings')">{{
                $t("components.public-user-profile.back")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath(`/chat?userslug=${profile?.slug}`)">
                {{ $t("components.public-user-profile.chat") }}
                {{ profile?.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
          <v-row class="mt-2" justify="center" v-else>
                        <v-col cols="auto">
              <NuxtLink :to="localPath('/chat')">{{
                $t("components.public-user-profile.back-home")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath('/chat')">{{
                $t("components.public-user-profile.back-chat")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath('/chat?userslug=imchatty')">
                {{ $t("components.public-user-profile.chat") }}
                {{ profile?.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
        </v-container>
      </v-col>
    </v-row>
  </v-container>

</template>

<script setup>
const localPath = useLocalePath();
import { useAuthStore } from "@/stores/authStore1";
import { useUserProfile } from "@/composables/useUserProfile";
import ProfileCard from "@/components/ProfileCard.vue";

const props = defineProps({
  selectedUserSlug: String,
  selectedUserId: String,
  isPublic: {
    type: Boolean,
    default: true,
  },
});

const authStore = useAuthStore();

const { profile, fetchUserProfileFromSlug, fetchUserProfile } =
  useUserProfile();

const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");

const loadProfile = async () => {
  if (props.selectedUserSlug) {
    await fetchUserProfileFromSlug(props.selectedUserSlug);
    return;
  }
  if (props.selectedUserId) {
    await fetchUserProfile(props.selectedUserId);
  }
};

await loadProfile();

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const isLoading = ref(true);

onMounted(async () => {
  await authStore.checkAuth();
  // isAuthenticated.value = ["anon_authenticated", "authenticated"].includes(
  //   authStore.authStatus
  // );
  isLoading.value = false;
});

watch(
  () => [props.selectedUserSlug, props.selectedUserId],
  () => {
    loadProfile();
  }
);

watch(
  () => profile.value?.user_id,
  async (userId) => {
    avatarDecoration.value = userId
      ? await getAvatarDecorationFromId(userId)
      : "";
  },
  { immediate: true }
);
</script>
