<template>
  <section class="feeds-shell mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
    <div class="feeds-header-shell">
      <PageHeader :text="promptTitle" :subtitle="pageSubtitle" />
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
      <div v-else-if="!thread" class="feeds-empty-state">
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

    <Teleport to="body">
      <Transition name="feeds-dialog-fade">
        <div
          v-if="consentDialogOpen"
          class="feeds-dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="feeds-dialog-backdrop"
            aria-label="Close guest consent dialog"
            @click="onConsentCancel"
          />
          <div
            class="feeds-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-consent-title"
          >
            <div class="feeds-dialog-card">
              <h2 id="mood-consent-title" class="feeds-dialog-card__title">
                {{ t("pages.feeds.consentTitle", "Continue as guest?") }}
              </h2>
              <p class="feeds-dialog-card__body">
                {{ t("pages.feeds.consentBody", "We'll create a temporary account so you can post. You can register anytime to keep using the Mood Feed.") }}
              </p>
              <ClientOnly>
                <div
                  v-if="captchaEnabled && !captchaPassed"
                  class="feeds-dialog-card__captcha"
                >
                  <TurnstileWidget
                    :site-key="captchaSiteKey"
                    @verified="onCaptchaVerified"
                    @expired="onCaptchaExpired"
                    @error="onCaptchaError"
                  />
                  <p class="feeds-dialog-card__caption">
                    {{ t("pages.feeds.captchaPrompt", "Please complete the CAPTCHA to continue.") }}
                  </p>
                  <p
                    v-if="captchaError"
                    class="feeds-dialog-card__caption feeds-dialog-card__caption--error"
                  >
                    {{ captchaError }}
                  </p>
                </div>
              </ClientOnly>
              <div class="feeds-dialog-card__actions">
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--secondary"
                  @click="onConsentCancel"
                >
                  {{ t("pages.feeds.consentCancel", "Cancel") }}
                </button>
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--primary"
                  :disabled="consentBusy"
                  @click="onConsentAccept"
                >
                  <span
                    v-if="consentBusy"
                    class="feeds-dialog-card__spinner"
                    aria-hidden="true"
                  />
                  {{ t("pages.feeds.consentContinue", "Continue") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="feeds-dialog-fade">
        <div
          v-if="limitDialogOpen"
          class="feeds-dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="feeds-dialog-backdrop"
            aria-label="Close anonymous limit dialog"
            @click="limitDialogOpen = false"
          />
          <div
            class="feeds-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-limit-title"
          >
            <div class="feeds-dialog-card">
              <h2 id="mood-limit-title" class="feeds-dialog-card__title">
                {{ t("pages.feeds.limitTitle", "Keep using Mood Feed") }}
              </h2>
              <p class="feeds-dialog-card__body">
                {{ t("pages.feeds.limitBody", "You've hit the anonymous limit. To keep using the Mood Feed, finish a quick registration.") }}
              </p>
              <div class="feeds-dialog-card__actions">
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--secondary"
                  @click="limitDialogOpen = false"
                >
                  {{ t("pages.feeds.limitNotNow", "Not now") }}
                </button>
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--primary"
                  @click="goToOnboarding"
                >
                  {{ t("pages.feeds.limitGoChat", "Go to chat") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="feeds-dialog-fade">
        <div
          v-if="registerDialogOpen"
          class="feeds-dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="feeds-dialog-backdrop"
            aria-label="Close register dialog"
            @click="registerDialogOpen = false"
          />
          <div
            class="feeds-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-register-title"
          >
            <div class="feeds-dialog-card">
              <h2 id="mood-register-title" class="feeds-dialog-card__title">
                {{ t("pages.feeds.registerTitle", "Create your profile") }}
              </h2>
              <p class="feeds-dialog-card__body">
                {{ t("pages.feeds.registerBody", "Finish registration to create your profile and keep using the Mood Feed.") }}
              </p>
              <div class="feeds-dialog-card__actions">
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--secondary"
                  @click="registerDialogOpen = false"
                >
                  {{ t("pages.feeds.registerNotNow", "Not now") }}
                </button>
                <button
                  type="button"
                  class="feeds-dialog-card__button feeds-dialog-card__button--primary"
                  @click="goToRegister"
                >
                  {{ t("pages.feeds.registerGoChat", "Go to chat") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div class="feeds-toast-stack" aria-live="polite" aria-atomic="true">
        <Transition name="feeds-toast-fade">
          <div v-if="loginNoticeOpen" class="feeds-toast feeds-toast--action" role="status">
            <span class="feeds-toast__message">{{ loginNoticeText }}</span>
            <button
              type="button"
              class="feeds-toast__action"
              @click="redirectToLogin"
            >
              {{ loginNoticeAction }}
            </button>
          </div>
        </Transition>
        <Transition name="feeds-toast-fade">
          <div v-if="submitNoticeOpen" class="feeds-toast" role="status">
            <span class="feeds-toast__message">{{ submitNoticeText }}</span>
          </div>
        </Transition>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import MoodFeedPromptCard from "@/components/MoodFeed/PromptCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProfileDialog from "@/components/ProfileDialog.vue";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const { locale, t } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const localPath = useLocalePath();
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
let loginNoticeTimer = null;
let submitNoticeTimer = null;

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

if (import.meta.client) {
  onMounted(() => {
    const passed = localStorage.getItem("mfCaptchaPassed");
    if (passed === "true") captchaPassed.value = true;
  });
  onBeforeUnmount(() => {
    if (loginNoticeTimer) window.clearTimeout(loginNoticeTimer);
    if (submitNoticeTimer) window.clearTimeout(submitNoticeTimer);
  });
}

watch(loginNoticeOpen, (open) => {
  if (!import.meta.client) return;
  if (loginNoticeTimer) {
    window.clearTimeout(loginNoticeTimer);
    loginNoticeTimer = null;
  }
  if (!open) return;
  loginNoticeTimer = window.setTimeout(() => {
    loginNoticeOpen.value = false;
    loginNoticeTimer = null;
  }, 3000);
});

watch(submitNoticeOpen, (open) => {
  if (!import.meta.client) return;
  if (submitNoticeTimer) {
    window.clearTimeout(submitNoticeTimer);
    submitNoticeTimer = null;
  }
  if (!open) return;
  submitNoticeTimer = window.setTimeout(() => {
    submitNoticeOpen.value = false;
    submitNoticeTimer = null;
  }, 3000);
});
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
  margin: 0 0 10px;
  font-size: 1.05rem;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgb(var(--color-foreground));
}

.feeds-empty-state {
  margin-top: 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(100, 116, 139, 0.92);
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

.feeds-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
}

.feeds-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.64);
}

.feeds-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 520px);
  transform: translate(-50%, -50%);
}

.feeds-dialog-card {
  padding: 1.4rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.feeds-dialog-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.feeds-dialog-card__body {
  margin: 0.8rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.74);
}

.feeds-dialog-card__captcha {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
}

.feeds-dialog-card__caption {
  margin: 0.65rem 0 0;
  font-size: 0.825rem;
  line-height: 1.5;
  text-align: center;
  color: rgb(var(--color-foreground) / 0.68);
}

.feeds-dialog-card__caption--error {
  color: rgb(239 68 68);
}

.feeds-dialog-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.feeds-dialog-card__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0.65rem 0.95rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.feeds-dialog-card__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.feeds-dialog-card__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.feeds-dialog-card__button:hover,
.feeds-dialog-card__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.feeds-dialog-card__button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
}

