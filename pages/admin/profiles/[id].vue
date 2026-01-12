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
            <v-card-title>Simulated User Controls</v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-switch
                    v-model="adminFlags.force_online"
                    label="Force online"
                    color="primary"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch
                    v-model="adminFlags.is_simulated"
                    label="Simulated user"
                    color="primary"
                    hide-details
                  />
                </v-col>
              </v-row>
              <div class="d-flex align-center ga-2 mt-2">
                <v-btn
                  color="primary"
                  :loading="flagsSaving"
                  @click="saveAdminFlags"
                >
                  Save flags
                </v-btn>
                <span v-if="flagsStatus" class="text-caption">
                  {{ flagsStatus }}
                </span>
              </div>
            </v-card-text>
          </v-card>

          <v-card
            v-if="userProfile && isAdmin"
            class="mt-4"
            variant="outlined"
          >
            <v-card-title>Simulated Inbox</v-card-title>
            <v-card-text>
              <div class="d-flex align-center ga-2 mb-3">
                <v-btn
                  variant="outlined"
                  size="small"
                  :loading="inboxLoading"
                  @click="loadInbox"
                >
                  Refresh inbox
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
                    {{ msg.sender?.displayname || msg.sender_id }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ msg.content }}
                  </v-list-item-subtitle>
                  <template #append>
                    <div class="text-caption text-medium-emphasis mr-2">
                      {{ formatTimestamp(msg.created_at) }}
                    </div>
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

const adminFlags = reactive({
  force_online: false,
  is_simulated: false,
});
const flagsSaving = ref(false);
const flagsStatus = ref("");

const inboxMessages = ref([]);
const inboxLoading = ref(false);
const inboxError = ref("");

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
    adminFlags.force_online = !!data?.force_online;
    adminFlags.is_simulated = !!data?.is_simulated;
  } catch (error) {
    console.error("[admin][profile] load error", error);
    loadError.value =
      error?.message || "Unable to load the selected profile.";
  }
};

const saveAdminFlags = async () => {
  if (!userProfile.value?.user_id) return;
  flagsSaving.value = true;
  flagsStatus.value = "";
  try {
    const res = await $fetch("/api/admin/profiles-flags", {
      method: "PATCH",
      body: {
        user_id: userProfile.value.user_id,
        force_online: adminFlags.force_online,
        is_simulated: adminFlags.is_simulated,
      },
    });
    if (res?.item) {
      userProfile.value = { ...userProfile.value, ...res.item };
    }
    flagsStatus.value = "Saved";
  } catch (error) {
    console.error("[admin][profile] flags save error", error);
    flagsStatus.value = "Save failed";
  } finally {
    flagsSaving.value = false;
    setTimeout(() => {
      flagsStatus.value = "";
    }, 2000);
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
