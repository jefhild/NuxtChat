<template>
  <v-row v-if="isLoading" justify="center" no-gutters>
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>
  <v-container v-else fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <div :class="{ 'selected-user': user.user_id === selectedUserId }">
            <v-list-item @click="selectUser(user)">
              <template v-slot:prepend>
                <v-icon :color="getGenderColor(user.gender_id)" :icon="getAvatarIcon(user.gender_id)"
                  size="small"></v-icon>

                <div class="avatar-wrapper">
                  <v-avatar :image="getAvatar(user.avatar_url, user.gender_id)"></v-avatar>

                  <NuxtImg :src="user.avatar_decoration_url" v-if="user.avatar_decoration_url" class="avatar-decoration"
                    :alt="`${user.displayname}'s image`" />

                  <v-icon size="small" color="grey" icon="mdi-circle" class="status-badge" />
                </div>

              </template>
              <v-list-item-title :class="getGenderColorClass(user.gender_id)">
                {{ user.displayname }}
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
  selectedUserId: String,
  isLoading: Boolean,
});

const emit = defineEmits(["user-selected"]);
const selectedUser = ref(null);

const selectUser = (user) => {
  selectedUser.value = user;
  emit("user-selected", user);
};



</script>

<style scoped>

.selected-user {
  background-color: #e3f2fd;
  border-left: 10px solid #1976d2;
  border-radius: 10px;
  transition: background-color 0.3s ease;
  padding-bottom: 2px;
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
  width: 48px;
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
  border-radius: 50%;
  z-index: 3;
}
</style>

