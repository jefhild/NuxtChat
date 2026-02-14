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

    <v-sheet class="pa-3 mood-prompt-bar" elevation="0">
      <div class="d-flex flex-wrap align-center gap-3">
        <div class="prompt-text">
          <span v-if="promptLoading">
            {{ t("pages.feeds.promptLoading", "Loading question...") }}
          </span>
          <span v-else>
            {{ promptText || t("pages.feeds.promptFallback", "Share what's on your mind.") }}
          </span>
        </div>
        <v-text-field
          v-model="promptAnswer"
          class="prompt-input"
          variant="underlined"
          density="compact"
          hide-details
          :placeholder="t('pages.feeds.promptPlaceholder', 'Your response...')"
          maxlength="280"
          @keyup.enter="onSubmitPrompt"
        />
        <v-btn
          color="primary"
          class="prompt-submit"
          :loading="submitBusy"
          :disabled="submitBusy || !promptAnswer.trim()"
          @click="onSubmitPrompt"
        >
          {{ t("pages.feeds.submitButton", "Submit") }}
        </v-btn>
      </div>
      <hr class="prompt-divider" />
    </v-sheet>

    <div class="feeds-list">
      <v-skeleton-loader
        v-if="loading"
        type="list-item@4"
        class="mt-4"
      />
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
    </div>

    <ProfileDialog
      v-model="profileOpen"
      :user-id="profileUserId"
    />

    <v-dialog v-model="refineDialogOpen" max-width="520">
      <v-card>
        <v-card-title>
          {{ t("pages.feeds.refineTitle", "So you're saying...") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-1 font-weight-medium">
            {{ refinedPreview }}
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            {{ t("pages.feeds.refineHelper", "You can edit your response if this misses the mark.") }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="onRefineEdit">
            {{ t("pages.feeds.refineEdit", "Edit") }}
          </v-btn>
          <v-btn color="primary" :loading="submitBusy" @click="onConfirmRefine">
            {{ t("pages.feeds.refinePost", "Post") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import MoodFeedPromptCard from "@/components/MoodFeed/PromptCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProfileDialog from "@/components/ProfileDialog.vue";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const { locale, t } = useI18n();
const auth = useAuthStore();
const localPath = useLocalePath();
const config = useRuntimeConfig();

useSeoI18nMeta("feeds");

const threads = ref([]);
const loading = ref(true);
const canPost = computed(() => true);
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
const promptText = ref("");
const promptKey = ref(null);
const promptLoading = ref(false);
const promptReqId = ref(0);
const promptAnswer = ref("");
const submitBusy = ref(false);
const refineDialogOpen = ref(false);
const refinedPreview = ref("");
const refinedOriginal = ref("");
const refinedPromptText = ref("");
const refinedPromptKey = ref(null);
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

async function loadEntries() {
  loading.value = true;
  try {
    const res = await $fetch("/api/mood-feed/entries", {
      query: { locale: locale.value, limit: 30, offset: 0 },
    });
    threads.value = res?.items || [];
  } catch (err) {
    threads.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadPrompt() {
  const reqId = (promptReqId.value += 1);
  promptLoading.value = true;
  try {
    const res = await $fetch("/api/mood-feed/prompts/random", {
      query: { locale: locale.value },
    });
    if (reqId !== promptReqId.value) return;
    promptText.value = res?.promptText || "";
    promptKey.value = res?.promptKey || null;
  } catch {
    if (reqId !== promptReqId.value) return;
    promptText.value = "";
    promptKey.value = null;
  } finally {
    if (reqId !== promptReqId.value) return;
    promptLoading.value = false;
  }
}

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

async function onSubmitPrompt() {
  const text = String(promptAnswer.value || "").trim().slice(0, 280);
  if (!text) return;
  const proceed = await ensureSessionReady(onSubmitPrompt);
  if (!proceed) return;

  submitBusy.value = true;
  try {
    const res = await $fetch("/api/mood-feed/refine", {
      method: "POST",
      body: {
        prompt: promptText.value || "",
        response: text,
        locale: locale.value,
      },
    });
    refinedPreview.value = String(res?.refined || text).trim();
    refinedOriginal.value = text;
    refinedPromptText.value = promptText.value || "";
    refinedPromptKey.value = promptKey.value || null;
    refineDialogOpen.value = true;
  } catch (err) {
    const { statusCode, statusMessage } = extractFetchError(err);
    if (statusCode === 403 && statusMessage === "captcha_required") {
      handleCaptchaRequired();
    }
  } finally {
    submitBusy.value = false;
  }
}

async function onConfirmRefine() {
  if (!refinedPreview.value) return;
  submitBusy.value = true;
  try {
    const res = await $fetch("/api/mood-feed/entries", {
      method: "POST",
      body: {
        promptText: refinedPromptText.value || null,
        promptKey: refinedPromptKey.value || null,
        originalText: refinedOriginal.value || null,
        refinedText: refinedPreview.value,
        locale: locale.value,
        captchaToken: captchaToken.value || undefined,
      },
    });
    if (res?.status === "pending_validation") {
      submitNoticeText.value = t(
        "pages.feeds.noticePendingEntry",
        "Thanks! Your response is under review before it appears."
      );
      submitNoticeOpen.value = true;
    } else {
      submitNoticeText.value = t(
        "pages.feeds.noticePosted",
        "Posted to the Mood Feed."
      );
      submitNoticeOpen.value = true;
    }
    rememberCaptchaPassed();
    captchaToken.value = "";
    refineDialogOpen.value = false;
    promptAnswer.value = "";
    await loadEntries();
    await loadPrompt();
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
    submitBusy.value = false;
  }
}

function onRefineEdit() {
  refineDialogOpen.value = false;
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
    await $fetch(`/api/mood-feed/entries/${entryId}`, { method: "DELETE" });
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

onMounted(loadEntries);
watch(locale, loadEntries);
onMounted(loadPrompt);
watch(locale, loadPrompt);

if (import.meta.client) {
  onMounted(() => {
    const passed = localStorage.getItem("mfCaptchaPassed");
    if (passed === "true") captchaPassed.value = true;
  });
}
</script>

<style scoped>
.feeds-shell {
  min-height: 100vh;
}
.feeds-header-shell {
  margin-bottom: 12px;
}
.mood-prompt-bar {
  margin-bottom: 16px;
}
.prompt-divider {
  margin-top: 12px;
  border: 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.08);
}
.prompt-text {
  flex: 1 1 260px;
  font-weight: 600;
}
.prompt-input {
  flex: 1 1 240px;
  min-width: 200px;
}
.prompt-submit {
  margin-left: 6px;
}
.feeds-list {
  margin-top: 18px;
}
</style>
