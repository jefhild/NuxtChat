<template>
  <v-card class="pa-4" elevation="1">
    <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
      <div>
        <div class="text-subtitle-1 font-weight-medium">
          {{ titleText }}
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ subtitleText }}
        </div>
      </div>
    </div>

    <v-skeleton-loader
      v-if="isLoading || waitingForKey"
      type="list-item@4"
      class="pa-2"
    />

    <v-alert
      v-else-if="!hasThreadKey"
      type="info"
      variant="tonal"
      class="mb-3"
    >
      Discussion isn't available for this article yet.
    </v-alert>

    <v-alert
      v-else-if="loadError"
      type="warning"
      variant="tonal"
      class="mb-3"
    >
      Discussion isn't available right now. Please try again soon.
    </v-alert>

    <template v-else>
      <ArticlesCommentList
        v-if="messagesForUI.length"
        :messages="messagesForUI"
        :me-id="auth.user?.id || null"
        :loading="isLoading"
        :can-reply="Boolean(auth.user?.id)"
        @send-reply="handleReply"
        @vote="voteOnMessage"
        @menu="openMessageMenu"
        @login-request="redirectToLogin"
      />
      <div v-else class="text-body-2 text-medium-emphasis mb-4">
        Be the first to comment.
      </div>
    </template>

    <div class="border-t pt-2">
      <ChatLayoutMessageComposer
        v-model:draft="draft"
        :peer-id="threadId"
        :me-id="auth.user?.id || null"
        :conversation-key="threadId ? `thread:${threadId}` : null"
        :disabled="!auth.user?.id || !threadId"
        class="w-100 mx-auto"
        @send="onSend"
      />
    </div>
  </v-card>

  <v-menu
    v-model="menu.open"
    :activator="menu.activator"
    location="bottom end"
    origin="top end"
    :close-on-content-click="true"
    transition="fade-transition"
  >
    <v-list density="compact" min-width="180">
      <v-list-item
        :disabled="!isAuthed"
        prepend-icon="mdi-flag"
        @click="onReport"
      >
        <v-list-item-title>Report</v-list-item-title>
      </v-list-item>

      <v-list-item
        v-if="!isAuthed"
        :to="{ path: '/signin', query: { redirect: route.fullPath } }"
        prepend-icon="mdi-login"
      >
        <v-list-item-title>Sign in</v-list-item-title>
      </v-list-item>

      <v-list-item
        v-if="canShowDeleteSelected"
        prepend-icon="mdi-delete"
        :disabled="deletingMessage"
        @click="onDelete"
      >
        <v-list-item-title>
          {{ deletingMessage ? "Deleting..." : "Delete message" }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import { computed, ref, watch, reactive, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useArticleThread } from "@/composables/articles/useArticleThread";

const props = defineProps({
  threadKey: { type: String, default: null },
  title: { type: String, default: "Discussion" },
  subtitle: {
    type: String,
    default: "Join the conversation about this article.",
  },
});

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { locale } = useI18n();

const draft = ref("");
const threadId = ref("");
const loadError = ref(null);
const waitingForKey = computed(() => props.threadKey == null);
const hasThreadKey = computed(
  () => typeof props.threadKey === "string" && props.threadKey.length > 0
);
const titleText = computed(() => props.title || "Discussion");
const subtitleText = computed(
  () => props.subtitle || "Join the conversation about this article."
);

const initialItems = ref([]);
const loadingInit = ref(false);

const { messages, isLoading: loadingMsgs, send, seed } =
  useArticleThread(threadId, locale);

const isLoading = computed(() => loadingInit.value || loadingMsgs.value);

const fetchThread = async (key) => {
  if (!key) return;
  loadingInit.value = true;
  loadError.value = null;
  try {
    const res = await $fetch(
      `/api/articles/threads/${encodeURIComponent(key)}/messages`,
      { query: { limit: 50, locale: locale.value } }
    );
    const thread = res?.thread || null;
    initialItems.value = Array.isArray(res?.items) ? res.items : [];
    if (thread?.id) {
      threadId.value = thread.id;
    }
    if (initialItems.value.length) {
      seed(initialItems.value);
    }
  } catch (err) {
    loadError.value = err;
  } finally {
    loadingInit.value = false;
  }
};

watch(
  () => props.threadKey,
  (key) => {
    if (key) fetchThread(key);
  },
  { immediate: true }
);

watch(
  () => locale.value,
  () => {
    if (props.threadKey) fetchThread(props.threadKey);
  }
);

function onSend(text) {
  if (!text?.trim()) return;
  send(text).catch((err) => {
    console.error("send failed:", err);
  });
}

function handleReply({ id, text }) {
  if (!text?.trim()) return;
  send(text, { replyToId: id }).catch((err) => {
    console.error("reply failed:", err);
  });
}

function getAuthorId(m) {
  return m?.authorId ?? m?.senderUserId ?? m?.sender_user_id ?? null;
}

const messagesForUI = computed(() => {
  const base = messages.value?.length ? messages.value : initialItems.value;
  return (base || []).map((raw) => {
    const authorId = getAuthorId(raw);
    const authorProfile = raw.author ?? null;

    const displaynameFromMeta =
      raw?.meta?.persona_displayname || raw?.meta?.persona_key || null;
    const avatarFromMeta = raw?.meta?.persona_avatar_url || null;
    const displayLocale = String(raw?.displayLocale || locale.value || "en");
    const sourceLocale = String(
      raw?.sourceLocale || raw?.meta?.source_locale || ""
    );
    const contentNow = String(raw?.content || "");
    const originalContent = String(raw?.originalContent || "");
    const isTranslated =
      Boolean(sourceLocale) &&
      Boolean(displayLocale) &&
      sourceLocale !== displayLocale &&
      Boolean(originalContent) &&
      originalContent !== contentNow;
    const languageLabelByCode = {
      en: "English",
      fr: "French",
      ru: "Russian",
      zh: "Chinese",
    };
    const sourceLanguage =
      languageLabelByCode[sourceLocale] || sourceLocale.toUpperCase();
    const translationLabel = isTranslated
      ? `Translated from ${sourceLanguage}`
      : null;

    return {
      ...raw,
      authorId,
      author: raw.author ?? authorProfile ?? null,
      displayname:
        raw.displayname ??
        authorProfile?.displayname ??
        (raw.senderKind !== "user" ? displaynameFromMeta : null) ??
        "User",
      avatarUrl:
        raw.avatarUrl ??
        authorProfile?.avatarUrl ??
        (raw.senderKind !== "user" ? avatarFromMeta : null) ??
        null,
      isTranslated,
      translationLabel,
    };
  });
});

function voteOnMessage({ id, myVote, score, today }) {
  const i = messages.value.findIndex((m) => m.id === id);
  if (i !== -1) {
    messages.value[i] = { ...messages.value[i], myVote, score, today };
  }
}

const menu = reactive({ open: false, activator: null, id: null });
const isAuthed = computed(() => Boolean(auth.user?.id));

function openMessageMenu({ id, el }) {
  menu.open = false;
  menu.activator = null;
  menu.id = id || null;
  nextTick(() => {
    menu.activator = el || null;
    menu.open = !!menu.activator;
  });
}

const isAdmin = computed(() => Boolean(auth.userProfile?.is_admin));
const canDeleteSelected = computed(() => Boolean(menu.id) && isAdmin.value);
const isMountedClient = ref(false);
const canShowDeleteSelected = computed(
  () => isMountedClient.value && canDeleteSelected.value
);
const deletingMessage = ref(false);

onMounted(() => {
  isMountedClient.value = true;
});

function onReport() {
  menu.open = false;
}

function onDelete() {
  if (!menu.id || !isAdmin.value || deletingMessage.value) {
    menu.open = false;
    return;
  }
  const messageId = menu.id;
  menu.open = false;
  deletingMessage.value = true;
  $fetch(`/api/admin/discussion-messages/${messageId}`, { method: "DELETE" })
    .then(() => {
      messages.value = (messages.value || []).filter((m) => m.id !== messageId);
      initialItems.value = (initialItems.value || []).filter(
        (m) => m.id !== messageId
      );
    })
    .catch((err) => {
      console.error(
        "[discussion] delete message failed:",
        err?.data?.error || err?.data || err
      );
    })
    .finally(() => {
      deletingMessage.value = false;
    });
}

function redirectToLogin() {
  router.push({ path: "/signin", query: { redirect: route.fullPath } });
}
</script>
