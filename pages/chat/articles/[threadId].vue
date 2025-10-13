<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <v-row no-gutters class="min-h-0" style="flex: 0 0 auto">
      <v-col>
        <div class="ml-2 text-subtitle-2 font-weight-medium">Articles</div>
      </v-col>
    </v-row>
    <!-- <HomeRow1 /> -->

    <v-row class="flex-grow-1 overflow-hidden min-h-0">
      <!-- LEFT: Topics -->
      <v-col
        cols="12"
        md="3"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      >
        <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
          <div
            ref="leftScrollRef"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <v-list lines="two" density="comfortable">
              <v-skeleton-loader
                v-if="loadingTopics"
                type="list-item@6"
                class="pa-2"
              />
              <template v-else>
                <v-list-item
                  v-for="t in topics"
                  :key="t.id"
                  :active="t.id === threadId"
                  class="cursor-pointer"
                  @click="openThread(t.id)"
                >
                  <template #prepend>
                    <v-avatar size="28" v-if="t.botAvatarUrl"
                      ><v-img :src="t.botAvatarUrl"
                    /></v-avatar>
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-medium">
                    {{ t.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ formatDateTime(t.lastActivityAt) }}
                    · Today {{ t.todayCount }} · Score {{ t.score }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-list>
          </div>
        </v-card>

        <ClientOnly>
          <ChatLayoutConsentPanel
            :auth-status="auth.authStatus"
            @action="goToImChatty"
          />
        </ClientOnly>
      </v-col>

      <!-- CENTER: Thread messages -->
      <v-col
        cols="12"
        md="7"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      >
        <!-- Sticky header (like your 1–1 layout) -->
        <div class="messages-sticky-header d-none d-md-block">
          <v-card flat class="pa-2">
            <div class="text-subtitle-2 font-weight-medium">Thread</div>
            <div class="text-caption text-medium-emphasis">
              Public to authenticated users
            </div>
          </v-card>
        </div>

        <!-- Scrollable messages list -->
        <div
          ref="centerScrollRef"
          class="flex-grow-1 overflow-auto users-scroll min-h-0 px-2 py-2"
          style="flex: 1 1 0"
        >
          <v-skeleton-loader
            v-if="loadingMsgs"
            type="list-item@6"
            class="pa-2"
          />

          <ArticlesCommentList
            :messages="messagesForUI"
            :me-id="auth.user?.id || null"
            :loading="loadingInit || loadingMsgs"
            :can-reply="Boolean(auth.user?.id)"
            @send-reply="
              ({ id, text }) => {
                replyToId = id;
                onSend(text);
              }
            "
            @vote="({ id, value }) => voteOnMessage(id, value)"
            @menu="(id) => openMessageMenu(id)"
            @login-request="showLoginDialog = true"
          />
        </div>

        <!-- Composer (simple) -->
        <div class="border-t pt-2" style="flex: 0 0 auto">
          <ChatLayoutMessageComposer
            v-model:draft="draft"
            :peer-id="threadId"
            :me-id="auth.user?.id || null"
            :conversation-key="`thread:${threadId}`"
            :disabled="!auth.user?.id"
            class="w-100 mx-auto"
            @send="onSend"
          />
        </div>
      </v-col>

      <!-- RIGHT: Participants -->
      <v-col
        cols="12"
        md="2"
        class="pa-2 d-flex flex-column overflow-hidden d-none d-md-flex min-h-0"
      >
        <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
          <div
            ref="rightScrollRef"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <v-card-title class="text-subtitle-2 py-2"
              >Participants (Now)</v-card-title
            >
            <v-divider />
            <v-list density="compact">
              <v-list-item
                v-if="!now.length"
                title="No one visible right now."
              />
              <template v-else>
                <v-list-item v-for="u in now" :key="u.userId">
                  <template #prepend>
                    <!-- {{ u }} -->
                    <v-avatar size="24" v-if="u.avatarUrl"
                      ><v-img :src="u.avatarUrl"
                    /></v-avatar>
                  </template>
                  <v-list-item-title class="text-body-2">
                    {{ u.displayname || u.userId }}
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, ref, watch, watchEffect } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useArticleThread } from "@/composables/articles/useArticleThread";
import { useArticlePresence } from "@/composables/articles/useArticlePresence";
import { useDisplay } from "vuetify";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { smAndDown } = useDisplay();

const threadId = computed(() => String(route.params.threadId || ""));

/* ---------- SSR-safe time formatters (unchanged) ---------- */
const clockFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
const formatClock = (iso) => {
  try {
    return clockFmt.format(new Date(iso));
  } catch {
    return "";
  }
};

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
const formatDateTime = (iso) => {
  try {
    return dateTimeFmt.format(new Date(iso));
  } catch {
    return "";
  }
};

