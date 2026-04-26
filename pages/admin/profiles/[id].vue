<template>
  <section class="admin-profile-shell mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-8 pt-2 sm:px-6 lg:px-8">
    <div>
      <NuxtLink
        :to="localPath('/admin')"
        class="admin-profile-back"
      >
        <i class="mdi mdi-arrow-left admin-profile-back__icon" aria-hidden="true" />
        <span>Back to Admin</span>
      </NuxtLink>
    </div>

    <div
      v-if="loadError"
      class="admin-profile-banner admin-profile-banner--error"
      role="alert"
    >
      {{ loadError }}
    </div>
    <LoadingContainer v-else-if="loading" text="Loading profile..." />
    <template v-else>
      <SettingsProfileForm
        v-if="userProfile"
        :userProfile="userProfile"
        :adminMode="true"
        @openPhotoLibrary="photoLibraryDialog = true"
      />

      <section
        v-if="userProfile && isAdmin"
        class="admin-profile-card mt-4"
      >
        <div class="admin-profile-card__header">
          <div>
            <h2 class="admin-profile-card__title">Simulated Inbox</h2>
            <p class="admin-profile-card__subtitle">
              Review recent incoming messages, reply as the selected user, or clean up a thread.
            </p>
          </div>
        </div>
        <div class="admin-profile-card__body">
          <div class="inbox-actions mb-3 flex flex-wrap items-end gap-2">
            <button
              type="button"
              class="admin-profile-button inbox-action-btn"
              :disabled="inboxLoading"
              @click="loadInbox"
            >
              <span v-if="inboxLoading" class="admin-profile-button__spinner" aria-hidden="true" />
              Refresh inbox
            </button>

            <label class="admin-profile-field delete-peer-select">
              <span class="admin-profile-field__label">Select user</span>
              <select v-model="deletePeerId" class="admin-profile-field__control">
                <option value="">Choose a user</option>
                <option
                  v-for="peer in peerOptions"
                  :key="peer.value"
                  :value="peer.value"
                >
                  {{ peer.label }}
                </option>
              </select>
            </label>

            <button
              type="button"
              class="admin-profile-button admin-profile-button--danger inbox-action-btn"
              :disabled="deleteBusy || !deletePeerId"
              @click="deletePeerDialog = true"
            >
              Delete with selected user
            </button>

            <button
              type="button"
              class="admin-profile-button admin-profile-button--danger inbox-action-btn"
              :disabled="deleteBusy || !userProfile?.user_id"
              @click="deleteDialog = true"
            >
              Delete all messages
            </button>

            <span v-if="inboxError" class="admin-profile-inline-error">
              {{ inboxError }}
            </span>
          </div>

          <div v-if="inboxMessages.length" class="admin-inbox-list">
            <article
              v-for="msg in inboxMessages"
              :key="msg.id"
              class="admin-inbox-item"
            >
              <div class="admin-inbox-item__header">
                <div class="admin-inbox-item__sender">
                  <span v-if="!msg.read" class="inbox-dot" />
                  <span>
                    {{ msg.sender?.translated_displayname || msg.sender?.displayname || msg.sender_id }}
                  </span>
                  <span
                    v-if="msg.sender?.translated_displayname"
                    class="admin-inbox-item__sender-original"
                  >
                    ({{ msg.sender.displayname }})
                  </span>
                </div>
                <div class="admin-inbox-item__meta">
                  <span
                    class="admin-inbox-status"
                    :class="msg.read ? 'admin-inbox-status--read' : 'admin-inbox-status--unread'"
                  >
                    {{ msg.read ? "Read" : "Unread" }}
                  </span>
                  <span class="admin-inbox-item__timestamp">
                    {{ formatTimestamp(msg.created_at) }}
                  </span>
                </div>
              </div>

              <div class="admin-inbox-item__body">
                {{ msg.translated_content || msg.content }}
                <span
                  v-if="msg.translated_content"
                  class="admin-inbox-item__original-message"
                >
                  {{ msg.content }}
                </span>
              </div>

              <div class="admin-inbox-item__actions">
                <button
                  v-if="!msg.read"
                  type="button"
                  class="admin-profile-text-button"
                  @click="markMessageRead(msg)"
                >
                  Mark read
                </button>
                <button
                  type="button"
                  class="admin-profile-text-button admin-profile-text-button--primary"
                  @click="prefillReply(msg)"
                >
                  Reply
                </button>
              </div>
            </article>
          </div>
          <div v-else class="admin-profile-empty-state">
            No incoming messages yet.
          </div>

          <div class="admin-profile-divider" />

          <div class="admin-profile-compose">
            <div class="admin-profile-compose__title">Send message as user</div>

            <label class="admin-profile-field">
              <span class="admin-profile-field__label">Receiver user id</span>
              <input
                v-model="compose.receiverId"
                type="text"
                class="admin-profile-field__control"
              >
            </label>

            <label class="admin-profile-field">
              <span class="admin-profile-field__label">Message</span>
              <textarea
                v-model="compose.content"
                rows="3"
                class="admin-profile-field__control admin-profile-field__control--textarea"
              ></textarea>
            </label>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="admin-profile-button admin-profile-button--primary"
              :disabled="sendBusy"
              @click="sendMessageAsUser"
            >
              <span v-if="sendBusy" class="admin-profile-button__spinner" aria-hidden="true" />
              Send
            </button>
            <span v-if="sendStatus" class="admin-profile-inline-status">
              {{ sendStatus }}
            </span>
          </div>
        </div>
      </section>

      <div
        v-if="!userProfile"
        class="admin-profile-banner admin-profile-banner--info"
        role="status"
      >
        Profile not found.
      </div>

      <section v-if="userProfile" class="admin-profile-card mt-4">
        <div class="admin-profile-card__header">
          <div>
            <h2 class="admin-profile-card__title">Email Notifications</h2>
          </div>
        </div>
        <div class="admin-profile-card__body">
          <p class="admin-profile-copy mb-3">
            Send a test email to this user's confirmed address. Test sends are
            preview-only and do <strong>not</strong> mark pending interactions as sent.
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="admin-profile-button"
              :disabled="testEmailLoading"
              @click="sendTestEmail('weekly_digest')"
            >
              <i class="mdi mdi-email-outline admin-profile-button__icon" aria-hidden="true" />
              <span v-if="testEmailLoading" class="admin-profile-button__spinner" aria-hidden="true" />
              Send test: Weekly Digest
            </button>
          </div>
          <div
            v-if="testEmailStatus"
            class="admin-profile-banner mt-3"
            :class="testEmailError ? 'admin-profile-banner--error' : 'admin-profile-banner--success'"
            role="status"
          >
            {{ testEmailStatus }}
          </div>
        </div>
      </section>

      <Teleport to="body">
        <Transition name="admin-profile-modal-fade">
          <div
            v-if="photoLibraryDialog"
            class="admin-profile-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-profile-modal-backdrop"
              aria-label="Close photo library"
              @click="photoLibraryDialog = false"
            />
            <div
              class="admin-profile-modal admin-profile-modal--wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-photo-library-title"
            >
              <div class="admin-profile-modal__card">
                <div class="admin-profile-modal__header">
                  <h2 id="admin-photo-library-title" class="admin-profile-modal__title">
                    Photo Library
                  </h2>
                  <button
                    type="button"
                    class="admin-profile-icon-button"
                    aria-label="Close photo library"
                    @click="photoLibraryDialog = false"
                  >
                    <i class="mdi mdi-close" aria-hidden="true" />
                  </button>
                </div>
                <div class="admin-profile-modal__body">
                  <SettingsPhotoLibrary
                    v-if="userProfile?.user_id"
                    :userId="userProfile.user_id"
                    :adminMode="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="admin-profile-modal-fade">
          <div
            v-if="deleteDialog"
            class="admin-profile-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-profile-modal-backdrop"
              aria-label="Close delete dialog"
              @click="deleteDialog = false"
            />
            <div
              class="admin-profile-modal admin-profile-modal--compact"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-delete-all-title"
            >
              <div class="admin-profile-modal__card">
                <div class="admin-profile-modal__header">
                  <h2 id="admin-delete-all-title" class="admin-profile-modal__title">
                    Delete all messages?
                  </h2>
                </div>
                <div class="admin-profile-modal__body">
                  <p class="admin-profile-copy">
                    This will permanently delete all messages sent or received by this
                    user. This cannot be undone.
                  </p>
                </div>
                <div class="admin-profile-modal__actions">
                  <button
                    type="button"
                    class="admin-profile-button"
                    @click="deleteDialog = false"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="admin-profile-button admin-profile-button--danger"
                    :disabled="deleteBusy"
                    @click="deleteAllMessages"
                  >
                    <span v-if="deleteBusy" class="admin-profile-button__spinner" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="admin-profile-modal-fade">
          <div
            v-if="deletePeerDialog"
            class="admin-profile-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-profile-modal-backdrop"
              aria-label="Close peer delete dialog"
              @click="deletePeerDialog = false"
            />
            <div
              class="admin-profile-modal admin-profile-modal--compact"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-delete-peer-title"
            >
              <div class="admin-profile-modal__card">
                <div class="admin-profile-modal__header">
                  <h2 id="admin-delete-peer-title" class="admin-profile-modal__title">
                    Delete messages with selected user?
                  </h2>
                </div>
                <div class="admin-profile-modal__body">
                  <p class="admin-profile-copy">
                    This will permanently delete all messages between this user and the
                    selected user. This cannot be undone.
                  </p>
                </div>
                <div class="admin-profile-modal__actions">
                  <button
                    type="button"
                    class="admin-profile-button"
                    @click="deletePeerDialog = false"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="admin-profile-button admin-profile-button--danger"
                    :disabled="deleteBusy"
                    @click="deleteMessagesWithPeer"
                  >
                    <span v-if="deleteBusy" class="admin-profile-button__spinner" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </section>
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
const photoLibraryDialog = ref(false);
const testEmailLoading = ref(false);
const testEmailStatus = ref("");
const testEmailError = ref(false);

