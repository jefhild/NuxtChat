<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <!-- Thread title always at the top -->
    <v-row no-gutters class="min-h-0" style="flex: 0 0 auto">
      <v-col>
        <PageHeader
          :text="pageHeading"
          :subtitle="''"
        />
      </v-col>
    </v-row>

    <!-- Mobile controls: left drawer (Topics) + right drawer (Participants) -->
    <div
      class="d-md-none d-flex align-center justify-space-between px-2 py-2 chat-mobile-controls"
    >
      <v-btn
        class="flat-icon-button"
        variant="text"
        density="comfortable"
        @click="leftOpen = true"
        aria-label="Open articles"
      >
        <v-icon color="primary">mdi-text-box-outline</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn
        icon
        variant="text"
        @click="rightOpen = true"
        aria-label="Show participants"
      >
        <v-icon>mdi-account-multiple-outline</v-icon>
      </v-btn>
    </div>

    <!-- Desktop / tablet (>= md): 3 columns -->
    <v-row class="flex-grow-1 overflow-hidden min-h-0 d-none d-md-flex">
      <!-- LEFT: Topics -->
      <v-col
        cols="12"
        md="3"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 d-none d-md-flex"
      >
        <div class="topics-heading">
          <h2 class="text-subtitle-1 font-weight-medium">
            {{ $t("pages.articles.index.heading") }}
          </h2>
        </div>
        <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
          <div
            ref="leftScrollRef"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <ArticlesTopicsPane
              :topics="topics"
              :slug="resolvedSlug"
              :loading="loadingTopics"
              :format-date-time="formatDateTime"
              :locale-path="localePath"
              :variant="smAndDown ? 'list' : 'cards'"
            />
          </div>
        </v-card>

        <ClientOnly v-if="auth.authStatus !== 'authenticated'">
          <ChatLayoutConsentPanel
            :auth-status="auth.authStatus"
            @action="goToImChatty"
          />
        </ClientOnly>
      </v-col>

      <!-- CENTER: Thread messages -->
      <v-col
        cols="12"
        :md="activePanelOpen ? 7 : 9"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative discussion-panel"
      >
        <div v-if="!smAndDown" class="active-panel-rail">
          <v-tooltip text="Participants" location="left">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                size="x-small"
                class="active-panel-toggle"
                :aria-expanded="String(activePanelOpen)"
                aria-controls="active-panel"
                aria-label="Toggle participants panel"
                @click="activePanelOpen = !activePanelOpen"
              >
                <v-icon
                  :icon="
                    activePanelOpen ? 'mdi-chevron-right' : 'mdi-chevron-left'
                  "
                />
              </v-btn>
            </template>
          </v-tooltip>
        </div>
        <div v-if="hasMounted && topicThread?.article" class="discussion-toolbar">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :aria-expanded="String(panelOpen)"
            aria-controls="thread-info-panel"
            @click="panelOpen = !panelOpen"
          >
            <v-icon start>
              mdi-file-document-outline
            </v-icon>
            {{ panelOpen ? "Hide article" : "Read article" }}
          </v-btn>
        </div>
        <!-- Overlay panel that drops over the scrollable list -->
        <v-expand-transition>
          <v-card
            v-if="panelOpen"
            id="thread-info-panel"
            class="mx-1 article-panel"
            variant="flat"
            :aria-hidden="String(!panelOpen)"
          >
            <div class="px-8 py-3 article-panel__content">
              <!-- Always render full article (sanitized) -->
              <div v-html="dropdownArticleHtml"></div>
            </div>
          </v-card>
        </v-expand-transition>

        <!-- Scrollable messages list -->
        <div
          ref="centerScrollRef"
            class="flex-grow-1 overflow-auto users-scroll min-h-0 px-2 py-2"
            style="flex: 1 1 0"
            @scroll.passive="
              panelOpen && autoCloseOnScroll && (panelOpen = false)
            "
        >
          <v-skeleton-loader
            v-if="loadingMsgs"
            type="list-item@6"
            class="pa-2"
          />
          <!-- {{ messagesForUI }}  -->
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
            @vote="voteOnMessage"
            @menu="openMessageMenu"
            @login-request="showLoginDialog = true"
          />
        </div>

        <!-- Composer -->
        <div class="border-t pt-2" style="flex: 0 0 auto">
          <ChatLayoutMessageComposer
            v-model:draft="draft"
            :peer-id="threadId"
            :me-id="auth.user?.id || null"
            :conversation-key="`thread:${threadId}`"
            :disabled="!auth.user?.id || !threadId"
            class="w-100 mx-auto"
            @send="onSend"
          />
        </div>
      </v-col>

      <!-- RIGHT: Participants -->
      <v-col
        v-if="activePanelOpen"
        cols="12"
        md="2"
        class="pa-2 d-flex flex-column overflow-hidden d-none d-md-flex min-h-0"
      >
        <v-card
          id="active-panel"
          flat
          class="d-flex flex-column flex-grow-1 min-h-0 active-panel-card"
        >
          <div
            ref="rightScrollRef"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <ArticlesParticipantsPane
              :participants="participantsForUI"
              :now="now"
              :get-avatar="getAvatar"
              :get-gender-color="getGenderColor"
              :get-avatar-icon="getAvatarIcon"
              :get-gender-path="getGenderPath"
              @select="openProfileDialog"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Mobile (< md): only the Thread pane -->
    <v-row class="flex-grow-1 overflow-hidden min-h-0 d-flex d-md-none">
      <v-col
        cols="12"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative discussion-panel"
      >
        <div v-if="hasMounted && topicThread?.article" class="discussion-toolbar">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :aria-expanded="String(panelOpen)"
            aria-controls="thread-info-panel"
            @click="panelOpen = !panelOpen"
          >
            <v-icon start>
              mdi-file-document-outline
            </v-icon>
            {{ panelOpen ? "Hide article" : "Read article" }}
          </v-btn>
        </div>
        <!-- keep your existing CENTER (Thread) content 1:1 here -->
        <v-expand-transition>
          <v-card
            v-if="panelOpen"
            id="thread-info-panel"
            class="mx-1 article-panel"
            variant="flat"
            :aria-hidden="String(!panelOpen)"
          >
            <div class="px-8 py-3 article-panel__content">
              <div v-html="dropdownArticleHtml"></div>
            </div>
          </v-card>
        </v-expand-transition>

        <div
          ref="centerScrollRef"
          class="flex-grow-1 overflow-auto users-scroll min-h-0 px-2 py-2"
          style="flex: 1 1 0"
          @scroll.passive="
            panelOpen && autoCloseOnScroll && (panelOpen = false)
          "
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
            @vote="voteOnMessage"
            @menu="openMessageMenu"
            @login-request="showLoginDialog = true"
          />
        </div>

        <div class="border-t pt-2" style="flex: 0 0 auto">
          <ChatLayoutMessageComposer
            v-model:draft="draft"
            :peer-id="threadId"
            :me-id="auth.user?.id || null"
            :conversation-key="`thread:${threadId}`"
            :disabled="!auth.user?.id || !threadId"
            class="w-100 mx-auto"
            @send="onSend"
          />
        </div>
      </v-col>
    </v-row>
  </v-container>

  <!-- Mobile-only Drawers -->
  <v-navigation-drawer
    v-if="hasMounted"
    v-model="leftOpen"
    location="left"
    temporary
    class="d-md-none chat-mobile-drawer"
    width="320"
    :mobile="isMobileDrawer"
    aria-label="Topics drawer"
  >
    <div
      class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      style="height: 100%"
    >
      <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
        <div
          ref="leftScrollRefMobile"
          class="flex-grow-1 overflow-auto min-h-0 users-scroll"
          style="flex: 1 1 0"
        >
          <!-- SAME content as desktop Topics column -->
          <ArticlesTopicsPane
            :topics="topics"
            :slug="resolvedSlug"
            :loading="loadingTopics"
            :format-date-time="formatDateTime"
            :locale-path="localePath"
            variant="list"
            @select="() => (leftOpen = false)"
          />
        </div>
      </v-card>
    </div>
  </v-navigation-drawer>

  <v-navigation-drawer
    v-if="hasMounted"
    v-model="rightOpen"
    location="right"
    temporary
    class="d-md-none chat-mobile-drawer"
    width="300"
    :mobile="isMobileDrawer"
    aria-label="Participants drawer"
  >
    <div
      class="pa-2 d-flex flex-column overflow-hidden min-h-0"
      style="height: 100%"
    >
      <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
        <div
          ref="rightScrollRefMobile"
          class="flex-grow-1 overflow-auto min-h-0 users-scroll"
          style="flex: 1 1 0"
        >
          <ArticlesParticipantsPane
            :participants="participantsForUI"
            :now="now"
            :get-avatar="getAvatar"
            :get-gender-color="getGenderColor"
            :get-avatar-icon="getAvatarIcon"
            :get-gender-path="getGenderPath"
            @select="(participant) => {
              openProfileDialog(participant);
              rightOpen = false;
            }"
          />
        </div>
      </v-card>
    </div>
  </v-navigation-drawer>

  <v-menu
    v-model="menu.open"
    :activator="menu.activator"
    location="bottom end"
    origin="top end"
    :close-on-content-click="true"
    transition="fade-transition"
  >
    <v-list density="compact" min-width="180">
      <!-- Report (disabled if not signed in) -->
      <v-list-item
        :disabled="!isAuthed"
        prepend-icon="mdi-flag"
        @click="onReport"
      >
        <v-list-item-title>{{
          t("components.message.menu-dropdown.report")
        }}</v-list-item-title>
      </v-list-item>

      <!-- Sign in when unauthenticated -->
      <v-list-item
        v-if="!isAuthed"
        :to="{ path: '/signin', query: { redirect: route.fullPath } }"
        prepend-icon="mdi-login"
      >
        <v-list-item-title>{{
          t("components.message.menu-dropdown.signin")
        }}</v-list-item-title>
      </v-list-item>

      <!-- Delete only for my own message -->
      <v-list-item
        v-if="isMineSelected"
        prepend-icon="mdi-delete"
        @click="onDelete"
      >
        <v-list-item-title>{{
          t("components.message.menu-dropdown.delete")
        }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>

  <ProfileDialog
    v-model="isProfileDialogOpen"
    :slug="profileDialogSlug"
    :user-id="profileDialogUserId"
  />
</template>

<script setup>
import { computed, ref, watch, watchEffect, reactive, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useArticleThread } from "@/composables/articles/useArticleThread";
import { useArticlePresence } from "@/composables/articles/useArticlePresence";
import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
  getGenderPath,
} from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
import { sanitizeHtml } from "~/utils/sanitizeHtml.js";
import { useDisplay } from "vuetify";
import ProfileDialog from "@/components/ProfileDialog.vue";

