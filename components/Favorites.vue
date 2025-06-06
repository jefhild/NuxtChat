<template>
  <v-container>
    <v-row>
      <v-container>
        <v-row>
          <!-- Column 1: Favorited Profiles -->
          <v-col cols="12" md="6">
            <p class="text-center font-weight-medium my-2 text-h6">
              {{ $t("components.favorites.i-favorited") }}
            </p>
            <div v-if="favoriteProfiles.length > 0">
              <ProfileCard
                v-for="profile in favoriteProfiles"
                :key="profile.profile_id"
                :profile="profile"
                icon="mdi-star-outline"
                type="favorite"
                hide-un
                class="mb-2"
                @unfavorite="handleUnfavorite"
              />
            </div>
            <v-card v-else class="d-flex flex-column align-center">
              <v-card-title>{{ $t("components.favorites.no-favorites") }}</v-card-title>
            </v-card>
          </v-col>

          <!-- Column 2: Favorited Me -->
          <v-col cols="12" md="6">
            <p class="text-center font-weight-medium my-2 text-h6">
              {{ $t("components.favorites.favorited-me") }}
            </p>
            <div v-if="favoritedMeProfiles.length > 0">
              <ProfileCard
                v-for="profile in favoritedMeProfiles"
                :key="profile.profile_id"
                :profile="profile"
                icon="mdi-star-outline"
                type="favorite"
                class="mb-2"
                @unfavorite="handleUnfavorite"
              />
            </div>
            <v-card v-else class="d-flex flex-column align-center">
              <v-card-title>{{ $t("components.favorites.no-favorited-me") }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useFavorites } from "@/composables/useFavorites";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const { getAvatarDecorationFromId } = useDb();
const avatarDecorations = ref<Record<string, string>>({});

const props = defineProps<{ userId: string }>();

const { favoriteProfiles, favoritedMeProfiles, unfavoriteUser } = useFavorites(
  props.userId
);

watch(
  favoriteProfiles,
  async (newProfiles) => {
    console.log("New favorite profiles:", newProfiles);
    for (const profile of newProfiles) {
      if (!avatarDecorations.value[profile.user_id]) {
        const url = await getAvatarDecorationFromId(profile.user_id);
        avatarDecorations.value[profile.user_id] = url;
      }
    }
  },
  { immediate: true }
);

const handleUnfavorite = async (userId: string) => {
  console.log("Unfavoriting user:", userId);
  await unfavoriteUser(userId);
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
</style>
