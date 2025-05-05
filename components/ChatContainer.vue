<template>
  <v-container fluid>
    <v-row>
      <!-- <v-col cols="auto">
        <v-btn flat @click="toggleUsers">
          {{ showAIUsers ? "Human Users" : "AI Users" }}
        </v-btn>
        
        </v-col
      > -->

      <v-col>
        <FilterMenu2
          :userProfile="userProfile"
          :showAIUsers="showAIUsers"
          @toggle-users="toggleUsers"
          @filter-changed="updateFilters"
        /> </v-col
    ></v-row>
    <v-row>
      <!-- Left Column: Online Users -->
      <v-col cols="12" md="4" class="pa-2">
        <Users
          v-if="!showAIUsers"
          @user-selected="selectUser"
          :onlineUsers="arrayOnlineUsers"
          :offlineUsers="arrayOfflineUsers"
          :activeChats="activeChats"
          :userProfile="userProfile"
          :updateFilters="updateFilters"
          :selected-user-id="selectedUser?.user_id"
          :is-tab-visible="isTabVisible"
          @refresh-data="refreshData"
          @unread-count="updateTabTitle"
        />
        <UsersAI
          v-if="showAIUsers"
          @user-selected="selectUser"
          :aiUsers="aiUsers"
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
              <!-- <v-text-field
                v-model="newMessage"
                :label="
                  selectedUser
                    ? 'Message ' + selectedUser.displayname
                    : 'Select a user to chat with'
                "
                variant="underlined"
                dense
                :readonly="!selectedUser"
              ></v-text-field> -->
              <v-text-field
                v-model="newMessage"
                :label="
                  selectedUser
                    ? selectedUser.is_ai
                      ? 'Chat with a ' + selectedUser.displayname + ' AI'
                      : 'Message ' + selectedUser.displayname
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

  <template>
    <RegistrationDialog v-model="dialogVisible" />
  </template>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useNotificationStore } from '@/stores/notificationStore';
const route = useRoute();
const router = useRouter();
import { usePresenceStore } from "@/stores/presenceStore";
import { useAuthStore } from "@/stores/authStore";
import { useFetchAiUsers } from "@/composables/useFetchAiUsers";
import { useFetchOfflineUsers } from "@/composables/useFetchOfflineUsers";
import { useFetchOnlineUsers } from "@/composables/useFetchOnlineUsers";
import { useFetchActiveChats } from "@/composables/useFetchActiveChats";
import { useBlockedUsers } from "@/composables/useBlockedUsers";

const {
  getUserProfileFromId,
  getAIInteractionCount,
  getCurrentAIInteractionCount,
  getMessagesBetweenUsers,
  updateMessagesAsRead,
  updateAIInteractionCount,
  insertMessage,
  insertInteractionCount,
} = useDb();

const supabase = useSupabaseClient();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const presenceStore = usePresenceStore();
const user = ref(authStore.user);
const userProfile = ref(authStore.userProfile);
const newMessage = ref("");
const selectedUser = ref(null);
const chatContainer = ref(null);
const messages = ref([]); // Reactive state
const aiUsers = ref([]);
const activeChats = ref([]);
const filters = ref({ gender_id: null });
let realtimeMessages = null;
// const registrationDialog = ref(false);
const dialogVisible = ref(false);
const userEmail = ref("");
const showAIUsers = ref(false); // State to toggle between Users and UsersAI

const lastUnreadSenderId = ref(null);
const isTabVisible = ref(true);


const { aiData, fetchAiUsers } = useFetchAiUsers(user);
const { arrayOnlineUsers, fetchOnlineUsers } = useFetchOnlineUsers(user);
const { arrayOfflineUsers, fetchOfflineUsers } = useFetchOfflineUsers(user);
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
// const toggleUsers = () => {
//   showAIUsers.value = !showAIUsers.value;

//   console.log("aiUsers:", aiUsers.value);
//   // Fetch AI users if switching to AI view
//   if (showAIUsers.value && aiUsers.value.length === 0) {
//     fetchAiUsers(filters.value);
//     // console.log("aiUsers inside if:", aiUsers.value);
//   }
// };

