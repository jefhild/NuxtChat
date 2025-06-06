<template>
  <v-card>
    <v-tabs v-model="tab" align-tabs="center" color="deep-purple-accent-4">
      <!-- <v-btn icon="mdi-refresh" variant="text" @click="refreshData"></v-btn> -->
      <v-spacer></v-spacer>
      <v-tab :value="1">{{ $t('components.users.online') }}</v-tab>
      <v-tab :value="2">{{ $t('components.users.offline') }}</v-tab>
      <v-tab :value="3">
        <span class="tab-title">{{ $t('components.users.active') }}</span>
        <v-badge v-if="unreadMessageCount > 0" :content="unreadMessageCount" color="red" overlap class="mb-7"></v-badge>
      </v-tab>
      <v-spacer></v-spacer>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item :value="1">
        <OnlineUsers :users="onlineUsers" :selectedUserId="selectedUserId" :isTabVisible="isTabVisible"
          @user-selected="selectUser" />
      </v-tabs-window-item>
      <v-tabs-window-item :value="2">
        <v-row><v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis">{{ $t('components.users.no-anonymous') }}</v-col></v-row>
        <OfflineUsers :users="offlineUsers" :selectedUserId="selectedUserId" @user-selected="selectUser"
          :isLoading="isLoading" />
      </v-tabs-window-item>
      <v-tabs-window-item :value="3">
        <ActiveChats :users="activeChats" :selectedUserId="selectedUserId" :isTabVisible="isTabVisible"
          :isLoading="isLoading" @user-selected="selectUser" @chat-deleted="handleChatDeleted" />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  onlineUsers: Array,
  offlineUsers: Array,
  activeChats: Array,
  userProfile: Object,
  selectedUserId: String,
  isTabVisible: Boolean,
  isLoading: Boolean,
});

const tab = ref(1);
const emit = defineEmits([
  "user-selected",
  "chat-deleted",
  "refresh-data",
  "unread-count",
]);

const supabase = useSupabaseClient();
const authStore = useAuthStore();
const myUserId = ref(authStore.user);
const unreadMessageCount = ref(0);
let messageChannel = null;

// Watch for changes in activeChats for the badge count on the active tab
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

onMounted(() =>
{
  // console.log("ActiveChats mounted", props.users);
  subscribeToNewMessages();
});



const subscribeToNewMessages = () =>
{
  if (!messageChannel)
  {
    messageChannel = supabase.channel(`messages:notify:${myUserId.value.id}`);
  }

  if (!messageChannel._subscribed){
    messageChannel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myUserId.value.id}` },
      (payload) =>
      {
        // console.log("New message received:", payload);

        const senderId = payload.new.sender_id;
        updateUnreadCount(senderId);
      }
    );

    const { error } = messageChannel.subscribe();
    if (!error)
    {
      messageChannel._subscribed = true;
    }
    else
    {
      console.error("Failed to subscribe to new messages:", error);
    }
  }
};

const updateUnreadCount = (senderId) =>
{
  const index = props.activeChats.findIndex(u => u.user_id === senderId);
  if (index === -1) return;
  const user = props.activeChats[index];

  const isChattingWithSender = senderId === props.selectedUserId && props.isTabVisible;
  if (!isChattingWithSender)
  {
    user.unread_count = (user.unread_count || 0) + 1;
    unreadCountUpdated(user);
  }
};

const selectUser = (user) => {
  emit("user-selected", user); // Ensure this line exists
};

const handleChatDeleted = (user) => {
  // console.log("Inside handleChatDeleted: User - ", user);

  emit("refresh-data");
};

const unreadCountUpdated = (user) => {
  // console.log("Inside unreadCountUpdated: User - ", user);
  
  // find user in onlineUsers and update unread_count
  const onlineUser = props.onlineUsers.find(u => u.user_id === user.user_id);
  if (onlineUser) {
    // console.log("Updating unread count for user:", onlineUser.user_id);
    onlineUser.unread_count = user.unread_count;
  }
};

onBeforeUnmount(() =>
{
  if (messageChannel?._subscribed)
  {
    messageChannel.unsubscribe();
    messageChannel._subscribed = false;
    messageChannel = null;
  }
});


</script>
<style scoped>
.refresh-icon {
  position: absolute;
  left: 10px;
  top: 10px;
}
</style>
