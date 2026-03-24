<template>
  <div
    :class="[
      'home-mood-root',
      `home-mood-root--${variant}`,
      `home-mood-root--card-${resolvedCardTheme}`,
    ]"
  >
    <v-sheet class="home-mood-card pa-4 pa-md-5" elevation="0">
      <div class="home-mood-card__glow" aria-hidden="true" />
      <div class="home-mood-card__content">
        <div v-if="variant === 'home'" class="home-mood-card__header">
          <div class="home-mood-card__header-main">
            <div class="home-mood-card__header-top">
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
                class="mb-2 home-mood-card__badge"
              >
                {{ t("pages.feeds.heading", "Mood Feed") }}
              </v-chip>
              <v-btn
                variant="text"
                color="primary"
                :to="localPath('/feeds')"
                class="home-mood-card__link"
              >
                {{ t("pages.feeds.seeAll", "Browse mood feed") }}
              </v-btn>
            </div>
            <h2 class="text-h5 font-weight-bold mb-1">
              {{ t("pages.feeds.promptTitle", "Daily Mood Question") }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
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
        <v-text-field
          v-model="promptAnswer"
          class="home-mood-card__input"
          variant="outlined"
          density="comfortable"
          hide-details
          :placeholder="t('pages.feeds.promptPlaceholder', 'Your response...')"
          maxlength="280"
          @keyup.enter="onSubmitPrompt"
        />
        <v-btn
          color="primary"
          class="home-mood-card__submit"
          size="large"
          :loading="submitBusy"
          :disabled="promptSubmitDisabled"
          @click="onSubmitPrompt"
        >
          {{ t("pages.feeds.submitButton", "Submit") }}
        </v-btn>
        </div>

        <div v-if="cooldownActive" class="home-mood-card__cooldown text-caption mt-2">
          {{ cooldownLabel }}
        </div>
        <hr v-if="variant === 'feeds'" class="home-mood-card__divider">
      </div>
    </v-sheet>

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

    <v-snackbar v-model="submitNoticeOpen" timeout="3000">
      {{ submitNoticeText }}
    </v-snackbar>
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
  --mf-card-border: rgba(100, 116, 139, 0.24);
  --mf-card-bg:
    radial-gradient(1200px 280px at 8% 0%, rgba(59, 130, 246, 0.08), transparent 62%),
    linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.95));
  --mf-glow-a: rgba(59, 130, 246, 0.18);
  --mf-glow-b: rgba(14, 165, 233, 0.12);
  --mf-card-text: #1e293b;
  --mf-divider: rgba(100, 116, 139, 0.24);
  --mf-input-bg: rgba(255, 255, 255, 0.9);
  --mf-input-border: rgba(100, 116, 139, 0.34);
  --mf-input-text: #0f172a;
  --mf-input-placeholder: rgba(71, 85, 105, 0.72);
  --mf-cooldown: #2563eb;
}

:global(.v-theme--dark) .home-mood-root {
  --mf-card-border: rgba(148, 163, 184, 0.28);
  --mf-card-bg:
    radial-gradient(1200px 280px at 8% 0%, rgba(59, 130, 246, 0.2), transparent 62%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.82));
  --mf-glow-a: rgba(56, 189, 248, 0.22);
  --mf-glow-b: rgba(37, 99, 235, 0.2);
  --mf-card-text: #dbe6ff;
  --mf-divider: rgba(148, 163, 184, 0.3);
  --mf-input-bg: rgba(2, 6, 23, 0.6);
  --mf-input-border: rgba(148, 163, 184, 0.34);
  --mf-input-text: #e8eefc;
  --mf-input-placeholder: rgba(148, 163, 184, 0.85);
  --mf-cooldown: #93c5fd;
}

.home-mood-card {
  border-radius: 18px;
  border: 1px solid var(--mf-card-border);
  background: var(--mf-card-bg);
  position: relative;
  overflow: hidden;
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

.home-mood-card__link {
  text-transform: none;
  margin-top: 0;
  letter-spacing: 0.08em;
  font-weight: 600;
  min-width: 0;
  white-space: nowrap;
}

.home-mood-card__badge {
  border: 1px solid color-mix(in oklab, var(--mf-card-text) 20%, transparent 80%);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.home-mood-card__prompt {
  font-size: clamp(1.05rem, 1.6vw, 1.24rem);
  font-weight: 600;
  line-height: 1.35;
  color: var(--mf-card-text);
  letter-spacing: 0.012em;
}

.home-mood-card__related {
  margin-left: 8px;
  font-size: 0.88em;
  color: color-mix(in oklab, var(--mf-card-text) 80%, #93c5fd 20%);
  text-decoration: underline;
}

.home-mood-card__related:hover {
  color: #bfdbfe;
}

.home-mood-card__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.home-mood-card__input :deep(.v-field) {
  border-radius: 16px;
  background: var(--mf-input-bg);
  border: 1px solid var(--mf-input-border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.home-mood-card__input :deep(.v-field__input),
.home-mood-card__input :deep(input) {
  color: var(--mf-input-text);
}

.home-mood-card__input :deep(input::placeholder) {
  color: var(--mf-input-placeholder);
}

.home-mood-card__input :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.24);
}

.home-mood-card__submit {
  min-width: 132px;
  letter-spacing: 0.04em;
  border-radius: 16px;
  height: 46px;
  font-weight: 700;
}

.home-mood-card__cooldown {
  color: var(--mf-cooldown);
}

.home-mood-card__divider {
  margin-top: 12px;
  border: 0;
  border-top: 1px solid var(--mf-divider);
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

@media (max-width: 960px) {
  .home-mood-card {
    border-radius: 14px;
  }

  .home-mood-card__header-top {
    align-items: center;
    gap: 8px;
  }

  .home-mood-card__badge {
    margin-bottom: 0 !important;
  }

  .home-mood-card__link {
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    padding-inline: 6px;
  }

  .home-mood-card__actions {
    grid-template-columns: 1fr;
  }

  .home-mood-card__submit {
    width: 100%;
    min-width: 100%;
  }
}
</style>