const sendTestEmail = async (type) => {
  if (!userProfile.value?.user_id) return;
  testEmailLoading.value = true;
  testEmailStatus.value = "";
  testEmailError.value = false;
  try {
    const res = await $fetch("/api/admin/notifications/test-email", {
      method: "POST",
      body: { userId: userProfile.value.user_id, type },
    });
    testEmailStatus.value = `Sent to ${res.sentTo}`;
  } catch (err) {
    testEmailError.value = true;
    testEmailStatus.value = err?.data?.error ?? "Failed to send test email.";
  } finally {
    testEmailLoading.value = false;
    setTimeout(() => { testEmailStatus.value = ""; }, 5000);
  }
};

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
        locale: "en",
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

const getAdminErrorMessage = (error, fallback) => {
  return (
    error?.data?.error?.message ||
    error?.data?.statusMessage ||
    error?.message ||
    fallback
  );
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
    deleteDialog.value = false;
    deletePeerId.value = "";
    await loadInbox();
  } catch (error) {
    console.error("[admin][profile] delete messages error", error);
    inboxError.value = getAdminErrorMessage(error, "Unable to delete messages");
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
    deletePeerId.value = "";
    await loadInbox();
  } catch (error) {
    console.error("[admin][profile] delete peer messages error", error);
    inboxError.value = getAdminErrorMessage(error, "Unable to delete messages");
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
.admin-profile-shell {
  padding-top: 6px;
}

.admin-profile-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.85);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 10px 14px;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.admin-profile-back:hover {
  border-color: rgba(var(--color-primary), 0.45);
  background: rgba(var(--color-surface-elevated), 0.98);
  transform: translateY(-1px);
}

