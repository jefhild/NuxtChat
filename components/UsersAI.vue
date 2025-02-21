<template>
  <v-card tonal color="blue-grey-lighten-5">
    <v-tabs v-model="tab" align-tabs="center" color="deep-purple-accent-4">
      <v-btn icon="mdi-refresh" variant="text" @click="refreshData"></v-btn>
      <v-spacer></v-spacer>
      <v-tab :value="1">AI Users</v-tab>
      <v-tab :value="2">
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

        <!-- <OfflineUsers :users="offlineUsers" @user-selected="selectUser" /> -->
     <AiUsers :users="aiUsers" @user-selected="selectUser" />
      </v-tabs-window-item>
      <v-tabs-window-item :value="2">
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
const props = defineProps({
  onlineUsers: Array,
  aiUsers: Array,
  offlineUsers: Array,
  activeChats: Array,
  userProfile: Object,
  updateFilters: Function,
});


const tab = ref(1);
const emit = defineEmits(["user-selected", "chat-deleted", "refresh-data"]);

const unreadMessageCount = ref(0);
const activeChats = toRef(props, "activeChats"); // Make the prop reactive
// Watch for changes in activeChats prop with deep watch
watch(
  () => props.activeChats,
  (newChats) => {
    if (Array.isArray(newChats)) {
      unreadMessageCount.value = newChats.reduce(
        (count, chat) => count + (chat.unread_count || 0),
        0
      );
    } else {
      unreadMessageCount.value = 0; // Handle case when activeChats is undefined or not an array
    }
  },
  { immediate: true, deep: true }
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
