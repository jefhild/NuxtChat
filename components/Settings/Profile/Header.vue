<template>
  <v-row no-gutters justify="center">
    <v-col cols="12" md="6" class="d-flex flex-column align-center">
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        :randomLoading="randomLoading"
        :uploadLoading="uploadLoading"
        :errorMessage="errorMessage"
        :userProfile="userProfile"
        :refreshLookingForMenu="refreshLookingForMenu"
        :displayKey="displayKey"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @randomAvatar="$emit('randomAvatar')"
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
  randomLoading: Boolean,
  uploadLoading: Boolean,
  errorMessage: String,
});

defineEmits([
  "updateAvatarUrl",
  "refreshLookingForDisplay",
  "randomAvatar",
  "uploadAvatar",
]);
</script>