// Load chat messages between current user and selected user
const loadChatMessages = async (receiverUserId, senderUserId) => {
  if (!receiverUserId || !senderUserId) {
    console.error("Receiver User ID or Sender User ID is undefined");
    return;
  }

  try {
    const data = await getMessagesBetweenUsers(senderUserId, receiverUserId);

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

    //console.log("Fetched and mapped messages:", messages.value);

    scrollToBottom(); // Ensure the chat scrolls to the bottom after loading messages

    // Mark all messages as read
    await markMessagesAsRead(receiverUserId, senderUserId);
    console.log("Calling markMessageNotificationAsRead with:", senderUserId);

    notificationStore.markMessageNotificationAsRead(senderUserId);
    
  } catch (error) {
    console.error("Error fetching chat messages:", error);
  }
  refreshData();
};

const markMessagesAsRead = async (receiverUserId, senderUserId) => {
  await updateMessagesAsRead(receiverUserId, senderUserId);

  if (document.visibilityState === "visible")
  {
    updateTabTitle(0); // Only clear if user is really looking
  }
};

const updateTabTitle = (count) =>
{
  document.title = count > 0 ? `(${count}) New Message${count>1 ? 's' : ''}| 'ImChatty`
  : "Chat | 'ImChatty";
};



const handleRealtimeMessages = async (payload) =>
{
  const { eventType, new: newRow } = payload;

  if (eventType !== "INSERT") return;
  if (blockedUsers.value.includes(newRow.sender_id)) return;

  await fetchActiveChats(filters.value);

  const isMessageToCurrentUser = newRow.receiver_id === user.value.id;
  if (!isMessageToCurrentUser) return;

  const alreadyExists = messages.value.some((msg) => msg.id === newRow.id);
  if (!alreadyExists)
  {

    const isFromSelectedUser = newRow.sender_id === selectedUser.value?.user_id;
    const isVisible = document.visibilityState === "visible";

    if (!isFromSelectedUser || !isVisible)
    {
      const senderProfile = await getUserProfileFromId(newRow.sender_id);
      console.log("Sender Profile:", senderProfile);
      notificationStore.addNotification(
        'message',
        `${senderProfile.data.displayname || 'Someone'} sent you a message`,
        newRow.sender_id
      );
      return; //I return so it doesnt add the message to the chat if it is not from the selected user
    }
    
    messages.value.push(newRow);
    scrollToBottom();
    if (isVisible && isFromSelectedUser)
    {
      await markMessagesAsRead(newRow.receiver_id, newRow.sender_id);
      notificationStore.markMessageNotificationAsRead(newRow.sender_id);
      const userInActiveChats = activeChats.value.find(u => u.user_id === newRow.sender_id);
      if (userInActiveChats)
      {
        userInActiveChats.unread_count = 0;
      }
    } else
    {
      lastUnreadSenderId.value = newRow.sender_id;
    }
  } else
  {
    lastUnreadSenderId.value = newRow.sender_id;
  }
};


watch(
  () => presenceStore.userIdsOnly,
  async (newVal) => {
    //console.log("Presence store updated:", newVal); // Debug log
    if (!newVal.length) {
      arrayOnlineUsers.value = [];
      return;
    }

    //console.log("Online users:", newVal); // Debug log
    await fetchOnlineUsers(filters.value, newVal, userProfile.value.user_id);
    await fetchOfflineUsers(filters.value, newVal, userProfile.value.user_id);
  }
);