.feeds-dialog-card__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid rgb(255 255 255 / 0.35);
  border-top-color: currentcolor;
  border-radius: 999px;
  animation: feeds-spinner-spin 0.7s linear infinite;
}

.feeds-toast-stack {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2200;
  display: grid;
  gap: 0.75rem;
  pointer-events: none;
}

.feeds-toast {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  max-width: min(360px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border: 1px solid rgb(148 163 184 / 0.22);
  border-radius: 14px;
  background: rgb(15 23 42 / 0.96);
  box-shadow: 0 24px 40px rgb(15 23 42 / 0.24);
  color: rgb(248 250 252);
  pointer-events: auto;
}

.feeds-toast--action {
  justify-content: space-between;
}

.feeds-toast__message {
  font-size: 0.925rem;
  line-height: 1.45;
}

.feeds-toast__action {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: rgb(125 211 252);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.feeds-toast__action:hover,
.feeds-toast__action:focus-visible {
  text-decoration: underline;
  outline: none;
}

.feeds-dialog-fade-enter-active,
.feeds-dialog-fade-leave-active,
.feeds-toast-fade-enter-active,
.feeds-toast-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.feeds-dialog-fade-enter-from,
.feeds-dialog-fade-leave-to,
.feeds-toast-fade-enter-from,
.feeds-toast-fade-leave-to {
  opacity: 0;
}

.feeds-toast-fade-enter-from,
.feeds-toast-fade-leave-to {
  transform: translateY(-6px);
}

@keyframes feeds-spinner-spin {
  to {
    transform: rotate(360deg);
  }
}

.mood-prompt-page__related {
  margin-bottom: 16px;
}

.mood-prompt-page__related a {
  color: rgb(var(--color-primary));
  text-decoration: underline;
}

@media (max-width: 960px) {
  .feeds-shell {
    padding-top: 4px;
    padding-bottom: 8px;
  }

  .feeds-dialog-card__actions {
    flex-direction: column-reverse;
  }

  .feeds-dialog-card__button,
  .feeds-toast {
    width: 100%;
  }

  .feeds-toast-stack {
    left: 1rem;
    right: 1rem;
  }
}
</style>