.admin-profile-back__icon {
  font-size: 1rem;
}

.admin-profile-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-profile-card__header {
  padding: 20px 22px 0;
}

.admin-profile-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-profile-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-profile-card__body {
  padding: 20px 22px 22px;
}

.admin-profile-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.admin-profile-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-profile-banner--success {
  border-color: rgba(34, 197, 94, 0.32);
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.admin-profile-banner--info {
  border-color: rgba(var(--color-primary), 0.26);
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-text));
}

.admin-profile-button,
.inbox-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 16px;
  font-size: 0.92rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
  flex: 0 0 auto;
  white-space: nowrap;
}

.admin-profile-button:hover,
.inbox-action-btn:hover {
  border-color: rgba(var(--color-primary), 0.45);
  background: rgba(var(--color-surface-elevated), 0.98);
}

.admin-profile-button--primary {
  border-color: rgba(var(--color-primary), 0.35);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.admin-profile-button--danger {
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.11);
  color: rgb(185, 28, 28);
}

.admin-profile-button--disabled,
.admin-profile-button:disabled,
.inbox-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.admin-profile-button__icon {
  font-size: 1rem;
}

.admin-profile-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: admin-profile-spin 0.8s linear infinite;
}

.admin-profile-inline-error {
  color: rgb(185, 28, 28);
  font-size: 0.8rem;
}

