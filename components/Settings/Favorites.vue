<template>
  <div class="w-full px-2 sm:px-3 lg:px-4">
    <div v-if="isLoading" class="mt-4 flex justify-center">
      <span class="settings-spinner" aria-hidden="true" />
    </div>
    <div v-else class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <section class="settings-list-panel rounded-2xl p-4 sm:p-5">
        <p class="mb-4 text-base font-medium sm:text-lg">
          {{ $t("components.favorites.i-favorited") }}
        </p>
        <div v-if="favoriteProfiles.length > 0" class="space-y-2">
          <SettingsProfileCard
            v-for="profile in favoriteProfiles"
            :key="profile.profile_id"
            :profile="profile"
            icon="mdi-heart-outline"
            type="favorite"
            hide-un
            @unfavorite="handleUnfavorite"
          />
        </div>
        <div v-else class="settings-empty-card flex min-h-28 items-center justify-center px-4 text-center">
          <p>{{ $t("components.favorites.no-favorites") }}</p>
        </div>
      </section>

      <section class="settings-list-panel rounded-2xl p-4 sm:p-5">
        <p class="mb-4 text-base font-medium sm:text-lg">
          {{ $t("components.favorites.favorited-me") }}
        </p>
        <div v-if="favoritedMeProfiles.length > 0" class="space-y-2">
          <SettingsProfileCard
            v-for="profile in favoritedMeProfiles"
            :key="profile.profile_id"
            :profile="profile"
            icon="mdi-heart-outline"
            type="favorite"
            @unfavorite="handleUnfavorite"
          />
        </div>
        <div v-else class="settings-empty-card flex min-h-28 items-center justify-center px-4 text-center">
          <p>{{ $t("components.favorites.no-favorited-me") }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useFavorites } from "@/composables/useFavorites";
import { useI18n } from "vue-i18n";
import { ref, onMounted } from "vue";
import { useDb } from "@/composables/useDB";

const { t } = useI18n();
const props = defineProps(["userId"]);

const { getAvatarDecorationFromId } = useDb();
const avatarDecorations = ref({});

const isLoading = ref(true);

const {
  favoriteProfiles,
  favoritedMeProfiles,
  unfavoriteUser,
  fetchFavorites,
} = useFavorites(props.userId);

const loadFavorites = async () => {
  isLoading.value = true;
  await fetchFavorites();

  const decorate = async (profiles) => {
    for (const profile of profiles) {
      if (!avatarDecorations.value[profile.user_id]) {
        const url = await getAvatarDecorationFromId(profile.user_id);
        avatarDecorations.value[profile.user_id] = url;
      }
    }
  };

  await Promise.all([
    decorate(favoriteProfiles.value),
    decorate(favoritedMeProfiles.value),
  ]);

  isLoading.value = false;
};

onMounted(() => {
  loadFavorites();
});

const handleUnfavorite = async (userId) => {
  console.log("Unfavoriting user:", userId);
  await unfavoriteUser(userId);
  await loadFavorites();
};
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.avatar-wrapper {
  position: relative;
}

.avatar-decoration {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 241px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.settings-list-panel {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.88);
}

.settings-empty-card {
  border: 1px solid rgb(var(--color-border) / 0.64);
  background: rgb(var(--color-surface));
  border-radius: 12px;
  color: rgb(var(--color-foreground) / 0.72);
}

.settings-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgb(var(--color-primary) / 0.2);
  border-right-color: rgb(var(--color-primary));
  border-radius: 999px;
  animation: settings-spin 0.7s linear infinite;
}

@keyframes settings-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
