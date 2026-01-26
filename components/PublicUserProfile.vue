<template>
  <v-container fluid>
    <!-- {{ profile }} -->
    <v-row justify="center">
      <v-col cols="12" md="8">
        <ProfileCard
          :profile="profile"
          :avatar-decoration="avatarDecoration"
          :photo-gallery-photos="photoGalleryPhotos"
          :photo-gallery-count="photoGalleryCount"
          :gallery-blurred="!canViewGallery"
          @likePhoto="handlePhotoVote"
        />

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
                {{ localized.displayname }}
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
                {{ localized.displayname }}
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
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

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

const { t, locale } = useI18n();
const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");
const photoGalleryPhotos = ref([]);
const photoGalleryCount = ref(0);

const loadProfile = async () => {
  if (props.selectedUserSlug) {
    await fetchUserProfileFromSlug(props.selectedUserSlug);
    return;
  }
  if (props.selectedUserId) {
    await fetchUserProfile(props.selectedUserId);
  }
};

const loadPhotoGallery = async (userId) => {
  if (!userId) {
    photoGalleryPhotos.value = [];
    photoGalleryCount.value = 0;
    return;
  }
  try {
    const res = await $fetch("/api/profile/photos-public", {
      query: { userId },
    });
    photoGalleryPhotos.value = Array.isArray(res?.photos) ? res.photos : [];
    photoGalleryCount.value = Number(res?.count || 0);
  } catch (error) {
    console.warn("[public-profile] gallery load error:", error);
    photoGalleryPhotos.value = [];
    photoGalleryCount.value = 0;
  }
};

const handlePhotoVote = async (photo) => {
  if (!photo?.id || !canViewGallery.value) return;
  try {
    const res = await $fetch("/api/votes/profile-photo", {
      method: "POST",
      body: { photoId: photo.id, value: 1 },
    });
    photoGalleryPhotos.value = photoGalleryPhotos.value.map((item) =>
      item.id === photo.id
        ? {
            ...item,
            upvotes: Number(res?.upvotes ?? item.upvotes ?? 0),
            myVote: Number(res?.userVote ?? item.myVote ?? 0),
          }
        : item
    );
  } catch (error) {
    console.error("[public-profile] photo vote failed:", error);
  }
};

await loadProfile();

const localized = computed(() =>
  resolveProfileLocalization({
    profile: profile.value,
    readerLocale: locale?.value,
  })
);

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const canViewGallery = computed(() => authStore.authStatus === "authenticated");
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
  () => [profile.value?.user_id, profile.value?.id, isAuthenticated.value],
  async ([userId, fallbackId]) => {
    const resolvedId = userId || fallbackId;
    avatarDecoration.value = resolvedId
      ? await getAvatarDecorationFromId(resolvedId)
      : "";
    await loadPhotoGallery(resolvedId);
  },
  { immediate: true }
);
</script>
