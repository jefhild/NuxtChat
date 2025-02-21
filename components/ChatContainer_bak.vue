<template>
  <v-container fluid>
    <v-row>
      <v-col cols="auto"> <v-btn @click="toggleUsers">AI Users</v-btn></v-col>
      <v-col>
        <FilterMenu2
          :userProfile="userProfile"
          @filter-changed="updateFilters"
        /> </v-col
    ></v-row>
    <v-row>
      <!-- Left Column: Online Users -->
      <v-col cols="12" md="4" class="pa-2">
        <Users
          v-if="!showAIUsers"
          @user-selected="selectUser"
          :onlineUsers="onlineUsers"
          :offlineUsers="offlineUsers"
          :activeChats="activeChats"
          :userProfile="userProfile"
          :updateFilters="updateFilters"
          @refresh-data="refreshData"
        />
        <UsersAI
          v-if="showAIUsers"
          @user-selected="selectUser"
          :aiUsers="aiUsers"
          :offlineUsers="offlineUsers"
          :activeChats="activeChats"
          :userProfile="userProfile"
          :updateFilters="updateFilters"
          @refresh-data="refreshData"
        />
      </v-col>

      <!-- Main Chat Area -->
      <v-col cols="12" md="8" class="pa-2 d-flex flex-column">
        <ChatHeader :currentUser="user" :selectedUser="selectedUser" />

        <v-card class="flex-grow-1">
          <v-card-text class="chat-messages" ref="chatContainer">
            <div
              v-for="(message, index) in messages"
              :key="message.id"
              :class="message.sender_id === user.id ? 'sent' : 'received'"
              :ref="
                message.id === messages[messages.length - 1].id
                  ? 'lastMessage'
                  : null
              "
            >
              <Message :message="message" :user="user" />
            </div>
          </v-card-text>
        </v-card>

        <!-- Message Input Row -->
        <v-form @submit.prevent="sendMessage">
          <v-row no-gutters class="pa-2">
            <v-col cols="10">
              <v-text-field
                v-model="newMessage"
                :label="
                  selectedUser
                    ? 'Message ' + selectedUser.displayname
                    : 'Select a user to chat with'
                "
                variant="underlined"
                dense
                :readonly="!selectedUser"
              ></v-text-field>
            </v-col>
            <v-col cols="2">
              <v-btn
                type="submit"
                :disabled="!selectedUser"
                color="primary"
                class="mt-3 ml-3"
                >Send</v-btn
              >
            </v-col>
          </v-row>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useFetchOnlineUsers } from "@/composables/useFetchOnlineUsers";
import { useFetchOfflineUsers } from "@/composables/useFetchOfflineUsers";
import { useFetchActiveChats } from "@/composables/useFetchActiveChats";
import { useBlockedUsers } from "@/composables/useBlockedUsers";

const supabase = useSupabaseClient();
const authStore = useAuthStore();
const user = ref(authStore.user);
const userProfile = ref(authStore.userProfile);
const newMessage = ref("");
const selectedUser = ref(null);
const chatContainer = ref(null);
const messages = ref([]); // Reactive state
const onlineUsers = ref([]);
const offlineUsers = ref([]);
const activeChats = ref([]);
const filters = ref({ gender_id: null });
let realtimeMessages = null;
const showAIUsers = ref(false); // State to toggle between Users and UsersAI

const { onlineData, fetchOnlineUsers } = useFetchOnlineUsers(user);
const { offlineData, fetchOfflineUsers } = useFetchOfflineUsers(user);
const { activeChatsData, fetchActiveChats } = useFetchActiveChats(user);
const { blockedUsers, loadBlockedUsers } = useBlockedUsers(user);

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      const container = chatContainer.value.$el || chatContainer.value;
      container.scrollTop = container.scrollHeight;
      // console.log("ScrollHeight:", container.scrollHeight);
    } else {
      console.log("Chat container is not defined.");
    }
  });
};

// Method to toggle between Users and UsersAI components
const toggleUsers = () => {
  showAIUsers.value = !showAIUsers.value;
};


// Load chat messages between current user and selected user
const loadChatMessages = async (receiverUserId, senderUserId) => {
  if (!receiverUserId || !senderUserId) {
    console.error("Receiver User ID or Sender User ID is undefined");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, sender_id, receiver_id, content, created_at, read, profiles!messages_sender_id_fkey(displayname)"
      )
      .or(
        `and(sender_id.eq.${senderUserId},receiver_id.eq.${receiverUserId}),and(sender_id.eq.${receiverUserId},receiver_id.eq.${senderUserId})`
      );

    if (error) throw error;

    // Filter out messages from/to blocked users
    const filteredMessages = data.filter(
      (msg) =>
        !blockedUsers.value.includes(msg.sender_id) &&
        !blockedUsers.value.includes(msg.receiver_id)
    );

    // Sort messages by created_at date
    filteredMessages.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // Map messages to include the sender's displayname
    messages.value = filteredMessages.map((msg) => ({
      id: msg.id,
      sender: msg.profiles.displayname,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      created_at: msg.created_at,
      read: msg.read,
    }));

    console.log("Fetched and mapped messages:", messages.value);

    scrollToBottom(); // Ensure the chat scrolls to the bottom after loading messages

    // Mark all messages as read
    await markMessagesAsRead(receiverUserId, senderUserId);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
  }
};

