<template>
  <v-container fluid>
    <v-row class="align-center">
      <v-col cols="12" md="4" class="pa-2">
        <!-- Filter and Toggle Row -->
        <v-row no-gutters class="align-center">
          <v-col class="mr-2">
            <FilterMenu2
              :userProfile="userProfile"
              :showAIUsers="showAIUsers"
              @filter-changed="updateFilters"
            />
          </v-col>
          <v-col>
            <ToggleAi v-model="showAIUsers" />
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="12" md="8" class="pa-2 d-flex flex-column">
        <ChatHeader
          v-if="!smAndDown"
          :currentUser="user"
          :selectedUser="selectedUser"
        />
      </v-col>
    </v-row>
    <!-- Main Chat Row with Users and Chat Panel -->
    <v-row>
      <!-- Left Column: Online Users -->
      <v-col cols="12" md="4" class="pa-2">
        <!-- Mobile: Collapse Users Panel -->
        <template v-if="smAndDown">
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-title>
                <ChatHeader :currentUser="user" :selectedUser="selectedUser" />
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <Users
                  v-if="!showAIUsers"
                  @user-selected="selectUser"
                  :onlineUsers="arrayOnlineUsers"
                  :offlineUsers="arrayOfflineUsers"
                  :activeChats="activeChats"
                  :userProfile="userProfile"
                  :selected-user-id="selectedUser?.user_id"
                  :is-tab-visible="isTabVisible"
                  :isLoading="isLoading"
                  @refresh-data="refreshData"
                  @unread-count="updateTabTitle"
                />
                <UsersAI
                  v-if="showAIUsers"
                  @user-selected="selectUser"
                  :aiUsers="aiUsers"
                  :activeChats="activeChats"
                  :userProfile="userProfile"
                  :selected-user-id="selectedUser?.user_id"
                  :is-tab-visible="isTabVisible"
                  :updateFilters="updateFilters"
                  @refresh-data="refreshData"
                  @unread-count="updateTabTitle"
                />
                <ProfileCard :profile="userProfile" class="mt-2" />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>

        <!-- Desktop: Normal Display -->
        <template v-else>
          <Users
            v-if="!showAIUsers"
            @user-selected="selectUser"
            :onlineUsers="arrayOnlineUsers"
            :offlineUsers="arrayOfflineUsers"
            :activeChats="activeChats"
            :userProfile="userProfile"
            :selected-user-id="selectedUser?.user_id"
            :is-tab-visible="isTabVisible"
            :isLoading="isLoading"
            @refresh-data="refreshData"
            @unread-count="updateTabTitle"
          />
          <UsersAI
            v-if="showAIUsers"
            @user-selected="selectUser"
            :aiUsers="aiUsers"
            :activeChats="activeChats"
            :userProfile="userProfile"
            :selected-user-id="selectedUser?.user_id"
            :is-tab-visible="isTabVisible"
            :updateFilters="updateFilters"
            @refresh-data="refreshData"
            @unread-count="updateTabTitle"
          />
          <ProfileCard :profile="userProfile" class="mt-2" />
        </template>
      </v-col>

      <!-- Main Chat Area -->
      <v-col cols="12" md="8" class="pa-2 d-flex flex-column">
        <v-card v-if="selectedUser" class="flex-grow-1">
          <v-card-text
            class="chat-messages"
            ref="chatContainer"
            @scroll.passive="handleScroll"
          >
            <div v-if="loadingMore" class="text-center py-2">
              <v-progress-circular indeterminate color="primary" size="24" />.
            </div>
            <div
              v-for="(message, index) in messages"
              :key="message.id"
              @click="replyingToMessage = message"
              :class="message.sender_id === user.id ? 'sent' : 'received'"
              :ref="index === 0 ? 'firstMessage' : null"
            >
              <Message
                :message="message"
                :user="user"
                @edit-message="editMessage"
                @removeReplying="removeReplyingToMessage"
              />
            </div>
            <!-- Typing Indicator -->
            <div v-if="isTyping" class="typing-indicator bot-message">
              <div class="dots"><span></span><span></span><span></span></div>
            </div>
          </v-card-text>
        </v-card>

        <div v-if="replyingToMessage" class="d-flex align-center">
          <div class="text-caption mr-2 flex-grow-1">
            {{ $t("components.chatcontainer.replying-to") }}
            {{
              replyingToMessage.content.length > 50
                ? replyingToMessage.content.substring(0, 50) + "..."
                : replyingToMessage.content
            }}
          </div>
          <v-btn
            icon
            @click="replyingToMessage = null"
            size="small"
            class="flex-shrink-0 mt-2"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <!-- Message Input Row -->
        <v-form @submit.prevent="sendMessage">
          <v-row v-if="attachedFile">
            <v-col
              cols="auto"
              class="position-relative d-inline-block mt-2 ml-2"
            >
              <NuxtImg
                :src="previewUrl"
                :alt="attachedFile.name"
                width="100"
                height="100"
                class="rounded elevation-2"
                cover
              />
              <v-btn
                icon
                size="x-small"
                class="remove-image-btn"
                @click="clearAttachment"
                color="red"
                variant="flat"
              >
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <v-row no-gutters class="pa-2">
            <v-col cols="12" md="10" class="d-flex align-center pa-0">
              <v-row class="w-100" no-gutters>
                <v-col cols="auto" class="d-flex align-center">
                  <!-- Emoji Button -->
                  <v-btn
                    icon
                    size="x-small"
                    class="mr-1 pa-0"
                    @click="toggleEmojiPicker"
                    :disabled="!selectedUser || sendingMessage"
                  >
                    <v-icon>mdi-emoticon-happy-outline</v-icon>
                  </v-btn>

                  <!-- Upload Button -->
                  <label
                    class="upload-bubble mr-2"
                    :class="{
                      'upload-bubble--disabled':
                        !selectedUser || sendingMessage,
                    }"
                  >
                    <v-icon size="18">mdi-plus</v-icon>
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleFileUpload"
                      :disabled="!selectedUser || sendingMessage"
                      style="display: none"
                    />
                  </label>
                </v-col>

                <v-col>
                  <!-- Emoji Picker -->
                  <div
                    class="emoji-picker-container"
                    v-if="showEmojiPicker"
                    ref="emojiPickerRef"
                  >
                    <client-only>
                      <EmojiPicker @select="onSelectEmoji" />
                    </client-only>
                  </div>

                  <!-- Text Input -->
                  <v-text-field
                    v-model="newMessage"
                    :label="
                      selectedUser
                        ? selectedUser.is_ai
                          ? $t('components.chatcontainer.chat') +
                            selectedUser.displayname +
                            $t('components.chatcontainer.ai')
                          : $t('components.chatcontainer.message') +
                            selectedUser.displayname
                        : $t('components.chatcontainer.select-user')
                    "
                    variant="underlined"
                    dense
                    :readonly="!selectedUser || sendingMessage"
                  />
                </v-col>
              </v-row>
            </v-col>

            <v-col
              cols="12"
              md="2"
              class="d-flex justify-end pa-0 mt-2 mt-md-0"
            >
              <v-btn
                type="submit"
                size="small"
                :disabled="
                  !selectedUser ||
                  sendingMessage ||
                  (!newMessage.trim() && !attachedFile)
                "
                color="primary"
              >
                <v-progress-circular
                  v-if="sendingMessage"
                  indeterminate
                  color="white"
                  size="18"
                />
                <span v-if="!sendingMessage">{{
                  $t("components.chatcontainer.send")
                }}</span>
              </v-btn>
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
import { useNotificationStore } from "@/stores/notificationStore";
const route = useRoute();
const router = useRouter();
import { usePresenceStore } from "@/stores/presenceStore";
import { useAuthStore } from "@/stores/authStore";
import { useFetchAiUsers } from "@/composables/useFetchAiUsers";
import { useFetchOfflineUsers } from "@/composables/useFetchOfflineUsers";
import { useFetchOnlineUsers } from "@/composables/useFetchOnlineUsers";
import { useFetchActiveChats } from "@/composables/useFetchActiveChats";
import { useBlockedUsers } from "@/composables/useBlockedUsers";
import { defineAsyncComponent } from "vue";
import { onClickOutside } from "@vueuse/core";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
import { useDisplay } from "vuetify";
const { smAndDown } = useDisplay();

