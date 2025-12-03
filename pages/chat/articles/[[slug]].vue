<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <!-- Thread title always at the top -->
    <v-row no-gutters class="min-h-0" style="flex: 0 0 auto">
      <v-col>
        <PageHeader
          :text="pageHeading"
          :subtitle="$t('pages.chat.articles.subtitle')"
        />
      </v-col>
    </v-row>

    <!-- Mobile controls: left drawer (Topics) + right drawer (Participants) -->
    <div class="d-md-none d-flex align-center justify-space-between px-2 py-2">
      <v-btn icon @click="leftOpen = true" aria-label="Open topics"
        ><v-icon>mdi-menu</v-icon></v-btn
      >
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

    <div v-if="articleImageUrl" class="mobile-image-wrapper d-md-none">
      <v-img
        :src="articleImageUrl"
        height="148"
        cover
        class="mobile-header-img"
        eager
      />
      <v-btn
        icon
        size="x-small"
        color="white"
        class="info-toggle-btn"
        :aria-expanded="String(panelOpen)"
        aria-controls="thread-info-panel"
        @click="panelOpen = !panelOpen"
      >
        <v-icon :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
      </v-btn>
    </div>
    <div v-else class="d-flex d-md-none justify-end mb-2 px-2">
      <v-btn
        icon
        variant="text"
        color="primary"
        class="info-toggle-inline"
        :aria-expanded="String(panelOpen)"
        aria-controls="thread-info-panel"
        @click="panelOpen = !panelOpen"
      >
        <v-icon :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
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
        md="7"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
      >
        <!-- Sticky header -->
        <div class="messages-sticky-header d-none d-md-block">
          <v-img
            v-if="articleImageUrl"
            :src="articleImageUrl"
            height="80"
            cover
            class="d-flex align-center justify-space-between px-3 py-2"
          >
            <div class="min-w-0 text-white w-100 d-flex justify-space-between">
              <div>
                <p
                  class="text-subtitle-1 font-weight-medium text-truncate cursor-pointer"
                  @click="panelOpen = !panelOpen"
                >
                  {{ topicThread?.article?.title || "See the full article" }}
                </p>
              </div>

              <v-btn
                icon
                size="x-small"
                color="white"
                :aria-expanded="String(panelOpen)"
                aria-controls="thread-info-panel"
                @click="panelOpen = !panelOpen"
              >
                <v-icon
                  :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                />
              </v-btn>
            </div>
          </v-img>
        </div>

        <!-- Overlay panel that drops over the scrollable list -->
        <v-expand-transition>
          <v-card
            v-if="panelOpen"
            id="thread-info-panel"
            class="mx-1"
            elevation="6"
            :aria-hidden="String(!panelOpen)"
          >
            <div class="px-8 py-3">
              <!-- Always render full article (sanitized) -->
              <div v-html="sanitizedArticleHtml"></div>
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
            <ArticlesParticipantsPane
              :now="now"
              :get-avatar="getAvatar"
              :get-gender-color="getGenderColor"
              :get-avatar-icon="getAvatarIcon"
              :get-gender-path="getGenderPath"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Mobile (< md): only the Thread pane -->
    <v-row class="flex-grow-1 overflow-hidden min-h-0 d-flex d-md-none">
      <v-col
        cols="12"
        class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
      >
        <!-- keep your existing CENTER (Thread) content 1:1 here -->
        <div class="messages-sticky-header d-none d-md-block"></div>
        <v-expand-transition>
          <v-card
            v-if="panelOpen"
            id="thread-info-panel"
            class="mx-1"
            elevation="6"
            :aria-hidden="String(!panelOpen)"
          >
            <div class="px-8 py-3">
              <div v-html="sanitizedArticleHtml"></div>
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
    v-model="leftOpen"
    location="left"
    temporary
    class="d-md-none"
    width="320"
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
            @select="() => (leftOpen = false)"
          />
        </div>
      </v-card>
    </div>
  </v-navigation-drawer>

  <v-navigation-drawer
    v-model="rightOpen"
    location="right"
    temporary
    class="d-md-none"
    width="300"
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
            :now="now"
            :get-avatar="getAvatar"
            :get-gender-color="getGenderColor"
            :get-avatar-icon="getAvatarIcon"
            :get-gender-path="getGenderPath"
            @select="() => (rightOpen = false)"
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
</template>

<script setup>
import { computed, ref, watch, watchEffect } from "vue";
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

const leftOpen = ref(false);
const rightOpen = ref(false);

const { t: $t, locale, availableLocales } = useI18n(); // avoid name collision with "thread"
const { public: pub } = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const localePath = useLocalePath();

const panelOpen = ref(false);
const autoCloseOnScroll = true;

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

// Accessibility: close with Escape
function onKeydown(e) {
  if (e.key === "Escape" && panelOpen.value) panelOpen.value = false;
}

const menu = reactive({
  open: false,
  id: null,
  activator: null,
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

    return {
      ...raw,
      authorId,
      // authorProfile,
      author: raw.author ?? authorProfile ?? null, //
      displayname: raw.displayname ?? authorProfile?.displayname ?? "User",
      avatarUrl: raw.avatarUrl ?? authorProfile?.avatarUrl ?? null,
      // convenience fields for links/tooltip
      slug: raw.slug ?? authorProfile?.slug ?? null,
    };
  });
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
    ? localePath(`/chat/articles/${resolvedSlug.value}`)
    : localePath("/chat/articles");
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
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
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
.profile-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}
.profile-link:hover {
  color: var(--v-theme-primary);
  text-decoration: underline;
}
</style>
