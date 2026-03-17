<template>
  <v-sheet
    v-if="prompt"
    class="article-mood-prompt pa-3 pa-md-4"
    rounded="lg"
    elevation="0"
  >
    <div class="article-mood-prompt__header">
      <div class="article-mood-prompt__eyebrow">
        {{ t("pages.feeds.heading", "Mood Feed") }}
      </div>
      <div v-if="promptPageHref" class="article-mood-prompt__thread-link">
        <NuxtLink :to="promptPageHref">See all responses</NuxtLink>
      </div>
    </div>
    <div class="article-mood-prompt__question">
      {{ prompt.text }}
    </div>

    <div v-if="viewerEntry" class="article-mood-prompt__answered">
      <div class="article-mood-prompt__answered-header">
        <div class="article-mood-prompt__status">
          <v-icon
            size="16"
            :color="viewerEntry.status === 'pending_validation' ? 'warning' : 'primary'"
          >
            {{ viewerEntry.status === "pending_validation" ? "mdi-timer-sand" : "mdi-check-circle-outline" }}
          </v-icon>
          <span>
            {{
              viewerEntry.status === "pending_validation"
                ? "Response pending review"
                : "You answered this question"
            }}
          </span>
        </div>
        <div v-if="viewerEntry.createdAt" class="article-mood-prompt__answered-date">
          {{ formatAnswerDate(viewerEntry.createdAt) }}
        </div>
      </div>
      <div class="article-mood-prompt__answer-card">
        <div class="article-mood-prompt__answer-mark">"</div>
        <div class="article-mood-prompt__answer-text">
          {{ viewerEntry.text }}
        </div>
      </div>
    </div>

    <template v-else>
      <div class="article-mood-prompt__actions">
        <v-text-field
          v-model="promptAnswer"
          class="article-mood-prompt__input"
          variant="outlined"
          density="comfortable"
          hide-details
          :placeholder="t('pages.feeds.promptPlaceholder', 'Your response...')"
          maxlength="280"
          @keyup.enter="onSubmitPrompt"
        />
        <v-btn
          color="primary"
          :loading="submitBusy"
          :disabled="promptSubmitDisabled"
          @click="onSubmitPrompt"
        >
          {{ t("pages.feeds.submitButton", "Submit") }}
        </v-btn>
      </div>
      <div v-if="cooldownActive" class="article-mood-prompt__cooldown">
        {{ cooldownLabel }}
      </div>
    </template>
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
        <v-btn variant="text" @click="refineDialogOpen = false">
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
        <v-btn color="primary" :loading="consentBusy" @click="onConsentAccept">
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

  <v-snackbar v-model="submitNoticeOpen" timeout="3000">
    {{ submitNoticeText }}
  </v-snackbar>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import TurnstileWidget from "@/components/TurnstileWidget.vue";
import { buildMoodPromptSlug } from "@/utils/moodPromptSlug";

const props = defineProps({
  promptKey: { type: String, default: "" },
  articleSlug: { type: String, default: "" },
});

const { locale, t } = useI18n();
const auth = useAuthStore();
const localPath = useLocalePath();
const config = useRuntimeConfig();

const prompt = ref(null);
const viewerEntry = ref(null);
const promptAnswer = ref("");
const submitBusy = ref(false);
const refineDialogOpen = ref(false);
const refinedPreview = ref("");
const refinedOriginal = ref("");
const consentDialogOpen = ref(false);
const consentBusy = ref(false);
const pendingAction = ref(null);
const captchaToken = ref("");
const captchaError = ref("");
const captchaPassed = ref(false);
const limitDialogOpen = ref(false);
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

const captchaSiteKey = computed(() => config.public?.TURNSTILE_SITE_KEY || "");
const captchaEnabled = computed(() => !!captchaSiteKey.value);
const normalizedPromptKey = computed(() => String(props.promptKey || "").trim());
const normalizedArticleSlug = computed(() => String(props.articleSlug || "").trim());
const promptSubmitDisabled = computed(
  () => submitBusy.value || !promptAnswer.value.trim() || cooldownActive.value
);
const promptPageHref = computed(() => {
  const slug = buildMoodPromptSlug({
    promptText: prompt.value?.text,
    promptKey: prompt.value?.key,
  });
  return prompt.value?.key ? localPath(`/mood/${slug}`) : "";
});

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

const answerDateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const formatAnswerDate = (value) => {
  try {
    return answerDateFormatter.format(new Date(value));
  } catch {
    return "";
  }
};

const cooldownLabel = computed(() =>
  t("pages.feeds.cooldownActive", {
    time: formatDuration(cooldownRemainingMs.value),
  })
);