const {
  getUserProfileFromId,
  getUserProfileFromSlug,
  getAIInteractionCount,
  getCurrentAIInteractionCount,
  getMessageById,
  getMessagesBetweenUsers,
  isNotificationsEnabled,
  updateMessagesAsRead,
  updateAIInteractionCount,
  insertMessage,
  insertInteractionCount,
  getChatFilePublicUrl,
  uploadChatFile,
  updateMessage,
} = useDb();

const notificationSound = new Audio("/sounds/notification.wav");
notificationSound.volume = 0.5; // Optional: adjust volume

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
let realtimeUpdateMessages = null;
// const registrationDialog = ref(false);
const dialogVisible = ref(false);
const showAIUsers = ref(false); // State to toggle between Users and UsersAI
const isLoading = ref(true);

const lastUnreadSenderId = ref(null);
const isTabVisible = ref(true);

const isTyping = ref(false);
const typingAiUserId = ref(null);

const replyingToMessage = ref(null);

const attachedFile = ref(null);
const uploadedFileUrl = ref(null);
const uploadedFileType = ref(null);
const previewUrl = ref(null);

const loadingMore = ref(false);
const hasMoreMessages = ref(true);
const sendingMessage = ref(false);

const showEmojiPicker = ref(false);
const emojiPickerRef = ref(null);
const EmojiPicker = defineAsyncComponent(() => import("vue3-emoji-picker"));

