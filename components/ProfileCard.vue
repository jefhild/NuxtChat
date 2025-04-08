<template>
  <v-card
    class="pa-2 mb-2 d-flex align-center"
    flat
    hover
    @click="goToProfile(profile.user_id)"
    style="cursor: pointer"
  >
    <!-- Avatar with overlaid icon -->
    <div class="avatar-wrapper mr-3">
      <NuxtImg
        :src="getProfileImage(profile.avatar_url, profile.gender_id)"
        width="50"
        height="50"
        class="rounded-circle"
      />
      <v-icon
        :color="getGenderColor(profile.gender_id)"
        :icon="getAvatarIcon(profile.gender_id)"
        size="17"
        class="icon-overlay"
      />
    </div>

    <!-- Info -->
    <div class="flex-grow-1">
      <div class="font-weight-medium text-truncate">
        <span class="text-medium-emphasis font-weight-medium">
          {{ profile.displayname }} ({{ profile.age }})
        </span>
      </div>
      <div class="text-body-2 text-truncate">
        {{ profile.country }} {{ profile.country_emoji }}
      </div>
    </div>

    <!-- Unupvote Icon -->
    <v-btn
      v-if="hideUnupvote"
      icon="mdi-block-helper"
      variant="plain"
      color="red"
      size="small"
      @click="$emit('unupvote', profile.profile_id)"
      class="ml-2"
    >
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
const router = useRouter();

import {
  getAvatar,
  getGenderColor,
  getAvatarIcon,
} from "@/composables/useUserUtils";

defineProps<{
  profile: any;
  hideUnupvote?: boolean;
}>();

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

const goToProfile = (userId: string) => {
  router.push(`/profiles/${userId}`);
};
</script>

<style scoped>
.avatar-wrapper {
  position: relative;
  width: 50px;
  height: 50px;
}

.icon-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-30%, -30%);
  background-color: white;
  border-radius: 9999px;
  padding: 2px;
}
</style>
