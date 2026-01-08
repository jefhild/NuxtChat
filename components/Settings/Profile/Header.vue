<template>
  <v-row no-gutters justify="center">
    <v-col cols="12" md="6" class="d-flex flex-column align-center">
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        :aiRemaining="aiRemaining"
        :aiDisabled="aiDisabled"
        :aiLoading="aiLoading"
        :uploadLoading="uploadLoading"
        :errorMessage="errorMessage"
        :userProfile="userProfile"
        :refreshLookingForMenu="refreshLookingForMenu"
        :displayKey="displayKey"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @generateAvatar="$emit('generateAvatar')"
        @uploadAvatar="$emit('uploadAvatar', $event)"
        @lookingForUpdated="$emit('refreshLookingForDisplay')"
      />
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
  aiRemaining: Number,
  aiDisabled: Boolean,
  aiLoading: Boolean,
  uploadLoading: Boolean,
  errorMessage: String,
});

defineEmits([
  "updateAvatarUrl",
  "refreshLookingForDisplay",
  "generateAvatar",
  "uploadAvatar",
]);
</script>
