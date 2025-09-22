<template>
  <v-row no-gutters>
    <v-col cols="3">
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @previewAvatar="$emit('previewAvatar')"
        @confirmAvatar="$emit('confirmAvatar')"
      />
    </v-col>

    <v-col cols="9" class="d-flex flex-column align-center">
      <h3 class="font-weight-medium">{{ userProfile.displayname }}</h3>
      <h5 class="font-weight-thin">{{ userProfile.tagline }}</h5>
      <h5 class="font-weight-thin">{{ userProfile.site_url }}</h5>

      <p class="mt-3" v-if="userProfile?.user_id">
        <SettingsProfileLookingForDisplay
          :userId="userProfile.user_id"
          :key="displayKey"
        />
      </p>

      <p class="mt-2" v-if="userProfile?.user_id">
        <SettingsProfileLookingForMenu
          :userProfile="userProfile"
          :refreshLookingForMenu="refreshLookingForMenu"
          @lookingForUpdated="$emit('refreshLookingForDisplay')"
        />
      </p>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  userProfile: Object,
  avatar: String,
  isEditable: Boolean,
  refreshLookingForMenu: Boolean,
  displayKey: Number,
});

defineEmits([
  "updateAvatarUrl",
  "refreshLookingForDisplay",
  "previewAvatar",
  "confirmAvatar",
]);
</script>
