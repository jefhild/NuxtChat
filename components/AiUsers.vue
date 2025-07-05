<template>
  <v-container fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <div :class="{ 'selected-user': user.user_id === selectedUserId }">
            <v-list-item @click="selectUser(user)">
              <template v-slot:prepend>
                <v-icon
                  :color="getGenderColor(user.gender_id)"
                  :icon="getAvatarIcon(user.gender_id)"
                  size="small"
                ></v-icon>
                <v-avatar
                  :image="getAvatar(user.avatar_url, user.gender_id)"
                ></v-avatar>
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

// do I need this?
import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
  getGenderColorClass,
} from "@/composables/useUserUtils";

const props = defineProps({
  users: Array,
  filters: Object,
  selectedUserId: String,
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
}

.v-list-item {
  margin-top: 10px;
}
</style>
