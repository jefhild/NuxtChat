<template>
  <v-container fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <div :class="[
            { 'selected-user': user.user_id === selectedUserId },
            user.user_id === selectedUserId ? `selected-gender-${user.gender_id}` : ''
          ]">
            <v-list-item @click="selectUser(user)">
              <template v-slot:prepend>
                <v-icon :color="getGenderColor(user.gender_id)" :icon="getAvatarIcon(user.gender_id)" size="small"
                  class="mr-1"></v-icon>

                <div class="avatar-wrapper">
                  <v-avatar size="44" :image="getAvatar(user.avatar_url, user.gender_id)"></v-avatar>
                  <NuxtImg :src="user.avatar_decoration_url" :alt="`${user.displayname}'s image`"
                    v-if="user.avatar_decoration_url" class="avatar-decoration" />

                  <v-icon color="white" size="x-small" class="status-badge">mdi-circle</v-icon>
                  <v-icon size="small" :color="statusColor(user.user_id)" :icon="statusIcon(user.user_id)"
                    class="status-badge" />
                </div>
              </template>
              <v-list-item-title :class="getGenderColorClass(user.gender_id)">
                {{ user.displayname }}
                <span v-if="user.unread_count > 0" class="unread-count">
                  ({{ user.unread_count }})
                </span>
              </v-list-item-title>
              <v-list-item-subtitle>
                ({{ user.age }}) {{ user.emoji }}
                {{ user.state_name ?? "" }}
              </v-list-item-subtitle>
            </v-list-item>
          </div>
        </template>
      </v-virtual-scroll>
    </v-card-text>
  </v-container>
</template>

<script setup>
import { usePresenceStatus } from '@/composables/usePresenceStatus';
// import {
//   getAvatarIcon,
//   getAvatar,
//   getGenderColor,
//   getGenderColorClass,
// } from "/utils/userUtils";

import { getAvatar, getAvatarIcon, getGenderColor, getGenderColorClass } from "@/composables/useUserUtils";

const props = defineProps({
  users: Array,
  filters: Object,
  isTabVisible: Boolean,
  selectedUserId: String
});

const { statusColor, statusIcon } = usePresenceStatus();

const emit = defineEmits(["user-selected"]);
const selectedUser = ref(null);

const selectUser = (user) => {
  selectedUser.value = user;
  user.unread_count = 0;
  emit("user-selected", user);
};
</script>

<style scoped>
.selected-user {
  border-left: 10px solid;
  border-radius: 10px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* Gender-specific selected styles */
.selected-gender-1 {
  background-color: #e3f2fd;
  border-left-color: #1976d2;
}

.selected-gender-2 {
  background-color: #fce4ec;
  border-left-color: #c2185b;
}

.selected-gender-3,
.selected-user:not(.selected-gender-1):not(.selected-gender-2) {
  background-color: #f3e5f5;
  border-left-color: #7b1fa2;
}

.v-list-item {
  margin-top: 10px;
}

.avatar-wrapper {
  position: relative;
}

.avatar-decoration {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 53px;
  pointer-events: none;
  z-index: 2;
  object-fit: contain;
}

.status-badge {
  position: absolute;
  bottom: 0px;
  right: -2px;
  width: 10px;
  height: 10px;
  z-index: 3;
}

.unread-count {
  color: red;
}

</style>