onMounted(async () => {
  await authStore.checkAuth();
  user.value = authStore.user;
  userProfile.value = authStore.userProfile;
  showAIUsers.value = route.query.user === "ai";
  isTabVisible.value = document.visibilityState === "visible";

  //Have to do them at least once on mount because if we go to another page and come back, we need to fetch the data again
  await fetchOnlineUsers(
    filters.value,
    presenceStore.userIdsOnly,
    userProfile.value.user_id
  );
  await fetchOfflineUsers(
    filters.value,
    presenceStore.userIdsOnly,
    userProfile.value.user_id
  );
  await fetchAiUsers(filters.value);
  await fetchActiveChats(filters.value);

  // await loadBlockedUsers();
  loadBlockedUsers(); // Load blocked users for the current user

  // Watch for selected user changes to load chat messages
  watch(
    selectedUser,
    (newUser, oldUser) => {
      if (newUser && newUser !== oldUser) {
        loadChatMessages(authStore.user?.id, newUser.user_id);
      }
    },
    { immediate: true }
  );

  // Watch the query parameter and set `showAIUsers` accordingly
  watch(
    () => route.query.user,
    (userType) => {
      showAIUsers.value = userType === "ai";
    },
    { immediate: true }
  );

  // Set up real-time subscription to messages table
  if (!realtimeMessages) {
    realtimeMessages = supabase
      .channel(`messages:user:${user.value.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.value.id}`,
        },
        (payload) =>
        {
          handleRealtimeMessages(payload);
        }
      );

    const { error } = realtimeMessages.subscribe();
    if (error) {
      console.error("Error subscribing to real-time channel:", error);
    } else {
      // console.log("Subscribed to real-time updates for messages");
    }
  }

  document.addEventListener("visibilitychange", async () =>
  {
    isTabVisible.value = document.visibilityState === "visible";
    if (document.visibilityState === "visible")
    {
      if (selectedUser.value?.user_id === lastUnreadSenderId.value)
      {
        await markMessagesAsRead(user.value.id, selectedUser.value.user_id);
        notificationStore.markMessageNotificationAsRead(selectedUser.value.user_id);
       
        lastUnreadSenderId.value = null;
      }

      await fetchActiveChats(filters.value); // Ensure sync with server
    }
  });
});

// Select user to chat with
const selectUser = (user) => {
  // console.log("Selected user (ChatContainer):", user);
  selectedUser.value = user;
};