const leftOpen = ref(false);
const rightOpen = ref(false);
const hasMounted = ref(false);
const { smAndDown } = useDisplay();
const isMobileDrawer = computed(() => hasMounted.value && smAndDown.value);

const { t: $t, locale, availableLocales } = useI18n(); // avoid name collision with "thread"
const { public: pub } = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const localePath = useLocalePath();

const panelOpen = ref(false);
const autoCloseOnScroll = true;
const isProfileDialogOpen = ref(false);
const profileDialogUserId = ref(null);
const profileDialogSlug = ref(null);
const activePanelOpen = useState(
  "articlesParticipantsPanelOpen",
  () => false
);

const articleImageUrl = computed(() => {
  const base = (pub.SUPABASE_BUCKET || "").replace(/\/$/, "");
  const file = (topicThread.value?.article?.imagePath || "").replace(/^\//, "");
  return base && file ? `${base}/articles/${file}` : null;
});

const pageHeading = computed(
  () =>
    topicThread.value?.article?.title ||
    topicThread.value?.title ||
    $t("pages.chat.articles.heading")
);

// compute reactively, no snapshot const
const sanitizedArticleHtml = computed(() =>
  sanitizeHtml(topicThread.value?.article?.content ?? "")
);
const dropdownArticleHtml = computed(() =>
  sanitizedArticleHtml.value.replace(
    /<h[12][^>]*>[\s\S]*?<\/h[12]>/i,
    ""
  )
);

// Accessibility: close with Escape
function onKeydown(e) {
  if (e.key === "Escape" && panelOpen.value) panelOpen.value = false;
}

const openProfileDialog = (participant) => {
  profileDialogUserId.value = participant?.userId || null;
  profileDialogSlug.value = participant?.slug || null;
  isProfileDialogOpen.value = true;
};

const menu = reactive({
  open: false,
  id: null,
  activator: null,
});

onMounted(async () => {
  try {
    await auth.checkAuth();
    if (
      ["authenticated", "anon_authenticated"].includes(auth.authStatus) &&
      !auth.isProfileComplete
    ) {
      const nextPath = route.fullPath || "/chat/articles";
      const completionPath = `/settings?complete=1&next=${encodeURIComponent(
        nextPath
      )}`;
      router.replace(localePath(completionPath));
    }
  } catch (err) {
    console.warn("[articles chat] auth check failed:", err);
  }
});

const slug = computed(() => String(route.params.slug || ""));
const localeFromPath = computed(() => {
  const seg = route.path.split("/")[1] || "";
  return availableLocales.includes(seg) ? seg : locale.value;
});

// If no slug: fetch the first thread so we can render it as a default
const fallbackSlug = ref(null);
if (!slug.value) {
  const ORDER = ["latest", "oldest", "pinned"].includes(
    String(route.query.order || "").toLowerCase()
  )
    ? String(route.query.order).toLowerCase()
    : "latest";

  const { data: firstThread } = await useAsyncData(
    "articles:first-thread",
    () =>
      $fetch("/api/articles/threads", {
        params: { order: ORDER, limit: 1 },
      }),
    { server: true }
  );

  fallbackSlug.value = (
    Array.isArray(firstThread.value) ? firstThread.value[0] : firstThread.value?.[0]
  )?.slug;
}

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

onMounted(() => {
  hasMounted.value = true;
  if (!smAndDown.value) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
});

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
const firstTopicSlug = computed(() => topics.value?.[0]?.slug || null);

// Use a resolved slug so /chat/articles can render without redirecting
const resolvedSlug = computed(
  () => slug.value || fallbackSlug.value || firstTopicSlug.value || ""
);

// the thread (with article) coming from /api/articles/threads
const topicThread = computed(() => {
  const s = resolvedSlug.value;
  return (topics.value || []).find((t) => t.slug === s) || null;
});

// Initial fetch by slug; API returns { thread, items }
const {
  data: initial,
  pending: loadingInit,
  error: initErr,
} = await useAsyncData(
  () => `articles:thread:messages:${resolvedSlug.value || "none"}`,
  async () => {
    if (!resolvedSlug.value) return { thread: null, items: [] };
    return await $fetch(
      `/api/articles/threads/${resolvedSlug.value}/messages?limit=50`
    );
  },
  { watch: [resolvedSlug] }
);
const thread = computed(() => initial.value?.thread || null);
const threadId = computed(() => thread.value?.id || "");
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

function voteOnMessage({ id, myVote, score, today }) {
  const i = messages.value.findIndex((m) => m.id === id);
  if (i !== -1) {
    messages.value[i] = { ...messages.value[i], myVote, score, today };
  }
  // Optional: re-sync from server if you want authoritative values
  // await loadMessages()
}

function openMessageMenu({ id, el }) {
  // Force a clean re-bind so it can open again even if same button
  menu.open = false;
  menu.activator = null;
  menu.id = id || null;

  // Wait a tick so VMenu recalculates with the FRESH element
  nextTick(() => {
    menu.activator = el || null;
    // If activator is missing, don't open (prevents top-left fallback)
    menu.open = !!menu.activator;
  });
}

const isAuthed = computed(() => Boolean(auth.user?.id));

function getOwnerId(msg) {
  return msg?.userId || msg?.authorId || msg?.senderId || null;
}

const isMineSelected = computed(() => {
  if (!menu.id) return false;
  const msg = (messagesForUI?.value || []).find((m) => m.id === menu.id);
  const me = auth.user?.id || null;
  return !!(msg && me && getOwnerId(msg) === me);
});

function onReport() {
  if (!menu.id) return;
  // TODO: implement your reporting (dialog or API call)
  menu.open = false;
}

async function onDelete() {
  if (!menu.id) return;
  // TODO: confirm  call your delete endpoint
  menu.open = false;
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

/* ---------- Presence + enrolled participants (right panel) ---------- */
const { now } = useArticlePresence(threadId); // now: [{ userId, displayname, avatarUrl }, ... ]
const participants = ref([]);
const participantsLoading = ref(false);
const participantsError = ref("");

const loadParticipants = async () => {
  const s = resolvedSlug.value;
  if (!s) {
    participants.value = [];
    return;
  }
  participantsLoading.value = true;
  participantsError.value = "";
  try {
    const res = await $fetch(
      `/api/articles/threads/${encodeURIComponent(s)}/participants`
    );
    if (res?.success === false) throw new Error(res.error);
    participants.value = Array.isArray(res?.participants)
      ? res.participants
      : [];
  } catch (error) {
    console.error("[participants] load error", error);
    participantsError.value = error?.message || "Failed to load participants.";
    participants.value = [];
  } finally {
    participantsLoading.value = false;
  }
};

watch(
  resolvedSlug,
  () => {
    loadParticipants();
  },
  { immediate: true }
);

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
        profilesById.value.set(
          m.authorId,
          m.author || {
            displayname: m.displayname || "User",
            avatarUrl: m.avatarUrl || null,
          }
        );
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

function getAuthorId(m) {
  // tolerate different shapes (server, realtime, legacy)
  return m?.authorId ?? m?.senderUserId ?? m?.sender_user_id ?? null;
}

const messagesForUI = computed(() => {
  const base =
    (messages.value?.length ? messages.value : initialItems.value) || [];

  return base.map((raw) => {
    const authorId = getAuthorId(raw);

    // prefer author object from API, fallback to local profile map
    const authorProfile =
      raw.author ??
      (authorId ? profilesById.value.get(authorId) ?? null : null);

    // console.log("authorProfile:", authorProfile);

    // Persona/bot identity from meta if no author profile
    const displaynameFromMeta =
      raw?.meta?.persona_displayname || raw?.meta?.persona_key || null;
    const avatarFromMeta = raw?.meta?.persona_avatar_url || null;

    return {
      ...raw,
      authorId,
      // authorProfile,
      author: raw.author ?? authorProfile ?? null, //
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
      // convenience fields for links/tooltip
      slug: raw.slug ?? authorProfile?.slug ?? null,
    };
  });
});

// Merge enrolled participants with live presence for the side panel
const participantsForUI = computed(() => {
  const onlineIds = new Set((now.value || []).map((u) => u.userId));
  const list =
    (participants.value || []).map((p) => {
      const isPersona = p.kind === "persona" || !!p.persona;
      const profile = isPersona ? p.persona?.profile : p.user;
      const userId = isPersona
        ? p.persona?.profile?.user_id || null
        : p.user?.id || null;
      return {
        id: p.id,
        userId,
        displayname:
          profile?.displayname ||
          p.persona?.persona_key ||
          p.user?.displayname ||
          "User",
        avatarUrl: profile?.avatar_url || null,
        slug: profile?.slug || null,
        gender_id: isPersona ? null : profile?.gender_id || null,
        isPersona,
        isOnline: userId ? onlineIds.has(userId) : false,
      };
    }) || [];

  const known = new Set(list.map((p) => p.userId).filter(Boolean));
  for (const u of now.value || []) {
    if (!u.userId || known.has(u.userId)) continue;
    list.push({
      id: `presence:${u.userId}`,
      userId: u.userId,
      displayname: u.displayname || "User",
      avatarUrl: u.avatarUrl || null,
      slug: u.slug || null,
      gender_id: u.gender_id || null,
      isPersona: false,
      isOnline: true,
    });
  }

  return list;
});

/* ---------- Compose/send ---------- */
const draft = ref("");
const replyToId = ref(null);

const onSend = async (text) => {
  const msgText = (text ?? draft.value).trim();
  if (!msgText) return;
  await send(msgText, { replyToId: replyToId.value || null });

  draft.value = "";
  replyToId.value = null;
};

/* expose for template filters/helpers if you need */
defineExpose({ formatClock, formatDateTime, messagesForUI });

async function loadMessages() {
  const s = resolvedSlug.value;
  if (!s) return; // <-- guard: no slug, no call
  loadingMsgs.value = true;
  try {
    const { items } = await $fetch(
      `/api/articles/threads/${encodeURIComponent(s)}/messages`
    );
    messages.value = items ?? [];
  } finally {
    loadingMsgs.value = false;
  }
}

onMounted(async () => {
  if (import.meta.client) {
    watch(
      resolvedSlug,
      (s) => {
        if (s) loadMessages();
      },
      { immediate: true }
    );
  }
});

// watch(thread, (v) => console.log('thread:', v), { immediate: true })

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

// Absolute canonical (locale-aware)
const canonicalUrl = computed(() => {
  // localePath gives you the localized route (e.g. /en/chat/articles/slug)
  const localizedPath = resolvedSlug.value
    ? localePath(`/articles/${resolvedSlug.value}`)
    : localePath("/articles");
  // ensure absolute URL
  const base = (pub.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${localizedPath}`;
});

// Title (fallbacks are important during SSR before data arrives)
const seoTitle = computed(() => {
  const t =
    topicThread.value?.article?.title || topicThread.value?.title || "Article";
  return `${t}`;
});

// Description: prefer explicit excerpt; otherwise strip HTML from content
const safeDescription = computed(() => {
  const excerpt = topicThread.value?.article?.excerpt || "";
  const content = topicThread.value?.article?.content || "";
  const src = excerpt || content;
  const text = src
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 160); // classic meta length
});

// OG image (fallback to a site default)
const ogImage = computed(() => {
  const fallback = `${(pub.SITE_URL || "").replace(/\/$/, "")}/og-default.jpg`;
  return articleImageUrl.value || fallback;
});

// Article dates
const publishedTime = computed(
  () => topicThread.value?.article?.created_at || null
);
const modifiedTime = computed(
  () =>
    topicThread.value?.article?.updated_at ||
    topicThread.value?.lastActivityAt ||
    null
);

// Locale to og:locale (e.g., "en" -> "en_US")
const ogLocale = computed(() => {
  const cur = (locale.value || "en").toLowerCase();
  return cur === "en" ? "en_US" : `${cur}_${cur.toUpperCase()}`;
});

useHead({
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  // Optional: preload OG image for speed (tiny win)
  meta: [{ name: "robots", content: "index,follow" }],
  // JSON-LD Article
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: topicThread.value?.article?.title || "Article",
        description: safeDescription.value,
        mainEntityOfPage: canonicalUrl.value,
        image: ogImage.value ? [ogImage.value] : [],
        datePublished: publishedTime.value || undefined,
        dateModified: modifiedTime.value || undefined,
        author: topicThread.value?.article?.author
          ? { "@type": "Person", name: topicThread.value.article.author }
          : undefined,
        publisher: {
          "@type": "Organization",
          name: "ImChatty",
          logo: {
            "@type": "ImageObject",
            url: `${(pub.SITE_URL || "").replace(/\/$/, "")}/logo.png`,
          },
        },
      }),
    },
  ],
});

useSeoMeta({
  title: () => seoTitle.value,
  description: () => safeDescription.value,
  // Open Graph
  ogTitle: () => seoTitle.value,
  ogDescription: () => safeDescription.value,
  ogUrl: () => canonicalUrl.value,
  ogImage: () => ogImage.value,
  ogType: "article",
  ogLocale: () => ogLocale.value,
  ogSiteName: "ImChatty",
  // Twitter
  twitterCard: "summary_large_image",
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => safeDescription.value,
  twitterImage: () => ogImage.value,
  // Article-specific metas
  articleSection: () => topicThread.value?.article?.category?.name || "Article",
  articlePublishedTime: () => publishedTime.value || undefined,
});
</script>

<style scoped>
.mobile-image-wrapper {
  position: relative;
}

.mobile-header-img {
  border-radius: 10px;
  margin-bottom: 8px;
}

.info-toggle-btn {
  position: absolute;
  top: -6px;
  left: -6px;
  background: transparent;
  box-shadow: none;
}
.image-header-img {
  position: relative;
}
.image-toggle-btn {
  position: absolute;
  top: -6px;
  left: -6px;
  background: transparent;
  box-shadow: none;
}

.info-toggle-inline {
  margin-left: auto;
}

.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
.image-title {
  white-space: normal;
  overflow-wrap: anywhere;
}
.active-panel-rail {
  --active-rail-width: 34px;
  position: absolute;
  top: 12px;
  bottom: 12px;
  right: 8px;
  width: var(--active-rail-width);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}
.active-panel-toggle {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  width: 34px;
  height: 34px;
  pointer-events: auto;
}
.active-panel-toggle :deep(.v-icon) {
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.active-panel-card {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.avatar-with-icon {
  position: relative;
  margin-right: 8px;
}
.gender-icon {
  position: absolute;
  right: -2px;
  bottom: -2px;
  background: var(--v-theme-surface);
  border-radius: 50%;
  padding: 1px;
}
.chat-mobile-controls {
  margin-top: -20px;
  margin-bottom: 2px;
}

.flat-icon-button {
  min-width: 0;
  padding: 4px;
  border-radius: 6px;
}
.chat-mobile-drawer {
  z-index: 1700 !important;
}
.chat-mobile-drawer :deep(.v-overlay__content),
.chat-mobile-drawer :deep(.v-navigation-drawer) {
  top: var(--nav2-offset, 0px) !important;
  height: calc(100vh - var(--nav2-offset, 0px)) !important;
}
.discussion-panel {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: linear-gradient(
      180deg,
      rgba(var(--v-theme-on-surface), 0.04),
      rgba(var(--v-theme-surface), 0) 140px
    ),
    rgb(var(--v-theme-surface));
}
@media (min-width: 960px) {
  .discussion-panel {
    margin-top: 8px;
  }
}
.discussion-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 6px 0;
}
.topics-heading {
  padding: 0 0 4px 8px;
}
.article-panel {
  background: transparent;
  box-shadow: none;
}
.article-panel__content {
  max-height: 45vh;
  overflow-y: auto;
}
</style>
