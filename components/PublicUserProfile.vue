<template>
  <section class="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
    <div class="mx-auto w-full max-w-4xl">
      <ProfileCard
        :profile="profile"
        :avatar-decoration="avatarDecoration"
        :photo-gallery-photos="photoGalleryPhotos"
        :photo-gallery-count="photoGalleryCount"
        :gallery-blurred="!canViewGallery"
        @likePhoto="handlePhotoVote"
      />

      <div
        v-if="isPublic && isAuthenticated"
        class="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2"
      >
        <NuxtLink :to="localPath('/settings')">{{
          $t("components.public-user-profile.back")
        }}</NuxtLink>
        <NuxtLink
          :to="localPath(`/chat?userslug=${profile?.slug}`)"
          rel="nofollow"
        >
          {{ $t("components.public-user-profile.chat") }}
          {{ localized.displayname }}
        </NuxtLink>
      </div>
      <div
        v-else-if="isPublic"
        class="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2"
      >
        <NuxtLink :to="localPath('/chat')">{{
          $t("components.public-user-profile.back-home")
        }}</NuxtLink>
        <NuxtLink :to="localPath('/chat')">{{
          $t("components.public-user-profile.back-chat")
        }}</NuxtLink>
      </div>
    </div>
  </section>

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

const resolveProfileAvatar = async (userId) => {
  if (!userId || !profile.value) return;
  try {
    const result = await $fetch("/api/profile/avatar-resolve", {
      query: { userId },
    });
    const avatarUrl = String(result?.avatarUrl || "");
    if (avatarUrl) {
      profile.value = {
        ...profile.value,
        avatar_url: avatarUrl,
      };
    }
  } catch (error) {
    console.warn("[public-profile] avatar resolve error:", error);
  }
};

const loadProfile = async () => {
  if (props.selectedUserSlug) {
    await fetchUserProfileFromSlug(props.selectedUserSlug);
  } else if (props.selectedUserId) {
    await fetchUserProfile(props.selectedUserId);
  }
  const resolvedId = profile.value?.user_id || profile.value?.id;
  if (resolvedId) {
    await resolveProfileAvatar(resolvedId);
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
