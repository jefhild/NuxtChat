<template>
  <v-container fluid>
    <v-card-text>
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <div :class="{ 'selected-user': user.user_id === selectedUserId}">
            <v-list-item @click="selectUser(user)">
              <template v-slot:prepend>
                <v-icon :color="getGenderColor(user.gender_id)" :icon="getAvatarIcon(user.gender_id)"
                  size="small"></v-icon>

                <div class="avatar-wrapper">
                  <v-avatar :image="getAvatar(user.avatar_url, user.gender_id)"></v-avatar>

                  <NuxtImg :src="user.avatar_decoration_url" v-if="user.avatar_decoration_url"
                    class="avatar-decoration" :alt="`${user.displayname}'s image`"/>

                  <v-icon v-if="user.provider != 'ChatGPT'" color="white" size="x-small" class="status-badge">mdi-circle</v-icon>
                  <v-icon v-if="user.provider != 'ChatGPT'" size="small" :color="statusColor(user.user_id)" :icon="statusIcon(user.user_id)"
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

              <template v-slot:append>
                <v-icon @click.stop="deleteChat(user)" class="delete-icon">
                  mdi-delete
                </v-icon>
              </template>
            </v-list-item>
          </div>
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
  selectedUserId: String,
  isTabVisible: Boolean,
});

const localUsers = ref([]);

watch(() => props.users, (newVal) =>
{
  if (props.selectedUserId && props.isTabVisible)
  {
    // Prevent overwrite to avoid flicker
    localUsers.value = localUsers.value.map(localUser =>
    {
      //re render the dom because vue doesnt detect the change if we change localuser directly
      const updated = newVal.find(u => u.user_id === localUser.user_id) || localUser;
      if (localUser.user_id === props.selectedUserId)
      {
        updated.unread_count = 0;
      }
      return { ...updated };
    });
  } else
  {
    localUsers.value = newVal.map((user) => ({ ...user }));
  }
}, { immediate: true });

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
  console.log("ActiveChats mounted", props.users);
  subscribeToNewMessages();
});

const subscribeToNewMessages = () => {
  supabase
    .channel("messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        // console.log("New message received:", payload);

        const senderId = payload.new.sender_id;
        const receiverId = payload.new.receiver_id;

        if (receiverId !== myUserId.value.id) return;

        updateUnreadCount(senderId);
      }
    )
    .subscribe();
};

const updateUnreadCount = (senderId) =>
{
  const index = localUsers.value.findIndex(u => u.user_id === senderId);
  if (index === -1) return;

  const isChattingWithSender = senderId === props.selectedUserId && props.isTabVisible;

  if (!isChattingWithSender)
  {
    console.log("Updating unread count for user:", senderId);
    const updatedUser = {
      ...localUsers.value[index],
      unread_count: (localUsers.value[index].unread_count || 0) + 1,
    };
    localUsers.value.splice(index, 1, updatedUser);
  }
};


const { statusColor, statusIcon } = usePresenceStatus();
</script>

<style scoped>
.unread-count {
  color: red;
}

.selected-user {
  background-color: #e3f2fd;
  border-left: 10px solid #1976d2;
  border-radius: 10px;
  transition: background-color 0.3s ease;
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
  width: 49px;
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
</style>
