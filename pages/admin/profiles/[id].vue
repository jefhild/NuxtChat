<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-btn
          variant="text"
          prepend-icon="mdi-arrow-left"
          :to="localPath('/admin')"
        >
          Back to Admin
        </v-btn>
      </v-col>
      <v-col cols="12">
        <v-alert
          v-if="loadError"
          type="error"
          variant="tonal"
          class="mb-4"
          border="start"
          border-color="red"
        >
          {{ loadError }}
        </v-alert>
        <LoadingContainer v-else-if="loading" text="Loading profile..." />
        <template v-else>
          <SettingsProfileForm
            v-if="userProfile"
            :userProfile="userProfile"
            :adminMode="true"
          />
          <v-card
            v-if="userProfile && isAdmin"
            class="mt-4"
            variant="outlined"
          >
            <v-card-title>Simulated Inbox</v-card-title>
            <v-card-text>
              <div class="inbox-actions d-flex align-center ga-2 mb-3 flex-wrap">
                <v-btn
                  class="inbox-action-btn"
                  variant="outlined"
                  size="small"
                  :loading="inboxLoading"
                  @click="loadInbox"
                >
                  Refresh inbox
                </v-btn>
                <v-select
                  v-model="deletePeerId"
                  :items="peerOptions"
                  item-title="label"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  label="Select user"
                  class="delete-peer-select"
                  hide-details
                />
                <v-btn
                  class="inbox-action-btn"
                  variant="outlined"
                  size="small"
                  color="error"
                  :disabled="deleteBusy || !deletePeerId"
                  :loading="deleteBusy"
                  @click="deletePeerDialog = true"
                >
                  Delete with selected user
                </v-btn>
                <v-btn
                  class="inbox-action-btn"
                  variant="outlined"
                  size="small"
                  color="error"
                  :disabled="deleteBusy || !userProfile?.user_id"
                  :loading="deleteBusy"
                  @click="deleteDialog = true"
                >
                  Delete all messages
                </v-btn>
                <span v-if="inboxError" class="text-caption text-error">
                  {{ inboxError }}
                </span>
              </div>

              <v-list v-if="inboxMessages.length" density="compact">
                <v-list-item
                  v-for="msg in inboxMessages"
                  :key="msg.id"
                  class="px-0"
                >
                  <v-list-item-title class="text-body-2">
                    <span v-if="!msg.read" class="inbox-dot" />
                    {{ msg.sender?.displayname || msg.sender_id }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ msg.content }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip
                      size="x-small"
                      :color="msg.read ? 'green' : 'grey'"
                      variant="tonal"
                      class="mr-2"
                    >
                      {{ msg.read ? "Read" : "Unread" }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis mr-2">
                      {{ formatTimestamp(msg.created_at) }}
                    </div>
                    <v-btn
                      v-if="!msg.read"
                      size="x-small"
                      variant="text"
                      color="grey"
                      @click="markMessageRead(msg)"
                    >
                      Mark read
                    </v-btn>
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="primary"
                      @click="prefillReply(msg)"
                    >
                      Reply
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
              <div v-else class="text-caption text-medium-emphasis">
                No incoming messages yet.
              </div>

              <v-divider class="my-4" />

              <div class="text-subtitle-2 mb-2">Send message as user</div>
              <v-text-field
                v-model="compose.receiverId"
                label="Receiver user id"
                density="compact"
                variant="outlined"
                hide-details
              />
              <v-textarea
                v-model="compose.content"
                label="Message"
                rows="3"
                density="compact"
                variant="outlined"
              />
              <div class="d-flex align-center ga-2 mt-2">
                <v-btn
                  color="primary"
                  :loading="sendBusy"
                  @click="sendMessageAsUser"
                >
                  Send
                </v-btn>
                <span v-if="sendStatus" class="text-caption">
                  {{ sendStatus }}
                </span>
              </div>
            </v-card-text>
          </v-card>
          <v-dialog v-model="deleteDialog" max-width="480">
            <v-card>
              <v-card-title class="text-h6">
                Delete all messages?
              </v-card-title>
              <v-card-text>
                This will permanently delete all messages sent or received by this
                user. This cannot be undone.
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn variant="text" @click="deleteDialog = false">
                  Cancel
                </v-btn>
                <v-btn
                  color="error"
                  :loading="deleteBusy"
                  @click="deleteAllMessages"
                >
                  Delete
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-dialog v-model="deletePeerDialog" max-width="480">
            <v-card>
              <v-card-title class="text-h6">
                Delete messages with selected user?
              </v-card-title>
              <v-card-text>
                This will permanently delete all messages between this user and the
                selected user. This cannot be undone.
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn variant="text" @click="deletePeerDialog = false">
                  Cancel
                </v-btn>
                <v-btn
                  color="error"
                  :loading="deleteBusy"
                  @click="deleteMessagesWithPeer"
                >
                  Delete
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-alert
            v-if="!userProfile"
            type="info"
            variant="tonal"
            class="mb-4"
            border="start"
            border-color="primary"
          >
            Profile not found.
          </v-alert>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();
const route = useRoute();
const { getUserProfileFromId } = useDb();

const userProfile = ref(null);
const loading = ref(true);
const loadError = ref("");
const isAdmin = computed(() => !!authStore.userProfile?.is_admin);

const inboxMessages = ref([]);
const inboxLoading = ref(false);
const inboxError = ref("");
const deleteDialog = ref(false);
const deletePeerDialog = ref(false);
const deleteBusy = ref(false);
const deletePeerId = ref("");

const peerOptions = computed(() => {
  const map = new Map();
  for (const msg of inboxMessages.value || []) {
    if (msg?.sender_id && msg?.sender_id !== userProfile.value?.user_id) {
      if (!map.has(msg.sender_id)) {
        map.set(
          msg.sender_id,
          msg.sender?.displayname || msg.sender_id
        );
      }
    }
  }
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const compose = reactive({
  receiverId: "",
  content: "",
});
const sendBusy = ref(false);
const sendStatus = ref("");

const fetchProfile = async () => {
  const userId = String(route.params.id || "");
  if (!userId) {
    loadError.value = "Missing profile id.";
    return;
  }

  try {
    const { data, error } = await getUserProfileFromId(userId);
    if (error) throw error;
    userProfile.value = data;
  } catch (error) {
    console.error("[admin][profile] load error", error);
    loadError.value =
      error?.message || "Unable to load the selected profile.";
  }
};

const loadInbox = async () => {
  if (!userProfile.value?.user_id) return;
  inboxLoading.value = true;
  inboxError.value = "";
  try {
    const res = await $fetch("/api/admin/messages", {
      query: {
        user_id: userProfile.value.user_id,
        limit: 25,
      },
    });
    inboxMessages.value = Array.isArray(res?.items) ? res.items : [];
  } catch (error) {
    console.error("[admin][profile] inbox load error", error);
    inboxError.value = "Unable to load inbox";
  } finally {
    inboxLoading.value = false;
  }
};

const prefillReply = (msg) => {
  compose.receiverId = msg?.sender_id || "";
};

const sendMessageAsUser = async () => {
  if (!userProfile.value?.user_id) return;
  sendBusy.value = true;
  sendStatus.value = "";
  try {
    const payload = {
      sender_id: userProfile.value.user_id,
      receiver_id: compose.receiverId,
      content: compose.content,
    };
    await $fetch("/api/admin/messages", {
      method: "POST",
      body: payload,
    });
    compose.content = "";
    sendStatus.value = "Sent";
    await loadInbox();
    if (userProfile.value?.is_simulated) {
      await $fetch("/api/admin/reply-status", {
        query: { user_ids: userProfile.value.user_id },
      });
    }
  } catch (error) {
    console.error("[admin][profile] send error", error);
    sendStatus.value = "Send failed";
  } finally {
    sendBusy.value = false;
    setTimeout(() => {
      sendStatus.value = "";
    }, 2000);
  }
};

const markMessageRead = async (msg) => {
  if (!msg?.id) return;
  try {
    await $fetch("/api/admin/messages-read", {
      method: "POST",
      body: { message_id: msg.id },
    });
    inboxMessages.value = inboxMessages.value.map((item) =>
      item.id === msg.id ? { ...item, read: true } : item
    );
  } catch (error) {
    console.error("[admin][profile] mark read error", error);
  }
};

const deleteAllMessages = async () => {
  if (!userProfile.value?.user_id) return;
  deleteBusy.value = true;
  inboxError.value = "";
  try {
    await $fetch("/api/admin/messages-delete", {
      method: "POST",
      body: { user_id: userProfile.value.user_id },
    });
    inboxMessages.value = [];
    deleteDialog.value = false;
  } catch (error) {
    console.error("[admin][profile] delete messages error", error);
    inboxError.value = "Unable to delete messages";
  } finally {
    deleteBusy.value = false;
  }
};

const deleteMessagesWithPeer = async () => {
  if (!userProfile.value?.user_id || !deletePeerId.value) return;
  deleteBusy.value = true;
  inboxError.value = "";
  try {
    await $fetch("/api/admin/messages-delete", {
      method: "POST",
      body: {
        user_id: userProfile.value.user_id,
        peer_id: deletePeerId.value,
      },
    });
    deletePeerDialog.value = false;
    await loadInbox();
  } catch (error) {
    console.error("[admin][profile] delete peer messages error", error);
    inboxError.value = "Unable to delete messages";
  } finally {
    deleteBusy.value = false;
  }
};

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    router.push(localPath("/"));
    return;
  }

  await fetchProfile();
  await loadInbox();
  loading.value = false;
});
</script>

<style scoped>
.inbox-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #e53935;
  margin-right: 6px;
  vertical-align: middle;
}

.inbox-actions {
  row-gap: 8px;
}

.delete-peer-select {
  min-width: 200px;
  flex: 1 1 220px;
}

.inbox-action-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .inbox-actions {
    align-items: stretch !important;
  }

  .delete-peer-select,
  .inbox-action-btn {
    width: 100%;
    flex: 1 1 100%;
  }
}
</style>
