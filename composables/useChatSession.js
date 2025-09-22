// composables/useChatSession.js
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useDb } from "@/composables/useDB";

const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000000";

export function useChatSession() {
  const authStore = useAuthStore();
  const { insertMessage, getMessagesBetweenUsers } = useDb();

  const isLimited = computed(() => !authStore.userProfile?.user_id);
  const messages = ref([]);
  const fakeUserId = ref(LOCAL_USER_ID);
  const isTyping = ref(false);


  const sortMessagesChronologically = () => {
    messages.value.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const sendMessage = async (toUserId, content, options = {}) => {
    console.log("[useChatSession] sendMessage called with:", {
      toUserId,
      content,
      options,
    });

    const isAnon = isLimited.value;
    const fromUserId =
      options.sender_id || (isAnon ? LOCAL_USER_ID : authStore.user?.id);

    const {
      file_url = null,
      file_type = null,
      file_name = null,
      reply_to_id = null,
      skipAI = false,
    } = options;

    const message = {
      id: isAnon ? Date.now() : crypto.randomUUID(),
      sender_id: fromUserId,
      receiver_id: toUserId,
      content,
      created_at: new Date().toISOString(),
      file_url,
      file_type,
      file_name,
      localOnly: isAnon,
    };

    messages.value.push(message);
    sortMessagesChronologically();

    const isChatty = toUserId === "a3962087-516b-48df-a3ff-3b070406d832";

    if (isChatty && !skipAI) {
      await sendAIResponse(content, toUserId, fromUserId, isAnon);
    }

    if (!isAnon) {
      try {
        const result = await insertMessage(
          toUserId,
          fromUserId,
          content,
          reply_to_id,
          file_url,
          file_type,
          file_name
        );

        if (result?.length) {
          message.id = result[0].id;
          message.localOnly = false;
        }
      } catch (err) {
        console.error("[ChatSession] Failed to insert message:", err.message);
      }
    }
  };

const sendAIResponse = async (userMessage, aiUserId, userId, isAnon) => {
  try {
    isTyping.value = true;

    const typingMessage = {
      id: `typing-${Date.now()}`,
      sender_id: aiUserId,
      receiver_id: userId,
      content: "...",
      created_at: new Date().toISOString(),
      localOnly: true,
      isTypingPlaceholder: true,
    };

    messages.value.push(typingMessage);
    sortMessagesChronologically();

    const payload = {
      aiUser: "imchatty",
      userName: authStore.userProfile?.displayname || "Guest",
      userMessage,
      messages: messages.value.filter((m) => !m.isTypingPlaceholder).slice(-10),
      userGender: authStore.userProfile?.gender || null,
      userAge: authStore.userProfile?.age || null,
      replyTo: null, // optionally wire in reply message content
    };

    const res = await fetch("/api/aiChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    await new Promise((resolve) => setTimeout(resolve, 600));

    const index = messages.value.findIndex(
      (msg) => msg.id === typingMessage.id
    );
    if (index !== -1) messages.value.splice(index, 1);

    const responseMessage = {
      id: Date.now() + 1,
      sender_id: aiUserId,
      receiver_id: userId,
      content:
        data.success && data.aiResponse
          ? data.aiResponse
          : "Sorry, I didn't understand that. Can you try again?",
      created_at: new Date().toISOString(),
      localOnly: true,
    };

    // ✅ Insert to DB if user is NOT anonymous
    if (!isAnon) {
      try {
        const result = await insertMessage(
          userId, // toUserId
          aiUserId, // fromUserId (Imchatty)
          responseMessage.content
        );

        if (result?.length) {
          responseMessage.id = result[0].id;
          responseMessage.localOnly = false;
        }
      } catch (err) {
        console.error("[sendAIResponse] Failed to insert AI response:", err);
      }
    }

    messages.value.push(responseMessage);
  } catch (err) {
    console.error("[ChatSession] AI response error:", err);

    messages.value.push({
      id: Date.now() + 2,
      sender_id: aiUserId,
      receiver_id: userId,
      content: "Oops! Something went wrong. Please try again shortly.",
      created_at: new Date().toISOString(),
      localOnly: true,
    });
    sortMessagesChronologically(); 
  } finally {
    isTyping.value = false;
  }
};

  const loadMessages = async (toUserId) => {
    if (isLimited.value) return;

    const fromUserId = authStore.user?.id;
    const data = await getMessagesBetweenUsers(fromUserId, toUserId);
    messages.value = data.reverse();
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const loadMessagesWithUser = async (_fromUserId, _toUserId, opts = {}) => {
    if (isLimited.value) return;

    const fromUserId =
      typeof _fromUserId === "object"
        ? _fromUserId?.id || _fromUserId?.user_id
        : _fromUserId;

    const toUserId =
      typeof _toUserId === "object"
        ? _toUserId?.id || _toUserId?.user_id
        : _toUserId;

    if (
      !fromUserId ||
      !toUserId ||
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string"
    ) {
      console.warn("[loadMessagesWithUser] Invalid user IDs:", {
        fromUserId,
        toUserId,
      });
      return;
    }

    try {
      const dbMessages = await getMessagesBetweenUsers(
        fromUserId,
        toUserId,
        opts.before
      );

      const cleaned = dbMessages
        .filter(
          (msg) =>
            !opts.blockedUserIds?.includes(msg.sender_id) &&
            !opts.blockedUserIds?.includes(msg.receiver_id)
        )
        .map((msg) => ({
          id: msg.id,
          sender: msg.profiles?.displayname || null,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          content: msg.content,
          created_at: msg.created_at,
          read: msg.read,
          reply_to: msg.reply_to,
          file_url: msg.file_url,
          file_type: msg.file_type,
          file_name: msg.file_name,
          localOnly: false,
        }));

      const existingIds = new Set(messages.value.map((m) => m.id));
      const newMessages = cleaned.filter((m) => !existingIds.has(m.id));

      messages.value = [...newMessages, ...messages.value];
      sortMessagesChronologically();
    } catch (e) {
      console.error("[ChatSession] Failed to load messages:", e);
    }
  };

  return {
    messages,
    sendMessage,
    loadMessages,
    loadMessagesWithUser,
    clearMessages,
    isLimited,
    fakeUserId,
  };
}
