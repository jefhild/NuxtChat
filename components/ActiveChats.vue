<template>
  <v-row v-if="isLoading" justify="center" no-gutters class="mt-15">
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>
  <v-container v-else fluid>
    <v-card-text no-gutters class="pa-0">
      <v-virtual-scroll :items="users" height="300" item-height="10">
        <template v-slot:default="{ item: user }">
          <div
            :class="[
              { 'selected-user': user.user_id === selectedUserId },
              user.user_id === selectedUserId
                ? `selected-gender-${user.gender_id}`
                : '',
            ]"
          >
            <v-list-item @click="selectUser(user)">
              <template v-slot:prepend>
                <v-icon
                  :color="getGenderColor(user.gender_id)"
                  :icon="getAvatarIcon(user.gender_id)"
                  size="small"
                ></v-icon>

                <div class="avatar-wrapper">
                  <v-avatar
                    :image="getAvatar(user.avatar_url, user.gender_id)"
                  ></v-avatar>

                  <NuxtImg
                    :src="user.avatar_decoration_url"
                    v-if="user.avatar_decoration_url"
                    class="avatar-decoration"
                    :alt="`${user.displayname}'s image`"
                  />

                  <v-icon
                    v-if="user.provider != 'ChatGPT'"
                    color="white"
                    size="x-small"
                    class="status-badge"
                    >mdi-circle</v-icon
                  >
                  <v-icon
                    v-if="user.provider != 'ChatGPT'"
                    size="small"
                    :color="statusColor(user.user_id)"
                    :icon="statusIcon(user.user_id)"
                    class="status-badge"
                  />
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
    <v-card
      max-width="400"
      prepend-icon="mdi-message"
      :title="$t('components.activeChats.delete-title')"
    >
      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">{{
            $t("components.activeChats.delete-confirm")
          }}</v-col></v-row
        >
      </v-card-text>
      <v-card-text
        ><v-row
          ><v-col
            ><v-checkbox
              v-model="checkboxBlockUser"
              :label="$t('components.activeChats.block')"
            ></v-checkbox></v-col></v-row
      ></v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmDelete()">{{
          $t("components.activeChats.confirm")
        }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn class="ms-auto" @click="deleteDialog = false">{{
          $t("components.activeChats.cancel")
        }}</v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
  getGenderColorClass,
} from "@/composables/useUserUtils";
import { usePresenceStatus } from "@/composables/usePresenceStatus";
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "vue-i18n";
import { useDb } from "@/composables/useDB"; // assuming useDb provides deleteChatWithUser & insertBlockedUser

const { t } = useI18n();
const { statusColor, statusIcon } = usePresenceStatus();
const { insertBlockedUser, deleteChatWithUser } = useDb();

const authStore = useAuthStore();
const myUserId = ref(authStore.user); // ✅ current logged-in user

const deleteDialog = ref(false);
const checkboxBlockUser = ref(false);

const props = defineProps({
  users: Array,
  selectedUserId: String, // this is the OTHER user you're chatting with
  isTabVisible: Boolean,
  isLoading: Boolean,
});

const emit = defineEmits(["user-selected", "chat-deleted"]);

const selectedUser = ref(null);
const selectedUserForDelete = ref(null);

// User clicks delete icon
const deleteChat = (user) => {
  selectedUserForDelete.value = user;
  deleteDialog.value = true;
};

// User confirms deletion
const confirmDelete = async () => {
  if (checkboxBlockUser.value) {
    await insertBlockedUser(
      myUserId.value.id, // current user
      selectedUserForDelete.value.user_id // user to block
    );
  }

  try {
    const error = await deleteChatWithUser(
      myUserId.value.id, // current user
      selectedUserForDelete.value.user_id // other user
    );

    if (error) {
      console.error("Error deleting messages:", error);
      return;
    }

    emit("chat-deleted");
  } catch (error) {
    console.error("Unexpected error deleting messages:", error);
  }

  deleteDialog.value = false;
};

// Handle user selection
const selectUser = (user) => {
  if (user) {
    selectedUser.value = user;
    user.unread_count = 0;
    emit("user-selected", user);
  }
};
</script>

<style scoped>
.unread-count {
  color: red;
}

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
  padding-bottom: 10px;
  padding-top: 10px;
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