.admin-profile-inline-status {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.82rem;
}

.inbox-actions {
  row-gap: 8px;
}

.admin-profile-field {
  display: flex;
  min-width: 0;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 6px;
}

.admin-profile-field__label,
.admin-profile-compose__title {
  color: rgba(var(--color-text), 0.7);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-profile-field__control {
  width: 100%;
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
  color-scheme: light dark;
}

.admin-profile-field__control:focus {
  border-color: rgba(var(--color-primary), 0.52);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.12);
}

.admin-profile-field__control--textarea {
  min-height: 112px;
  resize: vertical;
  border-radius: 18px;
}

.delete-peer-select {
  min-width: 200px;
  flex: 1 1 220px;
}

.admin-inbox-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-inbox-item {
  border: 1px solid rgba(var(--color-border), 0.8);
  border-radius: 18px;
  background: rgba(var(--color-surface), 0.88);
  padding: 14px 16px;
}

.admin-inbox-item__header,
.admin-inbox-item__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-inbox-item__sender {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--color-heading));
  font-size: 0.95rem;
  font-weight: 600;
}

.admin-inbox-item__sender-original,
.admin-inbox-item__timestamp,
.admin-inbox-item__original-message,
.admin-profile-empty-state,
.admin-profile-copy {
  color: rgba(var(--color-text), 0.7);
  font-size: 0.82rem;
}

.admin-inbox-item__meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.admin-inbox-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 700;
}

.admin-inbox-status--read {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.admin-inbox-status--unread {
  background: rgba(100, 116, 139, 0.14);
  color: rgb(71, 85, 105);
}

.admin-inbox-item__body {
  margin-top: 10px;
  color: rgb(var(--color-text));
  font-size: 0.94rem;
  line-height: 1.55;
}

.admin-inbox-item__original-message {
  display: block;
  margin-top: 6px;
}

.admin-inbox-item__actions {
  justify-content: flex-end;
  margin-top: 12px;
}

.admin-profile-text-button {
  border: 0;
  background: transparent;
  color: rgba(var(--color-text), 0.66);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.admin-profile-text-button--primary {
  color: rgb(var(--color-primary));
}

.admin-profile-divider {
  height: 1px;
  margin: 20px 0;
  background: rgba(var(--color-border), 0.8);
}

.admin-profile-compose {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-profile-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-profile-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.56);
}

.admin-profile-modal {
  position: relative;
  width: min(100%, 980px);
  max-height: calc(100vh - 40px);
}

.admin-profile-modal--compact {
  width: min(100%, 480px);
}

.admin-profile-modal__card {
  position: relative;
  display: flex;
  max-height: inherit;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

.admin-profile-modal__header,
.admin-profile-modal__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.admin-profile-modal__header {
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.admin-profile-modal__body {
  overflow: auto;
  padding: 20px;
}

.admin-profile-modal__actions {
  justify-content: flex-end;
  border-top: 1px solid rgba(var(--color-border), 0.82);
}

.admin-profile-modal__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-profile-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(var(--color-border), 0.86);
  border-radius: 999px;
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
}

.admin-profile-modal-fade-enter-active,
.admin-profile-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.admin-profile-modal-fade-enter-from,
.admin-profile-modal-fade-leave-to {
  opacity: 0;
}

.inbox-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #e53935;
  margin-right: 6px;
  vertical-align: middle;
}

@media (max-width: 600px) {
  .inbox-actions {
    align-items: stretch !important;
  }

  .admin-inbox-item__header,
  .admin-inbox-item__actions,
  .admin-inbox-item__meta,
  .admin-profile-modal__header,
  .admin-profile-modal__actions {
    flex-wrap: wrap;
  }

  .admin-profile-modal-layer {
    padding: 12px;
  }

  .delete-peer-select,
  .inbox-action-btn {
    width: 100%;
    flex: 1 1 100%;
  }
}

@keyframes admin-profile-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
