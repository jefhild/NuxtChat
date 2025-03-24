<template>
  <v-card>
    <v-tabs v-model="tab" align-tabs="center" color="deep-purple-accent-4">
      <v-btn icon="mdi-refresh" variant="text" @click="refreshData"></v-btn>
      <v-spacer></v-spacer>
      <v-tab :value="1">Online</v-tab>
      <v-tab :value="2">Offline</v-tab>
      <v-tab :value="3">
        <span class="tab-title">Active</span>
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
        <OnlineUsers :users="onlineUsers" @user-selected="selectUser" />
      </v-tabs-window-item>
      <v-tabs-window-item :value="2">
        <v-row
          ><v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
            >No anonymous users here...</v-col
          ></v-row
        >
        <OfflineUsers :users="offlineUsers" @user-selected="selectUser" />
      </v-tabs-window-item>
      <v-tabs-window-item :value="3">
        <ActiveChats
          :users="activeChats"
          @user-selected="selectUser"
          @chat-deleted="handleChatDeleted"
        />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<script setup>
const supabase = useSupabaseClient();

const props = defineProps({
  onlineUsers: Array,
  offlineUsers: Array,
  activeChats: Array,
  userProfile: Object,
  updateFilters: Function,
});

onMounted(() =>
{
  subscribeToNewMessages();
});

onUnmounted(() =>
{
  supabase.channel("messages").unsubscribe();
});

const subscribeToNewMessages = () =>
{
  supabase
    .channel("public.messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) =>
      {

        if (payload.new.receiver_id === props.userProfile.user_id)
        {
          document.title = `Chat | ImChatty (${unreadMessageCount.value})`;
        }
      }
    )
    .subscribe();
};

const tab = ref(1);
const emit = defineEmits(["user-selected", "chat-deleted", "refresh-data"]);

// let presenceChannel = null;
const unreadMessageCount = ref(0);
const activeChats = toRef(props, "activeChats"); // Make the prop reactive
// Watch for changes in activeChats prop with deep watch
watch(
  () => props.activeChats,
  (newChats) => {
    unreadMessageCount.value = newChats.reduce(
      (count, chat) => count + (chat.unread_count || 0),
      0
    );
  },
  { immediate: true, deep: true } // Run immediately on initialization and watch deeply
);



const selectUser = (user) => {
  emit("user-selected", user); // Ensure this line exists
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