const sendMessage = async () => {
  if (newMessage.value.trim() && selectedUser.value) {
    const senderUserId = authStore.user?.id;
    const receiverUserId = selectedUser.value.user_id;
    console.log(
      "Sender ID:",
      senderUserId,
      "Receiver ID:",
      receiverUserId,
      "Message:",
      newMessage.value
    );

    if (!senderUserId || !receiverUserId) {
      console.error("Sender or Receiver ID is missing");
      return;
    }

    let isAI = false;

    if (selectedUser.value.provider === "ChatGPT") {
      isAI = true;
    }

    // If the selected user is AI, check interaction limit
    if (isAI) {
      const canContinue = await checkAiInteractionLimit();
      if (!canContinue) {
        showRegistrationPrompt();
        return; // Stop further processing if limit is reached
      }
    }

    // Store the message in a temporary variable before resetting it
    const userMessage = newMessage.value.trim();

    try {
      const data = await insertMessage(
        receiverUserId,
        senderUserId,
        userMessage
      );

      if (data && data.length > 0) {
        // console.log("Message sent successfully:", data);
        newMessage.value = ""; // Reset the message input field

        // Push the new message to the messages array for immediate UI update
        messages.value.push({
          id: data[0].id,
          sender_id: data[0].sender_id,
          receiver_id: data[0].receiver_id,
          content: data[0].content,
          created_at: data[0].created_at,
          read: data[0].read,
          sender: userProfile.value.displayname, // Assuming current user's displayname is needed
        });
        scrollToBottom(); // Ensure the chat scrolls to the bottom when a new message is added

        // If the selected user is an AI, generate a response by calling the local API
        if (isAI) {
          const aiResponse = await fetchAiResponse(userMessage, selectedUser);
          // console.log("fetching response from AI:", aiResponse);
          if (aiResponse) {
            // Insert the AI response into the messages table
            const aiData = await insertMessage(
              senderUserId,
              receiverUserId,
              aiResponse
            );
            if (aiData && aiData.length > 0) {
              console.log("AI response stored successfully:", aiData);

              // Push the AI response to the messages array for immediate UI update
              messages.value.push({
                id: aiData[0].id,
                sender_id: aiData[0].sender_id,
                receiver_id: aiData[0].receiver_id,
                content: aiData[0].content,
                created_at: aiData[0].created_at,
                read: aiData[0].read,
                sender: selectedUser.value.displayname, // Assuming AI user's displayname is needed
              });

              scrollToBottom(); // Ensure the chat scrolls to the bottom when a new message is added
            }
          }

          // Increment AI interaction count after a successful AI response
          const interactionData = await getAIInteractionCount(senderUserId);

          if (interactionData) {
            const newCount = interactionData.interaction_count + 1;

            await updateAIInteractionCount(senderUserId, newCount);
          }
        }
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

// Helper function to call the local API endpoint
const fetchAiResponse = async (message, aiuser) => {
  const userPayload = {
    aiUser: aiuser.value.displayname,
    userName: userProfile.value?.displayname,
    userMessage: message,
    userGender: userProfile.value?.gender,
    userAge: userProfile.value?.age,
    messages: messages.value.slice(-10),
  };

  console.log("Sending payload:", userPayload); // Debug log to verify payload

  if (!userPayload.userMessage) {
    console.error("User message is missing");
    return null;
  }

  try {
    const response = await fetch("/api/aiChat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userPayload),
    });

    const responseData = await response.json();
    console.log("API response:", responseData);

    return responseData.success ? responseData.aiResponse : null;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return null;
  }
};

const checkAiInteractionLimit = async () => {
  try {
    // Determine the interaction limit based on user authentication type
    const interactionLimit = authStore.user.is_anonymous ? 10 : 100;

    // console.log("interactionLimit:", interactionLimit);
    // console.log("authStore.user.is_anonymous:", authStore.user.is_anonymous);

    // Fetch the current interaction count for the user from Supabase
    const { data, error } = await getCurrentAIInteractionCount(
      authStore.user?.id
    );

    if (error) {
      if (error.code === "PGRST116") {
        console.log("User not found in user_ai_interactions, adding new user.");

        // Insert a new row with the initial interaction count set to 1
        const insertError = await insertInteractionCount(authStore.user?.id, 1);

        if (insertError) {
          console.error(
            "Error inserting new user into user_ai_interactions:",
            insertError
          );
          return false;
        }

        // First interaction is allowed, return true
        return true;
      } else {
        console.error("Error fetching AI interaction count:", error);
        return false;
      }
    }

    // Check if the interaction count exceeds the allowed limit
    if (data.interaction_count >= interactionLimit) {
      // Prompt the user to register
      showRegistrationPrompt();
      return false; // Prevent further interactions
    }

    return true; // Allow the interaction
  } catch (err) {
    console.error("Error checking AI interaction limit:", err);
    return false;
  }
};

const showRegistrationPrompt = () => {
  // Implement your custom logic to prompt the user to register
  dialogVisible.value = true;
};

/*
// Function to submit the registration form
const submitRegistration = async () => {
  if (!userEmail.value) {
    console.error("Email is required");
    return;
  }

  // Call your registration logic here, e.g., send the email to the server
  console.log("Registering with email:", userEmail.value);
  registrationDialog.value = false; // Close the dialog after submission
};

// Function to close the dialog without action
const closeRegistrationDialog = () => {
  registrationDialog.value = false;
};*/

const toggleUsers = (aiView) => {
  showAIUsers.value = aiView;

  // Update the router to reflect the current user type
  const query = { ...route.query, user: aiView ? "ai" : "human" };
  router.push({ query });
};

const updateFilters = async (newFilters) => {
  // console.log("Filters updated:", newFilters); // Debug log
  filters.value = newFilters;
  fetchAiUsers(filters.value);
  fetchActiveChats(filters.value);
  await fetchOnlineUsers(filters.value, presenceStore.userIdsOnly, userProfile.value.user_id);
  await fetchOfflineUsers(filters.value, presenceStore.userIdsOnly, userProfile.value.user_id);
};

// Watch the data from composable
watch(aiData, (newData) => {
  aiUsers.value = newData;
});

// Watch the data from composable
watch(activeChatsData, (newData) => {
  activeChats.value = newData;
});

const refreshData = async () => {
  // console.log("refreshData"); // Debug log
  fetchAiUsers(filters.value);
  fetchActiveChats(filters.value);
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