const { aiData, fetchAiUsers } = useFetchAiUsers(user);
const { arrayOnlineUsers, fetchOnlineUsers } = useFetchOnlineUsers(user);

watch(
  () => arrayOnlineUsers.value,
  async (newUsers) => {
    if (!selectedUser.value && newUsers?.length) {
      const imchattyId = "a3962087-516b-48df-a3ff-3b070406d832";
      const imchatty = newUsers.find((u) => u.user_id === imchattyId);
      if (imchatty) {
        selectedUser.value = imchatty;

        const existingMessages = await getMessagesBetweenUsers(
          imchatty.user_id,
          user.value.id
        );

        if (existingMessages.length === 0) {
          // Build a personalized welcome message
          const age = userProfile.value?.age;
          const country = userProfile.value?.country;
          const name = userProfile.value?.displayname || "there";
          const welcomeMessage = `👋 Hey ${name}! I'm ImChatty. ${
            age ? `You're ${age}, right?` : ""
          } And from ${country}? Cool! Ask me anything or just say hi!`;

          await insertMessage(
            user.value.id, // receiver is the current user
            imchatty.user_id, // sender is imchatty
            welcomeMessage
          );

          // Refresh messages
          await loadChatMessages(user.value.id, imchatty.user_id);
        }
      }
    }
  },
  { immediate: true }
);

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

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
};

const onSelectEmoji = (emoji) => {
  newMessage.value += emoji.i;
  showEmojiPicker.value = false;
};

onClickOutside(emojiPickerRef, () => {
  showEmojiPicker.value = false;
});

// Load chat messages between current user and selected user
const loadChatMessages = async (receiverUserId, senderUserId) => {
  if (!receiverUserId || !senderUserId) {
    console.error("Receiver User ID or Sender User ID is undefined");
    return;
  }

  try {
    const data = await getMessagesBetweenUsers(senderUserId, receiverUserId);
    const reversedData = data.reverse();

    // Filter out messages from/to blocked users
    const filteredMessages = reversedData.filter(
      (msg) =>
        !blockedUsers.value.includes(msg.sender_id) &&
        !blockedUsers.value.includes(msg.receiver_id)
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
      reply_to: msg.reply_to,
      file_url: msg.file_url,
      file_type: msg.file_type,
      file_name: msg.file_name,
    }));

    //console.log("Fetched and mapped messages:", messages.value);

    scrollToBottom(); // Ensure the chat scrolls to the bottom after loading messages

    // Mark all messages as read
    await markMessagesAsRead(receiverUserId, senderUserId);
    // console.log("Calling markMessageNotificationAsRead with:", senderUserId);

    notificationStore.markMessageNotificationAsRead(senderUserId);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
  }
  refreshData();
};

const markMessagesAsRead = async (receiverUserId, senderUserId) => {
  await updateMessagesAsRead(receiverUserId, senderUserId);

  if (document.visibilityState === "visible") {
    updateTabTitle(0); // Only clear if user is really looking
  }
};

const updateTabTitle = (count) => {
  document.title =
    count > 0
      ? `(${count}) New Message${count > 1 ? "s" : ""} | ImChatty`
      : "ImChatty | Chat";
};

const oldestMessageTimestamp = computed(() =>
  messages.value.length ? messages.value[0].created_at : null
);

const handleScroll = async () => {
  const container = chatContainer.value?.$el || chatContainer.value;
  if (container && container.scrollTop < 50 && !loadingMore.value) {
    loadingMore.value = true;
    const prevScrollHeight = container.scrollHeight;
    const moreMessages = await getMessagesBetweenUsers(
      user.value.id,
      selectedUser.value.user_id,
      oldestMessageTimestamp.value
    );

    if (!moreMessages || moreMessages.length === 0) {
      hasMoreMessages.value = false;
      loadingMore.value = false;
      return;
    }

    messages.value = [...moreMessages.reverse(), ...messages.value];

    await nextTick(); // Wait for DOM to update

    const newScrollHeight = container.scrollHeight;
    const scrollDelta = newScrollHeight - prevScrollHeight;

    // Maintain scroll position after prepending
    container.scrollTop += scrollDelta;

    loadingMore.value = false;
  }
};

const handleRealtimeMessages = async (payload) => {
  const { eventType, new: newRow } = payload;
  if (eventType !== "INSERT") return;
  if (blockedUsers.value.includes(newRow.sender_id)) return;

  await fetchActiveChats(filters.value);

  const isMessageToCurrentUser = newRow.receiver_id === user.value.id;
  if (!isMessageToCurrentUser) return;

  const alreadyExists = messages.value.some((msg) => msg.id === newRow.id);
  // console.log("Already exists:", alreadyExists, "isMessageToCurrentUser:", isMessageToCurrentUser, "Sender ID:", newRow.sender_id, "Receiver ID:", newRow.receiver_id);
  if (!alreadyExists) {
    const isFromSelectedUser = newRow.sender_id === selectedUser.value?.user_id;
    const isVisible = document.visibilityState === "visible";

    // console.log("isFromSelectedUser:", isFromSelectedUser, "isVisible:", isVisible);

    if (!isFromSelectedUser || !isVisible) {
      const senderProfile = await getUserProfileFromId(newRow.sender_id);
      // console.log("Sender Profile:", senderProfile);
      const enabled = await isNotificationsEnabled(userProfile.value.user_id);
      // console.log("Notification enabled:", enabled);
      if (enabled) {
        notificationSound.play().catch((e) => {
          console.warn("Autoplay failed:", e);
        });
      }

      notificationStore.addNotification(
        "message",
        `${senderProfile.data.displayname || "Someone"} ` +
          t("components.chatcontainer.message-sent"),
        newRow.sender_id
      );
      lastUnreadSenderId.value = newRow.sender_id;
      isTyping.value = false;
      return; //I return so it doesnt add the message to the chat if it is not from the selected user
    }

    if (newRow.reply_to_message_id) {
      const { data: replyMsg } = await getMessageById(
        newRow.reply_to_message_id
      );

      if (replyMsg) {
        newRow.reply_to = {
          id: replyMsg.id,
          content: replyMsg.content,
          sender_id: replyMsg.sender_id,
        };
      }
    }

    messages.value.push(newRow);
    scrollToBottom();
    if (isVisible && isFromSelectedUser) {
      await markMessagesAsRead(newRow.receiver_id, newRow.sender_id);
      notificationStore.markMessageNotificationAsRead(newRow.sender_id);
      const userInActiveChats = activeChats.value.find(
        (u) => u.user_id === newRow.sender_id
      );
      if (userInActiveChats) {
        userInActiveChats.unread_count = 0;
      }
    } else {
      lastUnreadSenderId.value = newRow.sender_id;
    }
  } else {
    lastUnreadSenderId.value = newRow.sender_id;
  }
  isTyping.value = false;
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

  // Select the user we want to chat with
  const query = route.query;
  const userSlug = query?.userSlug;

  if (userSlug) {
    const userProfileData = await getUserProfileFromSlug(userSlug);

    if (userProfileData) {
      selectedUser.value = userProfileData[0];
    }
  }

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
        isTyping.value = false;
        if (
          newUser.provider === "ChatGPT" &&
          newUser.user_id === typingAiUserId.value
        ) {
          isTyping.value = true;
        }

        loadChatMessages(authStore.user?.id, newUser.user_id);
        hasMoreMessages.value = true;
        replyingToMessage.value = null;
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
    realtimeMessages = supabase.channel(`messages:user:${user.value.id}`);
    if (!realtimeMessages._subscribed) {
      realtimeMessages.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.value.id}`,
        },
        handleRealtimeMessages
      );

      const { error } = realtimeMessages.subscribe();
      if (!error) {
        realtimeMessages._subscribed = true;
      } else {
        console.error("Realtime message subscription failed:", error);
      }
    }
  }

  if (!realtimeUpdateMessages) {
    realtimeUpdateMessages = supabase.channel(
      `messages:update:${user.value.id}`
    );
    if (!realtimeUpdateMessages._subscribed) {
      realtimeUpdateMessages.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.value.id}`,
        },
        (payload) => {
          // console.log("Realtime update payload:", payload);

          const messageIndex = messages.value.findIndex(
            (msg) => msg.id === payload.old.id
          );
          if (messageIndex !== -1) {
            messages.value[messageIndex] = {
              ...messages.value[messageIndex],
              content: payload.new.content,
              edited_at: payload.new.edited_at,
            };
          }
        }
      );

      const { error } = realtimeUpdateMessages.subscribe();
      if (!error) {
        realtimeUpdateMessages._subscribed = true;
      } else {
        console.error("Realtime message subscription failed:", error);
      }
    }
  }

  document.addEventListener("visibilitychange", async () => {
    isTabVisible.value = document.visibilityState === "visible";
    if (document.visibilityState === "visible") {
      // console.log("Tab is visible", selectedUser.value.user_id, lastUnreadSenderId.value);
      if (selectedUser.value?.user_id === lastUnreadSenderId.value) {
        await loadChatMessages(user.value.id, selectedUser.value.user_id);
        hasMoreMessages.value = true;
        await markMessagesAsRead(user.value.id, selectedUser.value.user_id);
        notificationStore.markMessageNotificationAsRead(
          selectedUser.value.user_id
        );

        lastUnreadSenderId.value = null;
      }

      await fetchActiveChats(filters.value); // Ensure sync with server
    }
  });
  isLoading.value = false;
});

onBeforeUnmount(() => {
  if (realtimeMessages?._subscribed) {
    realtimeMessages.unsubscribe();
    realtimeMessages._subscribed = false;
  }
  if (realtimeUpdateMessages?._subscribed) {
    realtimeUpdateMessages.unsubscribe();
    realtimeUpdateMessages._subscribed = false;
  }
});

// Select user to chat with
const selectUser = (user) => {
  selectedUser.value = user;
};

const sendMessage = async () => {
  if ((newMessage.value.trim() || attachedFile.value) && selectedUser.value) {
    sendingMessage.value = true;
    const senderUserId = authStore.user?.id;
    const receiverUserId = selectedUser.value.user_id;

    //see if ithere is an attached file
    if (attachedFile.value) {
      const file = attachedFile.value;
      const fileName = `${Date.now()}_${file.name}`;

      const error = await uploadChatFile(fileName, file);

      if (error) {
        console.error("Error uploading file:", error);
        sendingMessage.value = false;
        return;
      }

      const publicUrl = await getChatFilePublicUrl(fileName);
      // console.log("File URL:", publicUrl, fileName);

      uploadedFileUrl.value = publicUrl;
      uploadedFileType.value = file.type;
    }

    if (!senderUserId || !receiverUserId) {
      console.error("Sender or Receiver ID is missing");
      sendingMessage.value = false;
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
        sendingMessage.value = false;
        return; // Stop further processing if limit is reached
      }
    }

    // Store the message in a temporary variable before resetting it
    const userMessage = newMessage.value.trim();

    try {
      const data = await insertMessage(
        receiverUserId,
        senderUserId,
        userMessage,
        replyingToMessage.value?.id ?? null,
        uploadedFileUrl.value,
        uploadedFileType.value,
        attachedFile.value?.name ? attachedFile.value.name : null
      );

      attachedFile.value = null;
      uploadedFileUrl.value = null;
      uploadedFileType.value = null;

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
          file_url: data[0].file_url,
          file_type: data[0].file_type,
          file_name: data[0].file_name,
          reply_to: replyingToMessage.value
            ? {
                id: replyingToMessage.value.id,
                content: replyingToMessage.value.content,
                sender_id: replyingToMessage.value.sender_id,
              }
            : null,
        });
        replyingToMessage.value = null;
        scrollToBottom(); // Ensure the chat scrolls to the bottom when a new message is added

        // If the selected user is an AI, generate a response by calling the local API
        if (isAI) {
          isTyping.value = true;
          typingAiUserId.value = receiverUserId; // Track which AI is typing
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
              isTyping.value = false;
              typingAiUserId.value = null;
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
    sendingMessage.value = false;
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
    replyTo: replyingToMessage.value?.content || null,
  };

  // console.log("Sending payload:", userPayload); // Debug log to verify payload

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
    // console.log("API response:", responseData);

    return responseData.success ? responseData.aiResponse : null;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return null;
  }
};

const checkAiInteractionLimit = async () => {
  try {
    // Determine the interaction limit based on user authentication type
    const interactionLimit = authStore.user.is_anonymous ? 10 : null;

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
    if (
      data.interaction_count >= interactionLimit &&
      interactionLimit != null
    ) {
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

const removeReplyingToMessage = () => {
  console.log("Replying to message removed", replyingToMessage.value);
  replyingToMessage.value = null;
  console.log("Replying to message removed", replyingToMessage.value);
};

const editMessage = async (editData) => {
  try {
    const { messageId, newContent } = editData;

    // Update in database
    const updatedMessage = await updateMessage(messageId, newContent);

    // Update local messages array
    const messageIndex = messages.value.findIndex(
      (msg) => msg.id === messageId
    );
    if (messageIndex !== -1) {
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        content: newContent,
        edited_at: updatedMessage.edited_at,
      };
    }

    // console.log('Message updated successfully');
  } catch (error) {
    console.error("Error editing message:", error);
    // You could show a toast notification here
  }
  removeReplyingToMessage();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    attachedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
    // console.log("Selected file:", attachedFile.value, previewUrl.value);
  }

  event.target.value = null;
};

const clearAttachment = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  attachedFile.value = null;
  previewUrl.value = null;
};

const showRegistrationPrompt = () => {
  // Implement your custom logic to prompt the user to register
  dialogVisible.value = true;
};

const updateFilters = async (newFilters) => {
  // console.log("Filters updated:", newFilters); // Debug log
  filters.value = newFilters;
  fetchAiUsers(filters.value);
  await fetchActiveChats(filters.value);
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
};

// Watch the data from composable
// watch(aiData, (newData) => {
//   aiUsers.value = newData;
// });

watch(aiData, (newData) => {
  // Avoid duplicating imchatty if it's already in online users
  const imchattyId = "a3962087-516b-48df-a3ff-3b070406d832";
  const filteredData = newData.filter((user) => user.user_id !== imchattyId);
  aiUsers.value = filteredData;
});

// Watch the data from composable
// watch(activeChatsData, (newData) => {
//   activeChats.value = newData;
// });

watch(activeChatsData, (newData) => {
  const seen = new Set();
  activeChats.value = newData.filter((user) => {
    if (seen.has(user.user_id)) return false;
    seen.add(user.user_id);
    return true;
  });
});

const refreshData = async () => {
  // console.log("refreshData"); // Debug log
  fetchAiUsers(filters.value);
  fetchActiveChats(filters.value);
};
</script>

<style scoped>
.chat-messages {
  max-height: 413px; /* Adjust as needed */
  overflow-y: auto;
  padding: 5px;
}

.chat-messages > div {
  transition: background-color 0.2s ease;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
}

.chat-messages > div:hover {
  background-color: rgba(0, 123, 255, 0.1);
  /* light blue background on hover */
}

.upload-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #1976d2;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.upload-bubble:hover {
  background-color: #1565c0;
}

.upload-bubble--disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

.remove-image-btn {
  position: absolute;
  right: 8px;
  z-index: 10;
  background-color: white;
  border-radius: 50%;
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

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  padding: 10px;
  border-radius: 10px;
  width: fit-content;
  margin-left: auto;
}

.dots span {
  width: 8px;
  height: 8px;
  margin: 0 2px;
  background: black;
  border-radius: 50%;
  display: inline-block;
  animation: blink 1.5s infinite ease-in-out both;
}

.dots span:nth-child(1) {
  animation-delay: 0s;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0% {
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.3;
  }
}

.emoji-picker-container {
  position: absolute;
  bottom: 180px;
  /* adjust to lift it above input */
  /* or align with your emoji icon */
  z-index: 1000;
  width: 300px;
  /* smaller than default */
  max-height: 250px;
  overflow-y: auto;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px;
}
</style>
