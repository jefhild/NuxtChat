<template>
  <v-container fluid class="feeds-shell">
    <div class="feeds-header-shell">
      <PageHeader :text="promptTitle" :subtitle="pageSubtitle" />
    </div>

    <div v-if="relatedArticleHref" class="mood-prompt-page__related">
      <NuxtLink :to="relatedArticleHref">Related article</NuxtLink>
    </div>

    <section class="feeds-list" aria-labelledby="feeds-prompt-heading">
      <h2 id="feeds-prompt-heading" class="feeds-section-title">
        {{ t("pages.feeds.streamHeading", "Latest mood entries") }}
      </h2>
      <div v-if="loading" class="feeds-loading mt-4" aria-live="polite" aria-label="Loading..." role="alert">
        <div v-for="n in 4" :key="`prompt-skeleton-${n}`" class="feeds-loading-item">
          <div class="feeds-loading-line feeds-loading-line--title" />
          <div class="feeds-loading-line feeds-loading-line--body" />
          <div class="feeds-loading-line feeds-loading-line--body" />
        </div>
      </div>
      <div v-else-if="!thread" class="text-body-2 mt-4">
        {{ $t("pages.feeds.empty") }}
      </div>
      <MoodFeedPromptCard
        v-else
        :thread="thread"
        :initial-expanded="true"
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
    </section>

    <ProfileDialog v-model="profileOpen" :user-id="profileUserId" />

    <v-dialog v-model="consentDialogOpen" max-width="520">
      <v-card>
        <v-card-title>{{ t("pages.feeds.consentTitle", "Continue as guest?") }}</v-card-title>
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
          <v-btn variant="text" @click="onConsentCancel">{{ t("pages.feeds.consentCancel", "Cancel") }}</v-btn>
          <v-btn color="primary" :loading="consentBusy" @click="onConsentAccept">
            {{ t("pages.feeds.consentContinue", "Continue") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="limitDialogOpen" max-width="520">
      <v-card>
        <v-card-title>{{ t("pages.feeds.limitTitle", "Keep using Mood Feed") }}</v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{ t("pages.feeds.limitBody", "You've hit the anonymous limit. To keep using the Mood Feed, finish a quick registration.") }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="limitDialogOpen = false">{{ t("pages.feeds.limitNotNow", "Not now") }}</v-btn>
          <v-btn color="primary" @click="goToOnboarding">{{ t("pages.feeds.limitGoChat", "Go to chat") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="registerDialogOpen" max-width="520">
      <v-card>
        <v-card-title>{{ t("pages.feeds.registerTitle", "Create your profile") }}</v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{ t("pages.feeds.registerBody", "Finish registration to create your profile and keep using the Mood Feed.") }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="registerDialogOpen = false">{{ t("pages.feeds.registerNotNow", "Not now") }}</v-btn>
          <v-btn color="primary" @click="goToRegister">{{ t("pages.feeds.registerGoChat", "Go to chat") }}</v-btn>
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
import { computed, ref, watch } from "vue";
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
const slug = computed(() => String(route.params.slug || "").trim());

const { data: promptData, error: promptError } = await useAsyncData(
  () => `mood-prompt:${slug.value}:${locale.value}`,
  () =>
    $fetch("/api/mood-feed/prompts/by-slug", {
      query: { slug: slug.value, locale: locale.value },
    })
);

if (promptError.value || !promptData.value?.promptKey) {
  throw createError({ statusCode: 404, statusMessage: "Prompt not found" });
}

const promptTitle = computed(() => promptData.value?.promptText || "Mood Feed");
const relatedArticleSlug = computed(() => promptData.value?.relatedArticleSlug || "");
const relatedArticleHref = computed(() =>
  relatedArticleSlug.value ? localPath(`/articles/${relatedArticleSlug.value}`) : ""
);
const pageSubtitle = computed(() => "Responses to this question");

useHead(() => ({
  title: `${promptTitle.value} | ImChatty Mood Feed`,
  meta: [
    {
      name: "description",
      content: `Read responses to "${promptTitle.value}" and join the conversation on ImChatty.`,
    },
  ],
}));

const loading = ref(false);
const thread = ref(null);
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
const captchaSiteKey = computed(() => config.public?.TURNSTILE_SITE_KEY || "");
const captchaEnabled = computed(() => !!captchaSiteKey.value);
const limitDialogOpen = ref(false);
const registerDialogOpen = ref(false);
const submitNoticeOpen = ref(false);
const submitNoticeText = ref("");

async function fetchPromptEntries() {
  if (!promptData.value?.promptKey) return { items: [] };
  return await $fetch("/api/mood-feed/entries", {
    query: {
      locale: locale.value,
      limit: 50,
      offset: 0,
      promptKey: promptData.value.promptKey,
    },
  });
}

async function loadEntries() {
  loading.value = true;
  try {
    const fresh = await fetchPromptEntries();
    thread.value = fresh?.items?.[0] || null;
  } finally {
    loading.value = false;
  }
}

watch([() => locale.value, () => promptData.value?.promptKey], loadEntries, {
  immediate: true,
});

function rememberCaptchaPassed() {
  captchaPassed.value = true;
  if (import.meta.client) localStorage.setItem("mfCaptchaPassed", "true");
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
  return true;
}

function handleAnonLimit() {
  if (import.meta.client) {
    localStorage.setItem(
      "mfLimitNotice",
      t("pages.feeds.limitNotice", "To keep using the Mood Feed, please finish registration.")
    );
  }
  limitDialogOpen.value = true;
}

function handleCaptchaRequired() {
  consentDialogOpen.value = true;
  captchaError.value = t("pages.feeds.captchaRequired", "Please complete the CAPTCHA.");
}

function extractFetchError(err) {
  const statusCode = err?.statusCode || err?.response?.status || null;
  const statusMessage = err?.statusMessage || err?.response?._data?.statusMessage || "";
  const data = err?.data || err?.response?._data || {};
  return { statusCode, statusMessage, data };
}

function onCaptchaVerified(token) {
  captchaToken.value = token;
  captchaError.value = "";
}

function onCaptchaExpired() {
  captchaToken.value = "";
  captchaError.value = t("pages.feeds.captchaExpired", "CAPTCHA expired. Please try again.");
}

function onCaptchaError() {
  captchaToken.value = "";
  captchaError.value = t("pages.feeds.captchaError", "CAPTCHA failed. Please try again.");
}

function onConsentCancel() {
  consentDialogOpen.value = false;
  pendingAction.value = null;
}

async function onConsentAccept() {
  if (consentBusy.value) return;
  if (captchaEnabled.value && !captchaPassed.value && !captchaToken.value) {
    captchaError.value = t("pages.feeds.captchaRequired", "Please complete the CAPTCHA.");
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
  if (!id || !thread.value) return;
  const entries = (thread.value.entries || []).map((entry) => {
    if (entry.id === id) return { ...entry, score, userVote: myVote };
    const replies = (entry.replies || []).map((reply) =>
      reply.id === id ? { ...reply, score, userVote: myVote } : reply
    );
    return { ...entry, replies };
  });
  thread.value = { ...thread.value, entries };
}

async function submitReply({ entryId, text, replyToId }) {
  if (!text?.trim()) return;
  const resolvedReplyToId = replyToId === entryId ? null : replyToId || null;
  const proceed = await ensureSessionReady(() => submitReply({ entryId, text, replyToId }));
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
      submitNoticeText.value = t("pages.feeds.noticePendingReply", "Thanks! Your reply is under review before it appears.");
      submitNoticeOpen.value = true;
      return;
    }
    await loadEntries();
    rememberCaptchaPassed();
    captchaToken.value = "";
  } catch (err) {
    const { statusCode, statusMessage, data } = extractFetchError(err);
    if (statusCode === 429 && data?.limitType) {
      handleAnonLimit();
    } else if (statusCode === 403 && statusMessage === "captcha_required") {
      handleCaptchaRequired();
    } else if (statusCode === 403 && statusMessage === "captcha_failed") {
      captchaError.value = t("pages.feeds.captchaFailed", "CAPTCHA verification failed. Please try again.");
      consentDialogOpen.value = true;
    }
  }
}

function redirectToLogin() {
  if (auth.authStatus === "anon_authenticated") {
    navigateTo({ path: localPath("/settings"), query: { linkEmail: "1" } });
    return;
  }
  navigateTo({
    path: localPath("/signin"),
    query: { redirect: route.fullPath },
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
  navigateTo({ path: localPath("/chat"), query: { imchatty: "1", mfLimit: "1" } });
  limitDialogOpen.value = false;
}

function showRegisterPrompt() {
  registerDialogOpen.value = true;
}

function goToRegister() {
  if (import.meta.client) {
    localStorage.setItem(
      "mfRegisterNotice",
      t("pages.feeds.registerNotice", "Finish registration to create your profile.")
    );
  }
  navigateTo({ path: localPath("/chat"), query: { imchatty: "1", mfRegister: "1" } });
  registerDialogOpen.value = false;
}

async function flagItem({ targetType, targetId }) {
  if (!targetType || !targetId) return;
  try {
    await $fetch("/api/mood-feed/flags", {
      method: "POST",
      body: { targetType, targetId },
    });
  } catch {}
}

async function deleteEntry({ entryId }) {
  if (!entryId) return;
  try {
    const path = isAdmin.value
      ? `/api/admin/mood-feed/entries/${entryId}`
      : `/api/mood-feed/entries/${entryId}`;
    await $fetch(path, { method: "DELETE" });
    await loadEntries();
  } catch {}
}

async function deleteReply({ replyId }) {
  if (!replyId) return;
  try {
    await $fetch(`/api/mood-feed/replies/${replyId}`, { method: "DELETE" });
    await loadEntries();
  } catch {}
}
</script>

<style scoped>
.mood-prompt-page__related {
  margin-bottom: 16px;
}

.mood-prompt-page__related a {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