async function loadPromptState() {
  if (!normalizedPromptKey.value && !normalizedArticleSlug.value) {
    prompt.value = null;
    viewerEntry.value = null;
    return;
  }
  try {
    const res = await $fetch("/api/mood-feed/article-prompt", {
      query: {
        locale: locale.value,
        promptKey: normalizedPromptKey.value || undefined,
        articleSlug: normalizedArticleSlug.value || undefined,
      },
    });
    prompt.value = res?.prompt || null;
    viewerEntry.value = res?.viewerEntry || null;
  } catch {
    prompt.value = null;
    viewerEntry.value = null;
  }
}

async function loadPostEligibility(targetPromptKey = null) {
  const key = String(targetPromptKey || prompt.value?.key || "").trim() || null;
  try {
    const res = await $fetch("/api/mood-feed/post-eligibility", {
      query: key ? { promptKey: key } : undefined,
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

function rememberCaptchaPassed() {
  captchaPassed.value = true;
  if (import.meta.client) {
    localStorage.setItem("mfCaptchaPassed", "true");
  }
}

function extractFetchError(err) {
  const statusCode = err?.statusCode || err?.response?.status || null;
  const statusMessage =
    err?.statusMessage || err?.response?._data?.statusMessage || "";
  const data = err?.data || err?.response?._data || {};
  return { statusCode, statusMessage, data };
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

async function onSubmitPrompt() {
  const text = String(promptAnswer.value || "").trim().slice(0, 280);
  if (!text || !prompt.value?.key) return;
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
        prompt: prompt.value.text || "",
        response: text,
        locale: locale.value,
      },
    });
    refinedPreview.value = String(res?.refined || text).trim();
    refinedOriginal.value = text;
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
  if (!refinedPreview.value || !prompt.value?.key) return;
  submitBusy.value = true;
  try {
    const res = await $fetch("/api/mood-feed/entries", {
      method: "POST",
      body: {
        promptText: prompt.value.text || null,
        promptKey: prompt.value.key || null,
        originalText: refinedOriginal.value || null,
        refinedText: refinedPreview.value,
        locale: locale.value,
        captchaToken: captchaToken.value || undefined,
      },
    });

    submitNoticeText.value =
      res?.status === "pending_validation"
        ? t(
            "pages.feeds.noticePendingEntry",
            "Thanks! Your response is under review before it appears."
          )
        : t("pages.feeds.noticePosted", "Posted to the Mood Feed.");
    submitNoticeOpen.value = true;
    rememberCaptchaPassed();
    captchaToken.value = "";
    refineDialogOpen.value = false;
    promptAnswer.value = "";
    await loadPromptState();
    await loadPostEligibility(prompt.value?.key || null);
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

watch(
  [
    () => locale.value,
    () => auth.authStatus,
    () => normalizedPromptKey.value,
    () => normalizedArticleSlug.value,
  ],
  async () => {
    await loadPromptState();
    await loadPostEligibility(prompt.value?.key || null);
  },
  { immediate: true }
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
</script>

<style scoped>
.article-mood-prompt {
  margin-top: 8px;
  background: color-mix(in oklab, rgb(var(--v-theme-surface)) 92%, rgb(var(--v-theme-primary)) 8%);
  border: 1px solid rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.22);
}

.article-mood-prompt__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.92);
}

.article-mood-prompt__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.article-mood-prompt__question {
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 12px;
}

.article-mood-prompt__thread-link {
  margin-left: auto;
  flex: 0 0 auto;
}

.article-mood-prompt__thread-link a {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  white-space: nowrap;
}

.article-mood-prompt__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.article-mood-prompt__input {
  flex: 1 1 auto;
}

.article-mood-prompt__cooldown,
.article-mood-prompt__answered-date {
  margin-top: 8px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface-rgb, 148, 163, 184), 0.78);
}

.article-mood-prompt__answered {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.article-mood-prompt__answered-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.article-mood-prompt__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  color: rgba(var(--v-theme-on-surface-rgb, 203, 213, 225), 0.88);
}

.article-mood-prompt__answer-card {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.08);
  border: 1px solid rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.16);
}

.article-mood-prompt__answer-mark {
  font-size: 2rem;
  line-height: 0.9;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface-rgb, 148, 163, 184), 0.55);
}

.article-mood-prompt__answer-text {
  white-space: pre-wrap;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .article-mood-prompt__header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .article-mood-prompt__thread-link {
    margin-left: 0;
  }

  .article-mood-prompt__thread-link a {
    white-space: normal;
  }

  .article-mood-prompt__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .article-mood-prompt__answered-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
