<template>
  <v-container fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <v-list-item @click="selectUser(user)">
            <template v-slot:prepend>
              <v-icon :color="getGenderColor(user.gender_id)" :icon="getAvatarIcon(user.gender_id)"
                size="small"></v-icon>
              <v-avatar :image="getAvatar(user.avatar_url, user.gender_id)"></v-avatar>
              <v-icon size="small" color="grey" icon="mdi-circle"
                class="align-self-end" />
            </template>
            <v-list-item-title :class="getGenderColorClass(user.gender_id)">
              {{ user.displayname }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ user.emoji }} ( {{ user.age }} )
              {{ user.state_name ?? "" }}
            </v-list-item-subtitle>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </v-card-text>
  </v-container>
</template>

<script setup>
import {
  getAvatarIcon,
  getAvatar,
  getGenderColor,
  getGenderColorClass,
} from "/utils/userUtils";

const props = defineProps({
  users: Array,
  filters: Object,
});

const emit = defineEmits(["user-selected"]);
const selectedUser = ref(null);

const selectUser = (user) => {
  selectedUser.value = user;
  emit("user-selected", user);
};



</script>