/* ---------- Left: topics via SSR ---------- */
const { data: topicsData, pending: loadingTopics } = await useAsyncData(
  "articles:topics",
  () => $fetch("/api/articles/threads")
);
const topics = computed(() => topicsData.value || []);
const openThread = (id) => router.push(`/chat/articles/${id}`);

// Gate the fetch until threadId exists, and use a stable key to avoid Nuxt key collisions on SSR
const {
  data: initial,
  pending: loadingInit,
  error: initErr,
} = await useAsyncData(
  "articles:thread:messages",
  async () => {
    const id = threadId.value;
    if (!id) return { items: [] };
    return await $fetch(`/api/articles/threads/${id}/messages?limit=50`);
  },
  { watch: [() => threadId.value] }
);
const initialItems = computed(() => initial.value?.items ?? []);

/* ---------- Realtime thread store ---------- */
const {
  messages, // raw/realtime array (may miss displayname on new inserts)
  isLoading: loadingMsgs,
  send,
  seed,
  clear, // optional in your composable
} = useArticleThread(threadId);

function goToImChatty() {
  router.push({ path: "/chat", query: { userslug: "imchatty" } });
}


// Seed exactly once per route if realtime store is empty and SSR items exist
const seededOnce = ref(false);
watch(
  () => ({
    id: threadId.value,
    ssrLen: initialItems.value.length,
    rtLen: messages.value?.length || 0,
  }),
  async ({ id, ssrLen, rtLen }) => {
    if (!id || seededOnce.value) return;
    if (rtLen === 0 && ssrLen > 0) {
      seed(initialItems.value);
      seededOnce.value = true;
      return;
    }
    // Fallback: if SSR payload was empty on refresh, do a one-shot client fetch after id is known
    if (rtLen === 0 && ssrLen === 0) {
      try {
        const res = await $fetch(
          `/api/articles/threads/${id}/messages?limit=50`
        );
        if (Array.isArray(res?.items) && res.items.length) {
          seed(res.items);
          seededOnce.value = true;
        }
      } catch {}
    }
  },
  { immediate: true }
);

/* ---------- Presence for participants (right panel) ---------- */
const { now } = useArticlePresence(threadId); // now: [{ userId, displayname, avatarUrl }, ... ]

/* ---------- Profiles map to enrich realtime inserts ---------- */
const profilesById = ref(new Map());

// 1) prime from SSR initial items
watch(
  initialItems,
  (arr) => {
    for (const m of arr) {
      if (!m?.authorId) continue;
      const existing = profilesById.value.get(m.authorId);
      if (!existing) {
        profilesById.value.set(m.authorId, {
          displayname: m.displayname || "User",
          avatarUrl: m.avatarUrl || null,
        });
      }
    }
  },
  { immediate: true }
);

// 2) merge from presence (live names/avatars)
watch(
  now,
  (arr) => {
    for (const u of arr || []) {
      if (!u?.userId) continue;
      profilesById.value.set(u.userId, {
        displayname: u.displayname || "User",
        avatarUrl: u.avatarUrl || null,
      });
    }
  },
  { immediate: true }
);

// 3) ensure current viewer is known (for optimistic self messages)
watchEffect(() => {
  const me = auth.user;
  const prof = auth.userProfile || {};
  const meId = me?.id;
  if (!meId) return;
  const dn = prof.displayname || me?.user_metadata?.displayname || "You";
  const av = prof.avatar_url || me?.user_metadata?.avatar_url || null;
  profilesById.value.set(meId, { displayname: dn, avatarUrl: av });
});

/* ---------- View model for the UI ---------- */
/**
 * Always produce messages with displayname/avatarUrl.
 * - Prefer realtime store when it has items; otherwise show SSR.
 * - Fill missing names via profilesById; fallback to 'User'.
 */
const messagesForUI = computed(() => {
  const base =
    (messages.value?.length ? messages.value : initialItems.value) || [];
  return base.map((m) => {
    const authorId = m.authorId ?? m.sender_user_id ?? null;
    const prof = authorId ? profilesById.value.get(authorId) : null;
    return {
      ...m,
      authorId,
      displayname: m.displayname ?? prof?.displayname ?? "User",
      avatarUrl: m.avatarUrl ?? prof?.avatarUrl ?? null,
    };
  });
});

/* ---------- Compose/send ---------- */
const draft = ref("");
const replyToId = ref(null);
const onSend = async (text) => {
  const t = (text ?? draft.value).trim();
  if (!t) return;
  await send(t, { replyToId: replyToId.value || null });
  draft.value = "";
  replyToId.value = null;
};

/* expose for template filters/helpers if you need */
defineExpose({ formatClock, formatDateTime, messagesForUI });


onMounted(async () => {
  await nextTick();
  
});
</script>
<style scoped>
/* .users-scroll {
  height: 100%;
} */
.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
/* .users-scroll {
  overscroll-behavior: contain;
} */

/* .users-scroll::after { content: ""; display: block; height: 1500px; background: repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,.06) 28px, rgba(0,0,0,.06) 29px); } */
</style>
