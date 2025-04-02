<template>
  <v-container fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <v-list-item @click="selectUser(user)">
            <template v-slot:prepend>
              <v-icon :color="getGenderColor(user.gender_id)" :icon="getAvatarIcon(user.gender_id)"
                size="small"></v-icon>

              <div class="avatar-wrapper">
                <v-avatar :image="getAvatar(user.avatar_url, user.gender_id)"></v-avatar>
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
              {{ user.emoji }} ( {{ user.age }})
              {{ user.state_name ?? "" }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-icon @click.stop="deleteChat(user)" class="delete-icon">
                mdi-delete
              </v-icon>
            </template>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </v-card-text>
  </v-container>

  <v-dialog v-model="deleteDialog" width="auto">
    <v-card max-width="400" prepend-icon="mdi-message" title="Delete This Chat">
      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">Are you sure you want to delete this chat? This action cannot be
            undone.</v-col></v-row>
      </v-card-text>
      <v-card-text><v-row><v-col><v-checkbox v-model="checkboxBlockUser"
              label="Block this user?"></v-checkbox></v-col></v-row></v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmDelete()">Confirm</v-btn>
        <v-spacer></v-spacer>
        <v-btn class="ms-auto" text="Cancel" @click="deleteDialog = false"></v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
// import {
//   getAvatarIcon,
//   getAvatar,
//   getGenderColor,
//   getGenderColorClass,
// } from "/utils/userUtils";

import { getAvatar, getAvatarIcon, getGenderColor, getGenderColorClass } from "@/composables/useUserUtils";
import { usePresenceStatus } from "@/composables/usePresenceStatus";
import { useAuthStore } from "@/stores/authStore";
const { insertBlockedUser, deleteChatWithUser } = useDb();

const authStore = useAuthStore();
const myUserId = ref(authStore.user);
const deleteDialog = ref(false);
const checkboxBlockUser = ref(false);
const props = defineProps({
  users: Array,
});

const supabase = useSupabaseClient();
const emit = defineEmits(["user-selected", "chat-deleted"]);
const selectedUser = ref(null);
const selectedUserForDelete = ref(null);

const deleteChat = (user) => {
  console.log("Selected user", user);
  selectedUserForDelete.value = user;
  deleteDialog.value = true;
};

const confirmDelete = async () => {
  console.log("selectedUserForDelete: ", selectedUserForDelete.value.user_id);
  console.log("myUserId: ", myUserId.value.id);
  if (checkboxBlockUser.value) {
    console.log("Block user");

    await insertBlockedUser(
      myUserId.value.user_id,
      selectedUserForDelete.value.user_id
    );
  }

  try {
    const error = await deleteChatWithUser(
      myUserId.value.id,
      selectedUserForDelete.value.user_id
    );

    if (error) {
      console.error("Error deleting messages:", error);
      return;
    }

    console.log("Messages deleted:");

    emit("chat-deleted");
  } catch (error) {
    console.error("Unexpected error deleting messages:", error);
  }
  // emit("update-active-chats");

  deleteDialog.value = false;
};

const selectUser = (user) => {
  if (user) {
    selectedUser.value = user;
    user.unread_count = 0;
    emit("user-selected", user);
  }
};

onMounted(() => {
  subscribeToNewMessages();
});

const subscribeToNewMessages = () => {
  supabase
    .channel("messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        console.log("New message received:", payload);

        // Find the sender in the users array
        const sender = props.users.find(
          (user) => user.user_id === payload.new.sender_id
        );

        // If the message is for the current user, update the unread count
        if (sender) {
          sender.unread_count = (sender.unread_count || 0) + 1;
        }
      }
    )
    .subscribe();
};

const { statusColor, statusIcon } = usePresenceStatus();
</script>

<style scoped>
.unread-count {
  color: red;
}

.avatar-wrapper {
  position: relative;
}

.status-badge {
  position: absolute;
  bottom: 0px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
