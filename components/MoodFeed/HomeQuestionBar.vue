<template>
  <div
    :class="[
      'home-mood-root',
      `home-mood-root--${variant}`,
      `home-mood-root--card-${resolvedCardTheme}`,
    ]"
  >
    <section class="home-mood-card">
      <div class="home-mood-card__glow" aria-hidden="true" />
      <div class="home-mood-card__content">
        <div v-if="variant === 'home'" class="home-mood-card__header">
          <div class="home-mood-card__header-main">
            <div class="home-mood-card__header-top">
              <span class="home-mood-card__badge">
                {{ t("pages.feeds.heading", "Mood Feed") }}
              </span>
              <NuxtLink :to="localPath('/feeds')" class="home-mood-card__link">
                {{ t("pages.feeds.seeAll", "Browse mood feed") }}
              </NuxtLink>
            </div>
            <h2 class="home-mood-card__title">
              {{ t("pages.feeds.promptTitle", "Daily Mood Question") }}
            </h2>
            <p class="home-mood-card__subtitle">
              {{ t("pages.feeds.promptSubtitle", "Share how you're feeling and connect with people who get it.") }}
            </p>
          </div>
        </div>

        <div class="home-mood-card__prompt" :class="{ 'mb-3': variant === 'home' }">
          <span v-if="promptLoading">
            {{ t("pages.feeds.promptLoading", "Loading question...") }}
          </span>
          <span v-else>
            {{ promptText || t("pages.feeds.promptFallback", "Share what's on your mind.") }}
          </span>
        </div>

        <div class="home-mood-card__actions">
          <input
            v-model="promptAnswer"
            class="home-mood-card__input"
            type="text"
            maxlength="280"
            :placeholder="t('pages.feeds.promptPlaceholder', 'Your response...')"
            @keydown.enter.prevent="onSubmitPrompt"
          >
          <button
            type="button"
            class="home-mood-card__submit"
            :class="{ 'is-loading': submitBusy }"
            :disabled="promptSubmitDisabled"
            @click="onSubmitPrompt"
          >
            <span v-if="submitBusy" class="home-mood-card__spinner" aria-hidden="true" />
            <span>{{ t("pages.feeds.submitButton", "Submit") }}</span>
          </button>
        </div>

        <div v-if="cooldownActive" class="home-mood-card__cooldown">
          {{ cooldownLabel }}
        </div>
        <hr v-if="variant === 'feeds'" class="home-mood-card__divider">
      </div>
    </section>

    <Teleport to="body">
      <Transition name="home-mood-dialog-fade">
        <div v-if="refineDialogOpen" class="home-mood-dialog" role="presentation">
          <button
            type="button"
            class="home-mood-dialog__scrim"
            aria-label="Close refine dialog"
            @click="onRefineEdit"
          />
          <div
            class="home-mood-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mood-refine-title"
          >
            <h2 id="home-mood-refine-title" class="home-mood-dialog__title">
              {{ t("pages.feeds.refineTitle", "So you're saying...") }}
            </h2>
            <div class="home-mood-dialog__body">
              <div class="home-mood-dialog__preview">
                {{ refinedPreview }}
              </div>
              <div class="home-mood-dialog__helper">
                {{ t("pages.feeds.refineHelper", "You can edit your response if this misses the mark.") }}
              </div>
            </div>
            <div class="home-mood-dialog__actions">
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--secondary"
                @click="onRefineEdit"
              >
                {{ t("pages.feeds.refineEdit", "Edit") }}
              </button>
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--primary"
                :class="{ 'is-loading': submitBusy }"
                @click="onConfirmRefine"
              >
                <span v-if="submitBusy" class="home-mood-card__spinner" aria-hidden="true" />
                <span>{{ t("pages.feeds.refinePost", "Post") }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="home-mood-dialog-fade">
        <div v-if="consentDialogOpen" class="home-mood-dialog" role="presentation">
          <button
            type="button"
            class="home-mood-dialog__scrim"
            aria-label="Close guest consent dialog"
            @click="onConsentCancel"
          />
          <div
            class="home-mood-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mood-consent-title"
          >
            <h2 id="home-mood-consent-title" class="home-mood-dialog__title">
              {{ t("pages.feeds.consentTitle", "Continue as guest?") }}
            </h2>
            <div class="home-mood-dialog__body">
              <div class="home-mood-dialog__copy">
                {{ t("pages.feeds.consentBody", "We'll create a temporary account so you can post. You can register anytime to keep using the Mood Feed.") }}
              </div>
              <ClientOnly>
                <div
                  v-if="captchaEnabled && !captchaPassed"
                  class="home-mood-dialog__captcha"
                >
                  <TurnstileWidget
                    :site-key="captchaSiteKey"
                    @verified="onCaptchaVerified"
                    @expired="onCaptchaExpired"
                    @error="onCaptchaError"
                  />
                  <div class="home-mood-dialog__helper home-mood-dialog__helper--center">
                    {{ t("pages.feeds.captchaPrompt", "Please complete the CAPTCHA to continue.") }}
                  </div>
                  <div v-if="captchaError" class="home-mood-dialog__error">
                    {{ captchaError }}
                  </div>
                </div>
              </ClientOnly>
            </div>
            <div class="home-mood-dialog__actions">
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--secondary"
                @click="onConsentCancel"
              >
                {{ t("pages.feeds.consentCancel", "Cancel") }}
              </button>
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--primary"
                :class="{ 'is-loading': consentBusy }"
                @click="onConsentAccept"
              >
                <span v-if="consentBusy" class="home-mood-card__spinner" aria-hidden="true" />
                <span>{{ t("pages.feeds.consentContinue", "Continue") }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="home-mood-dialog-fade">
        <div v-if="limitDialogOpen" class="home-mood-dialog" role="presentation">
          <button
            type="button"
            class="home-mood-dialog__scrim"
            aria-label="Close limit dialog"
            @click="limitDialogOpen = false"
          />
          <div
            class="home-mood-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mood-limit-title"
          >
            <h2 id="home-mood-limit-title" class="home-mood-dialog__title">
              {{ t("pages.feeds.limitTitle", "Keep using Mood Feed") }}
            </h2>
            <div class="home-mood-dialog__body">
              <div class="home-mood-dialog__copy">
                {{ t("pages.feeds.limitBody", "You've hit the anonymous limit. To keep using the Mood Feed, finish a quick registration.") }}
              </div>
            </div>
            <div class="home-mood-dialog__actions">
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--secondary"
                @click="limitDialogOpen = false"
              >
                {{ t("pages.feeds.limitNotNow", "Not now") }}
              </button>
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--primary"
                @click="goToOnboarding"
              >
                {{ t("pages.feeds.limitGoChat", "Go to chat") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="home-mood-dialog-fade">
        <div v-if="registerDialogOpen" class="home-mood-dialog" role="presentation">
          <button
            type="button"
            class="home-mood-dialog__scrim"
            aria-label="Close register dialog"
            @click="registerDialogOpen = false"
          />
          <div
            class="home-mood-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mood-register-title"
          >
            <h2 id="home-mood-register-title" class="home-mood-dialog__title">
              {{ t("pages.feeds.registerTitle", "Create your profile") }}
            </h2>
            <div class="home-mood-dialog__body">
              <div class="home-mood-dialog__copy">
                {{ t("pages.feeds.registerBody", "Finish registration to create your profile and keep using the Mood Feed.") }}
              </div>
            </div>
            <div class="home-mood-dialog__actions">
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--secondary"
                @click="registerDialogOpen = false"
              >
                {{ t("pages.feeds.registerNotNow", "Not now") }}
              </button>
              <button
                type="button"
                class="home-mood-dialog__button home-mood-dialog__button--primary"
                @click="goToRegister"
              >
                {{ t("pages.feeds.registerGoChat", "Go to chat") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div class="home-mood-toast-stack" aria-live="polite" aria-atomic="true">
        <Transition name="home-mood-toast-fade">
          <div v-if="submitNoticeOpen" class="home-mood-toast" role="status">
            {{ submitNoticeText }}
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import TurnstileWidget from "@/components/TurnstileWidget.vue";

const props = defineProps({
  variant: {
    type: String,
    default: "home",
    validator: (value) => ["home", "feeds"].includes(value),
  },
  cardTheme: {
    type: String,
    default: "trading",
    validator: (value) => ["trading", "vintage", "holo"].includes(value),
  },
});
const variant = computed(() => props.variant);
const resolvedCardTheme = computed(() => props.cardTheme || "trading");

const emit = defineEmits(["posted"]);

const { locale, t } = useI18n();
const auth = useAuthStore();
const localPath = useLocalePath();
const config = useRuntimeConfig();

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
const captchaSiteKey = computed(() => config.public?.TURNSTILE_SITE_KEY || "");
const captchaEnabled = computed(() => !!captchaSiteKey.value);
const limitDialogOpen = ref(false);
const registerDialogOpen = ref(false);
const submitNoticeOpen = ref(false);
const submitNoticeText = ref("");
const postEligibility = ref({
  canPost: true,
  cooldownHours: 24,
  lastEntryAt: null,
  nextAllowedAt: null,
  remainingMs: 0,
});
const nowTick = ref(Date.now());
let cooldownTimerId = null;
let submitNoticeTimerId = null;

const promptSubmitDisabled = computed(
  () => submitBusy.value || !promptAnswer.value.trim() || cooldownActive.value
);

const cooldownRemainingMs = computed(() => {
  const next = postEligibility.value?.nextAllowedAt;
  if (!next) return 0;
  const nextAt = new Date(next).getTime();
  if (!Number.isFinite(nextAt)) return 0;
  return Math.max(0, nextAt - nowTick.value);
});

const cooldownActive = computed(() => cooldownRemainingMs.value > 0);

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const cooldownLabel = computed(() =>
  t("pages.feeds.cooldownActive", {
    time: formatDuration(cooldownRemainingMs.value),
  })
);

function clearSubmitNoticeTimer() {
  if (submitNoticeTimerId) {
    clearTimeout(submitNoticeTimerId);
    submitNoticeTimerId = null;
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
    if (reqId === promptReqId.value) {
      promptLoading.value = false;
    }
  }
}

async function loadPostEligibility(targetPromptKey = null) {
  const normalizedPromptKey =
    String(targetPromptKey || promptKey.value || "").trim() || null;
  try {
    const res = await $fetch("/api/mood-feed/post-eligibility", {
      query: normalizedPromptKey ? { promptKey: normalizedPromptKey } : undefined,
    });
    postEligibility.value = {
      canPost: Boolean(res?.canPost ?? true),
      cooldownHours: Number(res?.cooldownHours || 24),
      lastEntryAt: res?.lastEntryAt || null,
      nextAllowedAt: res?.nextAllowedAt || null,
      remainingMs: Number(res?.remainingMs || 0),
    };
  } catch {
    postEligibility.value = {
      canPost: true,
      cooldownHours: 24,
      lastEntryAt: null,
      nextAllowedAt: null,
      remainingMs: 0,
    };
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
  if (cooldownActive.value) {
    submitNoticeText.value = t("pages.feeds.noticeCooldown", {
      time: formatDuration(cooldownRemainingMs.value),
    });
    submitNoticeOpen.value = true;
    return;
  }

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
    } else {
      submitNoticeText.value = t(
        "pages.feeds.noticePosted",
        "Posted to the Mood Feed."
      );
    }
    submitNoticeOpen.value = true;

    rememberCaptchaPassed();
    captchaToken.value = "";
    refineDialogOpen.value = false;
    promptAnswer.value = "";
    await loadPrompt();
    await loadPostEligibility(refinedPromptKey.value || promptKey.value || null);
    emit("posted");

    if (auth.authStatus !== "unauthenticated") {
      inferMoodFromFeedPost(refinedOriginal.value || refinedPreview.value || "");
    }
  } catch (err) {
    const { statusCode, statusMessage, data } = extractFetchError(err);
    if (statusCode === 429 && data?.limitType) {
      if (data.limitType === "cooldown") {
        postEligibility.value = {
          canPost: false,
          cooldownHours: Number(data?.cooldownHours || 24),
          lastEntryAt: data?.lastEntryAt || null,
          nextAllowedAt: data?.nextAllowedAt || null,
          remainingMs: Number(data?.remainingMs || 0),
        };
        submitNoticeText.value = t("pages.feeds.noticeCooldown", {
          time: formatDuration(cooldownRemainingMs.value),
        });
        submitNoticeOpen.value = true;
      } else {
        handleAnonLimit();
      }
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

async function inferMoodFromFeedPost(text) {
  if (!text || text.length < 5) return;
  try {
    const inferResult = await $fetch("/api/live-mood/infer", {
      method: "POST",
      body: { text, locale: locale.value },
    });
    const state = inferResult?.state;
    if (!state?.emotion || !state?.intent || !state?.energy) return;

    await $fetch("/api/live-mood/self-select", {
      method: "POST",
      body: {
        emotion: state.emotion,
        intent: state.intent,
        energy: state.energy,
        time_horizon: state.time_horizon || "right_now",
        free_text: text,
      },
    });
  } catch {
    // Silently ignore — this is a background enhancement, not blocking UX
  }
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

function goToOnboarding() {
  navigateTo({
    path: localPath("/chat"),
    query: { imchatty: "1", mfLimit: "1" },
  });
  limitDialogOpen.value = false;
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

onMounted(loadPrompt);
watch(locale, loadPrompt);
onMounted(loadPostEligibility);
watch(promptKey, (nextKey) => {
  loadPostEligibility(nextKey);
});
watch(
  () => auth.authStatus,
  () => {
    loadPostEligibility(promptKey.value || null);
  }
);
watch(submitNoticeOpen, (open) => {
  clearSubmitNoticeTimer();
  if (!open) return;
  submitNoticeTimerId = window.setTimeout(() => {
    submitNoticeOpen.value = false;
  }, 3000);
});

onMounted(() => {
  cooldownTimerId = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (cooldownTimerId) {
    clearInterval(cooldownTimerId);
    cooldownTimerId = null;
  }
  clearSubmitNoticeTimer();
});

if (import.meta.client) {
  onMounted(() => {
    const passed = localStorage.getItem("mfCaptchaPassed");
    if (passed === "true") captchaPassed.value = true;
  });
}
</script>

<style scoped>
.home-mood-root {
  --mf-card-border: rgb(var(--color-border) / 0.58);
  --mf-card-bg:
    radial-gradient(1200px 280px at 8% 0%, rgb(var(--color-primary) / 0.12), transparent 62%),
    linear-gradient(
      135deg,
      rgb(var(--color-surface) / 0.98),
      rgb(var(--color-surface) / 0.92)
    );
  --mf-glow-a: rgb(var(--color-primary) / 0.2);
  --mf-glow-b: rgb(var(--color-info) / 0.14);
  --mf-card-text: rgb(var(--color-foreground));
  --mf-divider: rgb(var(--color-border) / 0.58);
  --mf-input-bg: rgb(var(--color-surface) / 0.9);
  --mf-input-border: rgb(var(--color-border) / 0.72);
  --mf-input-text: rgb(var(--color-foreground));
  --mf-input-placeholder: rgb(var(--color-muted) / 0.88);
  --mf-cooldown: rgb(var(--color-primary));
}

.home-mood-card {
  position: relative;
  overflow: hidden;
  padding: 1rem 1.25rem 1.25rem;
  border-radius: 18px;
  border: 1px solid var(--mf-card-border);
  background: var(--mf-card-bg);
  backdrop-filter: blur(6px);
  box-shadow:
    0 20px 36px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.home-mood-card__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 13%, var(--mf-glow-a), transparent 24%),
    radial-gradient(circle at 90% 84%, var(--mf-glow-b), transparent 27%);
}

.home-mood-card__content {
  position: relative;
  z-index: 1;
}

.home-mood-root--feeds .home-mood-card {
  margin-bottom: 20px;
}

.home-mood-card__header {
  margin-bottom: 14px;
}

.home-mood-card__header-main {
  width: 100%;
}

.home-mood-card__header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.home-mood-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.2rem 0.7rem;
  border: 1px solid color-mix(in oklab, var(--mf-card-text) 20%, transparent 80%);
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.home-mood-card__link {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  color: rgb(var(--color-primary));
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-decoration: none;
  white-space: nowrap;
}

.home-mood-card__link:hover,
.home-mood-card__link:focus-visible {
  text-decoration: underline;
  outline: none;
}

.home-mood-card__title {
  margin: 0.3rem 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--mf-card-text);
}

.home-mood-card__subtitle {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: color-mix(in oklab, var(--mf-card-text) 68%, transparent 32%);
}

.home-mood-card__prompt {
  font-size: clamp(1.05rem, 1.6vw, 1.24rem);
  font-weight: 600;
  line-height: 1.35;
  color: var(--mf-card-text);
  letter-spacing: 0.012em;
}

.home-mood-card__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.home-mood-card__input {
  width: 100%;
  min-height: 46px;
  padding: 0.85rem 1rem;
  border: 1px solid var(--mf-input-border);
  border-radius: 16px;
  background: var(--mf-input-bg);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  color: var(--mf-input-text);
  font: inherit;
}

.home-mood-card__input::placeholder {
  color: var(--mf-input-placeholder);
}

.home-mood-card__input:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.24);
  outline-offset: 1px;
}

.home-mood-card__submit,
.home-mood-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 46px;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
}

.home-mood-card__submit {
  min-width: 132px;
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
  letter-spacing: 0.04em;
}

.home-mood-card__submit:hover:not(:disabled),
.home-mood-card__submit:focus-visible,
.home-mood-dialog__button:hover:not(:disabled),
.home-mood-dialog__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.home-mood-card__submit:disabled,
.home-mood-dialog__button:disabled {
  opacity: 0.58;
  cursor: default;
}

.home-mood-card__cooldown {
  margin-top: 0.5rem;
  color: var(--mf-cooldown);
  font-size: 0.78rem;
}

.home-mood-card__divider {
  margin-top: 12px;
  border: 0;
  border-top: 1px solid var(--mf-divider);
}

.home-mood-card__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: home-mood-spin 0.7s linear infinite;
}

.home-mood-dialog {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.home-mood-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.64);
}

.home-mood-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 520px);
  transform: translate(-50%, -50%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.home-mood-dialog__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.home-mood-dialog__body {
  margin-top: 0.85rem;
}

.home-mood-dialog__preview {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  color: rgb(var(--color-foreground));
}

.home-mood-dialog__copy,
.home-mood-dialog__helper {
  font-size: 0.94rem;
  line-height: 1.55;
  color: rgb(var(--color-foreground) / 0.76);
}

.home-mood-dialog__helper {
  margin-top: 0.6rem;
}

.home-mood-dialog__helper--center {
  text-align: center;
}

.home-mood-dialog__captcha {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-mood-dialog__error {
  margin-top: 0.35rem;
  color: #ef4444;
  font-size: 0.82rem;
}

.home-mood-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.home-mood-dialog__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.home-mood-dialog__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.home-mood-toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2300;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.home-mood-toast {
  min-width: min(320px, calc(100vw - 2rem));
  max-width: min(420px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 0 18px 40px rgb(var(--color-shadow) / 0.18);
}

.home-mood-dialog-fade-enter-active,
.home-mood-dialog-fade-leave-active,
.home-mood-toast-fade-enter-active,
.home-mood-toast-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.home-mood-dialog-fade-enter-from,
.home-mood-dialog-fade-leave-to,
.home-mood-toast-fade-enter-from,
.home-mood-toast-fade-leave-to {
  opacity: 0;
}

.home-mood-toast-fade-enter-from,
.home-mood-toast-fade-leave-to {
  transform: translateY(8px);
}

.home-mood-root--card-vintage {
  --mf-card-border: rgba(120, 72, 32, 0.35);
  --mf-card-bg:
    radial-gradient(120% 90% at 50% 0%, rgba(234, 179, 8, 0.2), transparent 52%),
    linear-gradient(155deg, #302112 0%, #3a2714 42%, #23170f 100%);
  --mf-glow-a: rgba(251, 191, 36, 0.2);
  --mf-glow-b: rgba(217, 119, 6, 0.2);
  --mf-card-text: rgba(255, 242, 215, 0.92);
  --mf-divider: rgba(255, 234, 196, 0.22);
  --mf-input-bg: rgba(255, 247, 219, 0.08);
  --mf-input-border: rgba(255, 214, 153, 0.34);
  --mf-input-text: #ffe6b6;
  --mf-input-placeholder: rgba(255, 214, 153, 0.72);
  --mf-cooldown: #fbbf24;
}

.home-mood-root--card-holo {
  --mf-card-border: rgba(148, 163, 184, 0.5);
  --mf-card-bg:
    radial-gradient(100% 80% at 10% 10%, rgba(16, 185, 129, 0.25), transparent 52%),
    radial-gradient(120% 85% at 92% 14%, rgba(14, 165, 233, 0.22), transparent 58%),
    linear-gradient(145deg, #0a0d26 0%, #102244 42%, #10201d 100%);
  --mf-glow-a: rgba(45, 212, 191, 0.22);
  --mf-glow-b: rgba(56, 189, 248, 0.22);
  --mf-card-text: rgba(233, 253, 255, 0.92);
  --mf-divider: rgba(180, 255, 246, 0.28);
  --mf-input-bg: rgba(226, 255, 255, 0.08);
  --mf-input-border: rgba(45, 212, 191, 0.34);
  --mf-input-text: #d6ffff;
  --mf-input-placeholder: rgba(167, 243, 208, 0.72);
  --mf-cooldown: #67e8f9;
}

@keyframes home-mood-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .home-mood-card {
    border-radius: 14px;
  }

  .home-mood-card__header-top {
    align-items: center;
    gap: 8px;
  }

  .home-mood-card__link {
    font-size: 0.9rem;
    letter-spacing: 0.03em;
  }

  .home-mood-card__actions {
    grid-template-columns: 1fr;
  }

  .home-mood-card__submit {
    width: 100%;
    min-width: 100%;
  }
}

@media (max-width: 640px) {
  .home-mood-dialog__actions {
    flex-direction: column-reverse;
  }

  .home-mood-dialog__button {
    width: 100%;
  }

  .home-mood-toast-stack {
    right: 0.75rem;
    left: 0.75rem;
    bottom: 0.75rem;
  }

  .home-mood-toast {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