const markMessagesAsRead = async (receiverUserId, senderUserId) => {
  try {
    // console.log("receiverUserId:", receiverUserId);
    // console.log("senderUserId:", senderUserId);

    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", receiverUserId)
      .eq("sender_id", senderUserId)
      .eq("read", false); // Ensures only unread messages are affected

    if (error) throw error;

    console.log("Messages marked as read");
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

const handleRealtimeMessages = (payload) => {
  console.log("Real-time message detected:", payload);
  const { eventType, new: newRow } = payload;

  switch (eventType) {
    case "INSERT":
      // Filter out messages from/to blocked users
      if (
        !blockedUsers.value.includes(newRow.sender_id) &&
        !blockedUsers.value.includes(newRow.receiver_id) &&
        (newRow.sender_id === selectedUser.value?.user_id ||
          newRow.receiver_id === selectedUser.value?.user_id)
      ) {
        messages.value.push(newRow);
        scrollToBottom(); // Ensure the chat scrolls to the bottom when a new message is added
        // console.log("selectedUser.value?.user_id:", selectedUser.value?.user_id);
        //         console.log("authStore.user?.id:", authStore.user?.id);
        markMessagesAsRead(selectedUser.value?.user_id, authStore.user?.id); // Mark message as read
      }
      break;
    case "UPDATE":
      // Handle updates for messages if needed
      break;
    case "DELETE":
      // Handle deletions if needed
      break;
  }
};

onMounted(async () => {
  await authStore.checkAuth();
  user.value = authStore.user;
  userProfile.value = authStore.userProfile;
  fetchOnlineUsers(filters.value);
  fetchOfflineUsers(filters.value);
  fetchActiveChats();

  // await loadBlockedUsers();
  loadBlockedUsers(); // Load blocked users for the current user

  // Watch for selected user changes to load chat messages
  watch(
    selectedUser,
    (newUser, oldUser) => {
      if (newUser && newUser !== oldUser) {
        loadChatMessages(newUser.user_id, authStore.user?.id);
      }
    },
    { immediate: true }
  );

  // Set up real-time subscription to messages table
  if (!realtimeMessages) {
    realtimeMessages = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          console.log("Real-time event received:", payload);
          handleRealtimeMessages(payload);
        }
      );

    const { error } = await realtimeMessages.subscribe();
    if (error) {
      console.error("Error subscribing to real-time channel:", error);
    } else {
      console.log("Subscribed to real-time updates for messages");
    }
  }
});

// Select user to chat with
const selectUser = (user) => {
  // console.log("Selected user (ChatContainer):", user);
  selectedUser.value = user;
};

// Send message
const sendMessage = async () => {
  // console.log("sendMessage function called");
  if (newMessage.value.trim() && selectedUser.value) {
    // console.log(
    //   "Sending message from:",
    //   authStore.user?.id,
    //   "to:",
    //   selectedUser.value.user_id
    // );

    const senderUserId = authStore.user?.id;
    const receiverUserId = selectedUser.value.user_id;

    if (!senderUserId || !receiverUserId) {
      console.error("Sender or Receiver ID is missing");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderUserId,
          receiver_id: receiverUserId,
          content: newMessage.value,
        })
        .select("*"); // Explicitly request all columns to be returned

      if (error) {
        console.error("Error sending message:", error);
      } else if (data && data.length > 0) {
        console.log("Message sent successfully:", data);
        newMessage.value = ""; // Reset the message input field
        // messages.value.push(data[0]); // Add the new message to the messages array
        scrollToBottom(); // Ensure the chat scrolls to the bottom when a new message is added
      } else {
        console.error("No data returned from the message insert");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  } else {
    console.error("Message content or selected user is missing");
  }
};

const updateFilters = async (newFilters) => {
  // console.log("Filters updated:", newFilters); // Debug log
  filters.value = newFilters;
  fetchOnlineUsers(filters.value);
  fetchOfflineUsers(filters.value);
  fetchActiveChats();
};

// Watch the data from composable and update onlineUsers
watch(onlineData, (newData) => {
  onlineUsers.value = newData;
});

// Watch the data from composable and update onlineUsers
watch(offlineData, (newData) => {
  offlineUsers.value = newData;
});

// Watch the data from composable and update onlineUsers
watch(activeChatsData, (newData) => {
  activeChats.value = newData;
});

const refreshData = async () => {
  console.log("refreshData"); // Debug log
  fetchOnlineUsers(filters.value);
  fetchOfflineUsers(filters.value);
  fetchActiveChats();
};
</script>

<style scoped>
.chat-messages {
  max-height: 300px; /* Adjust as needed */
  overflow-y: auto;
  padding: 5px;
}

.sent {
  align-self: flex-start;
  text-align: left;
}
.received {
  align-self: flex-start;
  text-align: right;
}

.male {
  color: darkblue;
}

.female {
  color: darkred;
}

.other {
  color: purple;
}

small {
  display: block;
  margin-top: 5px;
  font-size: 0.8em;
  color: gray;
}
</style>
