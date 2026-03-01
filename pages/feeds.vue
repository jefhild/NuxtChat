<template>
  <v-container fluid class="feeds-shell">
    <div class="feeds-header-shell">
      <div class="feeds-header-actions">
        <PageHeader
          :text="$t('pages.feeds.heading')"
          :subtitle="$t('pages.feeds.subtitle')"
        />
      </div>
    </div>

    <MoodFeedHomeQuestionBar variant="feeds" @posted="loadEntries" />

    <section class="feeds-list" aria-labelledby="feeds-latest-heading">
      <h2 id="feeds-latest-heading" class="feeds-section-title">
        {{ t("pages.feeds.streamHeading", "Latest mood entries") }}
      </h2>
      <nav class="feeds-pagination-links" aria-label="Feed pages">
        <NuxtLink
          v-if="prevPageHref"
          :to="prevPageHref"
          rel="prev"
          class="feeds-pagination-link"
        >
          {{ t("pages.feeds.previousPage", "Previous page") }}
        </NuxtLink>
        <NuxtLink
          v-if="nextPageHref"
          :to="nextPageHref"
          rel="next"
          class="feeds-pagination-link"
        >
          {{ t("pages.feeds.nextPage", "Next page") }}
        </NuxtLink>
      </nav>
      <div v-if="loading" class="feeds-loading mt-4" aria-live="polite" aria-label="Loading..." role="alert">
        <div v-for="n in 4" :key="`feed-skeleton-${n}`" class="feeds-loading-item">
          <div class="feeds-loading-line feeds-loading-line--title" />
          <div class="feeds-loading-line feeds-loading-line--body" />
          <div class="feeds-loading-line feeds-loading-line--body" />
        </div>
      </div>
      <div v-else-if="!threads.length" class="text-body-2 mt-4">
        {{ $t("pages.feeds.empty") }}
      </div>
      <div v-else>
        <MoodFeedPromptCard
          v-for="(thread, index) in threads"
          :key="thread.promptKey || thread.id || thread.promptText"
          :thread="thread"
          :initial-expanded="index === 0"
          :me-id="auth.user?.id || null"
          :is-admin="isAdmin"
          :can-reply="canPost"
          :loading="loading"
          @send-reply="submitReply"
          @vote="handleVote"
          @delete-entry="deleteEntry"
          @delete-reply="deleteReply"
          @flag="flagItem"
          @login-request="showLoginNotice"
          @profile="openProfile"
          @register="showRegisterPrompt"
        />
      </div>
      <div
        ref="infiniteSentinel"
        class="feeds-infinite-sentinel"
        aria-hidden="true"
      />
      <div v-if="loadingMore" class="text-body-2 mt-3">
        {{ t("pages.feeds.loadingMore", "Loading more entries...") }}
      </div>
    </section>

    <ProfileDialog
      v-model="profileOpen"
      :user-id="profileUserId"
    />

    <v-dialog v-model="consentDialogOpen" max-width="520">
      <v-card>
        <v-card-title>
          {{ t("pages.feeds.consentTitle", "Continue as guest?") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{ t("pages.feeds.consentBody", "We'll create a temporary account so you can post. You can register anytime to keep using the Mood Feed.") }}
          </div>
          <ClientOnly>
            <div
              v-if="captchaEnabled && !captchaPassed"
              class="mt-4 d-flex flex-column align-center"
            >
              <TurnstileWidget
                :site-key="captchaSiteKey"
                @verified="onCaptchaVerified"
                @expired="onCaptchaExpired"
                @error="onCaptchaError"
              />
              <div class="text-caption text-medium-emphasis mt-2 text-center">
                {{ t("pages.feeds.captchaPrompt", "Please complete the CAPTCHA to continue.") }}
              </div>
              <div v-if="captchaError" class="text-caption text-error mt-1">
                {{ captchaError }}
              </div>
            </div>
          </ClientOnly>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="onConsentCancel">
            {{ t("pages.feeds.consentCancel", "Cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="consentBusy"
            @click="onConsentAccept"
          >
            {{ t("pages.feeds.consentContinue", "Continue") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="limitDialogOpen" max-width="520">
      <v-card>
        <v-card-title>
          {{ t("pages.feeds.limitTitle", "Keep using Mood Feed") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{ t("pages.feeds.limitBody", "You've hit the anonymous limit. To keep using the Mood Feed, finish a quick registration.") }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="limitDialogOpen = false">
            {{ t("pages.feeds.limitNotNow", "Not now") }}
          </v-btn>
          <v-btn color="primary" @click="goToOnboarding">
            {{ t("pages.feeds.limitGoChat", "Go to chat") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="registerDialogOpen" max-width="520">
      <v-card>
        <v-card-title>
          {{ t("pages.feeds.registerTitle", "Create your profile") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{
              t(
                "pages.feeds.registerBody",
                "Finish registration to create your profile and keep using the Mood Feed."
              )
            }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="registerDialogOpen = false">
            {{ t("pages.feeds.registerNotNow", "Not now") }}
          </v-btn>
          <v-btn color="primary" @click="goToRegister">
            {{ t("pages.feeds.registerGoChat", "Go to chat") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="loginNoticeOpen" timeout="3000">
      {{ loginNoticeText }}
      <template #actions>
        <v-btn variant="text" @click="redirectToLogin">
          {{ loginNoticeAction }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar v-model="submitNoticeOpen" timeout="3000">
      {{ submitNoticeText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import MoodFeedPromptCard from "@/components/MoodFeed/PromptCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProfileDialog from "@/components/ProfileDialog.vue";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const { locale, t } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();
const PAGE_SIZE = 30;

const infiniteSentinel = ref(null);
let infiniteObserver = null;

const parsePage = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw || "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const initialPage = computed(() => parsePage(route.query.page));
const initialOffset = computed(() => (initialPage.value - 1) * PAGE_SIZE);

const pagePath = (page) => {
  const basePath = localPath("/feeds");
  return page > 1 ? `${basePath}?page=${page}` : basePath;
};
const toAbsolute = (path) => {
  const base = String(siteConfig?.url || config.public?.SITE_URL || "").replace(
    /\/$/,
    ""
  );
  return base ? `${base}${path}` : path;
};
const canonicalPageHref = computed(() => toAbsolute(pagePath(initialPage.value)));

useSeoI18nMeta("feeds", { overrideUrl: canonicalPageHref.value });

const threads = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const loadedPage = ref(1);
const canPost = computed(() => true);
const isAdmin = computed(() => Boolean(auth.userProfile?.is_admin));
const profileOpen = ref(false);
const profileUserId = ref(null);
const loginNoticeOpen = ref(false);
const loginNoticeText = computed(() =>
  auth.authStatus === "anon_authenticated"
    ? t("pages.feeds.linkEmailNotice")
    : t("pages.feeds.signinNotice")
);
const loginNoticeAction = computed(() =>
  auth.authStatus === "anon_authenticated"
    ? t("components.profile-email-link.cta")
    : t("components.navbar.signin")
);
const consentDialogOpen = ref(false);
const consentBusy = ref(false);
const pendingAction = ref(null);
const captchaToken = ref("");
const captchaError = ref("");
const captchaPassed = ref(false);
const captchaSiteKey = computed(
  () => config.public?.TURNSTILE_SITE_KEY || ""
);
const captchaEnabled = computed(() => !!captchaSiteKey.value);
const limitDialogOpen = ref(false);
const registerDialogOpen = ref(false);
const submitNoticeOpen = ref(false);
const submitNoticeText = ref("");

async function fetchEntriesPage(page) {
  return await $fetch("/api/mood-feed/entries", {
    query: {
      locale: locale.value,
      limit: PAGE_SIZE,
      offset: Math.max(0, (page - 1) * PAGE_SIZE),
    },
  });
}

const { data: entriesData, pending, refresh } = await useAsyncData(
  () => `mood-feed-entries:${locale.value}:${initialOffset.value}`,
  () => fetchEntriesPage(initialPage.value),
  {
    watch: [locale, initialOffset],
    default: () => ({ items: [], hasMore: false }),
  }
);

watch(
  entriesData,
  (value) => {
    threads.value = value?.items || [];
    loadedPage.value = initialPage.value;
    hasMore.value = Boolean(value?.hasMore);
  },
  { immediate: true }
);

watch(
  pending,
  (value) => {
    loading.value = value;
  },
  { immediate: true }
);

async function loadEntries() {
  const fresh = await fetchEntriesPage(1).catch(() => ({
    items: [],
    hasMore: false,
  }));
  threads.value = fresh?.items || [];
  loadedPage.value = 1;
  hasMore.value = Boolean(fresh?.hasMore);
  if (import.meta.client) {
    window.history.replaceState(window.history.state, "", pagePath(1));
  }
  await refresh();
}

function mergeThreads(existing, incoming) {
  const byPrompt = new Map();
  for (const thread of existing || []) {
    byPrompt.set(thread.promptKey || thread.id || thread.promptText, {
      ...thread,
      entries: [...(thread.entries || [])],
    });
  }
  for (const thread of incoming || []) {
    const key = thread.promptKey || thread.id || thread.promptText;
    if (!byPrompt.has(key)) {
      byPrompt.set(key, { ...thread, entries: [...(thread.entries || [])] });
      continue;
    }
    const current = byPrompt.get(key);
    const entryMap = new Map();
    for (const item of current.entries || []) {
      entryMap.set(item.id, item);
    }
    for (const item of thread.entries || []) {
      if (!entryMap.has(item.id)) entryMap.set(item.id, item);
    }
    current.entries = Array.from(entryMap.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
  return Array.from(byPrompt.values());
}

async function loadMoreEntries() {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  const nextPage = loadedPage.value + 1;
  try {
    const next = await fetchEntriesPage(nextPage);
    threads.value = mergeThreads(threads.value, next?.items || []);
    loadedPage.value = nextPage;
    hasMore.value = Boolean(next?.hasMore);
    if (import.meta.client) {
      window.history.pushState(window.history.state, "", pagePath(nextPage));
    }
  } catch {
  } finally {
    loadingMore.value = false;
  }
}

const prevPageHref = computed(() =>
  initialPage.value > 1 ? pagePath(initialPage.value - 1) : ""
);
const nextPageHref = computed(() =>
  hasMore.value ? pagePath(initialPage.value + 1) : ""
);

const schemaInLanguage = computed(() => {
  if (locale.value === "fr") return "fr-FR";
  if (locale.value === "ru") return "ru-RU";
  if (locale.value === "zh") return "zh-CN";
  return "en-US";
});

const itemListSchema = computed(() => {
  const listItems = (threads.value || []).slice(0, PAGE_SIZE).map((thread, idx) => {
    const latest = (thread.entries || [])[0] || {};
    const fallbackName = t("pages.feeds.streamHeading", "Latest mood entries");
    const name = String(thread.promptText || fallbackName).trim().slice(0, 140);
    const description = String(latest.displayText || "").replace(/\s+/g, " ").trim().slice(0, 260);
    const hashId = encodeURIComponent(String(thread.promptKey || thread.id || `thread-${idx + 1}`));

    return {
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "CreativeWork",
        name,
        ...(description ? { description } : {}),
        ...(latest.createdAt ? { datePublished: latest.createdAt } : {}),
        inLanguage: schemaInLanguage.value,
        url: `${canonicalPageHref.value}#${hashId}`,
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: t("pages.feeds.meta.title"),
        description: t("pages.feeds.meta.description"),
        url: canonicalPageHref.value,
        inLanguage: schemaInLanguage.value,
        isPartOf: {
          "@type": "WebSite",
          name: String(siteConfig?.name || "ImChatty"),
          url: toAbsolute("/"),
        },
      },
      {
        "@type": "ItemList",
        name: t("pages.feeds.streamHeading", "Latest mood entries"),
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: listItems.length,
        itemListElement: listItems,
      },
    ],
  };
});

useHead(() => ({
  link: [
    ...(initialPage.value > 1
      ? [{ rel: "prev", href: toAbsolute(pagePath(initialPage.value - 1)) }]
      : []),
    ...(hasMore.value
      ? [{ rel: "next", href: toAbsolute(pagePath(initialPage.value + 1)) }]
      : []),
  ],
  script: [
    {
      key: "ld-feeds-collection",
      type: "application/ld+json",
      children: JSON.stringify(itemListSchema.value),
    },
  ],
}));

function rememberCaptchaPassed() {
  captchaPassed.value = true;
  if (import.meta.client) {
    localStorage.setItem("mfCaptchaPassed", "true");
  }
}

function queueAction(action) {
  pendingAction.value = action;
  consentDialogOpen.value = true;
}

async function ensureSessionReady(action) {
  if (auth.authStatus === "unauthenticated") {
    queueAction(action);
    return false;
  }
  // No profile creation for anonymous users.
  return true;
}

function handleAnonLimit() {
  if (import.meta.client) {
    localStorage.setItem(
      "mfLimitNotice",
      t(
        "pages.feeds.limitNotice",
        "To keep using the Mood Feed, please finish registration."
      )
    );
  }
  limitDialogOpen.value = true;
}

function handleCaptchaRequired() {
  consentDialogOpen.value = true;
  captchaError.value = t(
    "pages.feeds.captchaRequired",
    "Please complete the CAPTCHA."
  );
}

function extractFetchError(err) {
  const statusCode = err?.statusCode || err?.response?.status || null;
  const statusMessage =
    err?.statusMessage || err?.response?._data?.statusMessage || "";
  const data = err?.data || err?.response?._data || {};
  return { statusCode, statusMessage, data };
}

function onCaptchaVerified(token) {
  captchaToken.value = token;
  captchaError.value = "";
}

function onCaptchaExpired() {
  captchaToken.value = "";
  captchaError.value = t(
    "pages.feeds.captchaExpired",
    "CAPTCHA expired. Please try again."
  );
}

function onCaptchaError() {
  captchaToken.value = "";
  captchaError.value = t(
    "pages.feeds.captchaError",
    "CAPTCHA failed. Please try again."
  );
}

function onConsentCancel() {
  consentDialogOpen.value = false;
  pendingAction.value = null;
}

async function onConsentAccept() {
  if (consentBusy.value) return;
  if (captchaEnabled.value && !captchaPassed.value && !captchaToken.value) {
    captchaError.value = t(
      "pages.feeds.captchaRequired",
      "Please complete the CAPTCHA."
    );
    return;
  }
  consentBusy.value = true;
  try {
    auth.setOnboardingLocal(true);
    await auth.ensureAnonymousUserAfterConsent();
    consentDialogOpen.value = false;
    captchaError.value = "";
    const action = pendingAction.value;
    pendingAction.value = null;
    if (action) await action();
  } finally {
    consentBusy.value = false;
  }
}


function handleVote({ id, score, myVote }) {
  if (!id) return;
  threads.value = threads.value.map((thread) => {
    const entries = (thread.entries || []).map((entry) => {
      if (entry.id === id) {
        return { ...entry, score, userVote: myVote };
      }
      const replies = (entry.replies || []).map((reply) =>
        reply.id === id ? { ...reply, score, userVote: myVote } : reply
      );
      return { ...entry, replies };
    });
    return { ...thread, entries };
  });
}

async function submitReply({ entryId, text, replyToId }) {
  if (!text?.trim()) return;
  const resolvedReplyToId = replyToId === entryId ? null : replyToId || null;
  const proceed = await ensureSessionReady(() =>
    submitReply({ entryId, text, replyToId })
  );
  if (!proceed) return;
  try {
    const res = await $fetch("/api/mood-feed/replies", {
      method: "POST",
      body: {
        entryId,
        replyToId: resolvedReplyToId,
        content: text.trim(),
        locale: locale.value,
        captchaToken: captchaToken.value || undefined,
      },
    });
    if (res?.status && res.status !== "published") {
      submitNoticeText.value = t(
        "pages.feeds.noticePendingReply",
        "Thanks! Your reply is under review before it appears."
      );
      submitNoticeOpen.value = true;
      return;
    }
    const replyId = res?.replyId || `reply-${Date.now()}`;
    const profile = auth.userProfile || null;
    const fallbackName = auth.user?.is_anonymous
      ? t("pages.feeds.anonName", "Guest")
      : t("pages.feeds.userName", "User");
    const authorDisplayname = profile?.displayname || fallbackName;
    const authorAvatarUrl =
      profile?.avatar_url ||
      (auth.user?.is_anonymous ? "/images/avatars/guest-avatar.webp" : null);
    const authorCountryEmoji = profile?.country_emoji || "";
    const authorGenderId = profile?.gender_id ?? null;
    threads.value = threads.value.map((thread) => {
      const entries = (thread.entries || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const nextReply = {
          id: replyId,
          entryId,
          replyToId: resolvedReplyToId,
          userId: auth.user?.id || null,
          createdAt: new Date().toISOString(),
          displayText: text.trim(),
          displayLocale: locale.value,
          sourceLocale: locale.value,
          profile,
          authorDisplayname,
          authorAvatarUrl,
          authorCountryEmoji,
          authorGenderId,
          score: 0,
          upvotes: 0,
          downvotes: 0,
          userVote: 0,
        };
        const replies = [...(entry.replies || []), nextReply];
        return {
          ...entry,
          replies,
          replyCount: (entry.replyCount || 0) + 1,
        };
      });
      return { ...thread, entries };
    });
    rememberCaptchaPassed();
    captchaToken.value = "";
  } catch (err) {
    const { statusCode, statusMessage, data } = extractFetchError(err);
    if (statusCode === 429 && data?.limitType) {
      handleAnonLimit();
    } else if (statusCode === 403 && statusMessage === "captcha_required") {
      handleCaptchaRequired();
    } else if (statusCode === 403 && statusMessage === "captcha_failed") {
      captchaError.value = t(
        "pages.feeds.captchaFailed",
        "CAPTCHA verification failed. Please try again."
      );
      consentDialogOpen.value = true;
    }
  } finally {
  }
}

function redirectToLogin() {
  if (auth.authStatus === "anon_authenticated") {
    navigateTo({ path: localPath("/settings"), query: { linkEmail: "1" } });
    return;
  }
  navigateTo({
    path: localPath("/signin"),
    query: { redirect: "/feeds" },
  });
}

function showLoginNotice() {
  loginNoticeOpen.value = true;
}

function openProfile(userId) {
  if (!userId) return;
  profileUserId.value = String(userId);
  profileOpen.value = true;
}

function goToOnboarding() {
  navigateTo({
    path: localPath("/chat"),
    query: { imchatty: "1", mfLimit: "1" },
  });
  limitDialogOpen.value = false;
}

function showRegisterPrompt() {
  registerDialogOpen.value = true;
}

function goToRegister() {
  if (import.meta.client) {
    localStorage.setItem(
      "mfRegisterNotice",
      t(
        "pages.feeds.registerNotice",
        "Finish registration to create your profile."
      )
    );
  }
  navigateTo({
    path: localPath("/chat"),
    query: { imchatty: "1", mfRegister: "1" },
  });
  registerDialogOpen.value = false;
}

async function flagItem({ targetType, targetId }) {
  if (!targetType || !targetId) return;
  try {
    await $fetch("/api/mood-feed/flags", {
      method: "POST",
      body: { targetType, targetId },
    });
  } catch {
  }
}

async function deleteEntry({ entryId }) {
  if (!entryId) return;
  try {
    const path = isAdmin.value
      ? `/api/admin/mood-feed/entries/${entryId}`
      : `/api/mood-feed/entries/${entryId}`;
    await $fetch(path, { method: "DELETE" });
    threads.value = threads.value
      .map((thread) => {
        const entries = (thread.entries || []).filter(
          (entry) => entry.id !== entryId
        );
        return { ...thread, entries };
      })
      .filter((thread) => (thread.entries || []).length);
  } catch {
  }
}

async function deleteReply({ entryId, replyId }) {
  if (!entryId || !replyId) return;
  try {
    await $fetch(`/api/mood-feed/replies/${replyId}`, { method: "DELETE" });
    threads.value = threads.value.map((thread) => {
      const entries = (thread.entries || []).map((entry) => {
        if (entry.id !== entryId) return entry;
        const replies = (entry.replies || []).filter((r) => r.id !== replyId);
        return {
          ...entry,
          replies,
          replyCount: Math.max(0, (entry.replyCount || 0) - 1),
        };
      });
      return { ...thread, entries };
    });
  } catch {
  }
}

function setupInfiniteScroll() {
  if (!import.meta.client || !infiniteSentinel.value) return;
  if (infiniteObserver) infiniteObserver.disconnect();
  infiniteObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMoreEntries();
      }
    },
    {
      root: null,
      rootMargin: "400px 0px",
      threshold: 0,
    }
  );
  infiniteObserver.observe(infiniteSentinel.value);
}

function teardownInfiniteScroll() {
  if (infiniteObserver) {
    infiniteObserver.disconnect();
    infiniteObserver = null;
  }
}

if (import.meta.client) {
  onMounted(() => {
    const passed = localStorage.getItem("mfCaptchaPassed");
    if (passed === "true") captchaPassed.value = true;
    setupInfiniteScroll();
  });
  onBeforeUnmount(() => {
    teardownInfiniteScroll();
  });
}
</script>

<style scoped>
.feeds-shell {
  --mf-panel-border: rgba(148, 163, 184, 0.28);
  --mf-panel-bg:
    radial-gradient(1200px 240px at 8% 0%, rgba(59, 130, 246, 0.16), transparent 62%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.72));
  --mf-panel-text: #dbe6ff;
  --mf-divider: rgba(148, 163, 184, 0.26);
  --mf-input-bg: rgba(2, 6, 23, 0.6);
  --mf-input-border: rgba(148, 163, 184, 0.34);
  --mf-input-text: #e8eefc;
  --mf-input-placeholder: rgba(148, 163, 184, 0.85);
  min-height: 100vh;
  max-width: 1380px;
  margin: 0 auto;
  padding-top: 10px;
  padding-bottom: 18px;
}

:global(.v-theme--light) .feeds-shell {
  --mf-panel-border: rgba(100, 116, 139, 0.24);
  --mf-panel-bg:
    radial-gradient(1400px 240px at 8% 0%, rgba(59, 130, 246, 0.08), transparent 62%),
    linear-gradient(135deg, rgba(241, 245, 249, 0.98), rgba(226, 232, 240, 0.92));
  --mf-panel-text: #1e293b;
  --mf-divider: rgba(100, 116, 139, 0.24);
  --mf-input-bg: rgba(255, 255, 255, 0.9);
  --mf-input-border: rgba(100, 116, 139, 0.34);
  --mf-input-text: #0f172a;
  --mf-input-placeholder: rgba(71, 85, 105, 0.72);
}

.feeds-header-shell {
  margin-bottom: 16px;
}

.feeds-list {
  margin-top: 10px;
}

.feeds-section-title {
  font-size: 1.05rem;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin: 0 0 10px;
  color: rgb(var(--v-theme-on-surface));
}

.feeds-pagination-links {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.feeds-pagination-link {
  display: inline-block;
}

.feeds-infinite-sentinel {
  width: 100%;
  height: 2px;
}

.feeds-list > div {
  display: grid;
  gap: 14px;
}

.feeds-loading {
  display: grid;
  gap: 12px;
}

.feeds-loading-item {
  border-radius: 14px;
  border: 1px solid var(--mf-panel-border);
  background: var(--mf-panel-bg);
  padding: 14px;
}

.feeds-loading-line {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.feeds-loading-line--title {
  width: 48%;
  margin-bottom: 10px;
}

.feeds-loading-line--body {
  width: 100%;
  margin-bottom: 8px;
}

.feeds-loading-line--body:last-child {
  width: 72%;
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .feeds-shell {
    padding-top: 4px;
    padding-bottom: 8px;
  }

  .feeds-list > div {
    gap: 10px;
  }
}
</style>
