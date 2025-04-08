<template>
  <v-card class="pa-2 mb-2 d-flex align-center" flat>
    <!-- Avatar -->
    <NuxtImg
      :src="getProfileImage(profile.avatar_url, profile.gender_id)"
      width="50"
      height="50"
      class="rounded-circle mr-3"
    />

    <!-- Info -->
    <div class="flex-grow-1">
      <div class="font-weight-medium text-truncate">
        <v-btn variant="plain" :to="`/profiles/${profile.user_id}`" class="pa-0 text-left">
          {{ profile.displayname }} ({{ profile.age }})
        </v-btn>
        <v-icon
          :color="getGenderColor(profile.gender_id)"
          :icon="getAvatarIcon(profile.gender_id)"
          size="small"
          class="ml-1"
        />
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
import { getAvatar, getGenderColor, getAvatarIcon } from "@/composables/useUserUtils";

defineProps<{
  profile: any;
  hideUnupvote?: boolean;
}>();

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};
</script>