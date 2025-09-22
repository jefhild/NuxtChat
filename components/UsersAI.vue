<template>
  <v-card tonal color="blue-grey-lighten-5">
    <v-tabs v-model="tab" align-tabs="center" color="deep-purple-accent-4">
      <!-- <v-btn icon="mdi-refresh" variant="text" @click="refreshData"></v-btn> -->
      <v-spacer></v-spacer>

      <v-tab :value="1" :disabled="props.limited || !props.userProfile?.user_id">{{ $t("components.users-ai.ai-users") }}</v-tab>
      <v-tab :value="2" :disabled="props.limited || !props.userProfile?.user_id">
        <span class="tab-title">{{ $t("components.users-ai.active") }}</span>
        <v-badge
          v-if="unreadMessageCount > 0"
          :content="unreadMessageCount"
          color="red"
          overlap
          class="mb-7"
        ></v-badge>
      </v-tab>
      <v-spacer></v-spacer>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item :value="1">
        <div
          v-if="props.limited || !props.userProfile?.user_id"
          class="pa-4 text-center text-medium-emphasis"
        >
          {{ $t("components.users.requires-profile") }}
        </div>
        <AiUsers
          v-else
          :users="aiUsers"
          :selectedUserId="selectedUserId"
          @user-selected="selectUser"
        />
      </v-tabs-window-item>

      <v-tabs-window-item :value="2">
        <div
          v-if="props.limited || !props.userProfile?.user_id"
          class="pa-4 text-center text-medium-emphasis"
        >
          {{ $t("components.users.requires-profile") }}
        </div>
        <ActiveChats
          v-else
          :users="activeChats"
          :selectedUserId="selectedUserId"
          :isTabVisible="isTabVisible"
          @user-selected="selectUser"
          @chat-deleted="handleChatDeleted"
        />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  aiUsers: Array,
  activeChats: Array,
  userProfile: {
    type: Object,
    default: null,
    validator(value) {
      return value === null || value.user_id != null;
    },
  },
  selectedUserId: String,
  isTabVisible: Boolean,
  updateFilters: Function,
  limited: {
    type: Boolean,
    default: false,
  },
});

const tab = ref(1);
const emit = defineEmits([
  "user-selected",
  "chat-deleted",
  "refresh-data",
  "unread-count",
]);

const unreadMessageCount = ref(0);
const activeChats = toRef(props, "activeChats"); // Make the prop reactive
// Watch for changes in activeChats prop with deep watch
watch(
  () => props.activeChats,
  (newChats) => {
    unreadMessageCount.value = newChats.reduce((count, chat) => {
      // Skip counting unread if you're chatting with this user and the tab is visible
      const isActiveChat =
        chat.user_id === props.selectedUserId && props.isTabVisible;
      if (isActiveChat) return count;
      return count + (chat.unread_count || 0);
    }, 0);
    emit("unread-count", unreadMessageCount.value);
  },
  { immediate: true, deep: true } // Run immediately on initialization and watch deeply
);

const selectUser = (user) => {
  // Only allow selecting ImChatty if user is limited
  if (
    props.limited &&
    user.user_id !== "a3962087-516b-48df-a3ff-3b070406d832"
  ) {
    // Optionally show a prompt or emit an event
    alert("Please complete your profile to chat with other users.");
    return;
  }

  emit("user-selected", user);
};

const handleChatDeleted = (user) => {
  // console.log("Inside handleChatDeleted: User - ", user);

  emit("refresh-data");
};

const refreshData = (user) => {
  console.log("Refreshing data...");
  emit("refresh-data", user); // Ensure this line exists
};
</script>
<style scoped>
.refresh-icon {
  position: absolute;
  left: 10px;
  top: 10px;
}
</style>
