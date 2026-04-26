<template>
  <div class="onboarding-shell">
    <div ref="scrollEl" class="onboarding-scroll">
      <!-- Ephemeral onboarding bubbles -->

      <!-- {{ consented }} -->
      <div v-if="isPreAuth && isBotSelected" class="px-1 py-2">
        <div
          v-if="isFinalizing"
          class="onboarding-finalizing"
        >
          <span class="onboarding-spinner" aria-hidden="true" />
          <div class="onboarding-finalizing__title">
            {{ $t("onboarding.finalizingTitle") }}
          </div>
          <div class="onboarding-finalizing__body">
            {{ $t("onboarding.finalizingBody") }}
          </div>
          <div
            v-if="handoffRevealName"
            class="handoff-reveal"
          >
            <div class="handoff-reveal__label">
              {{ $t("onboarding.handoffLabel", "Getting your first chat ready") }}
            </div>
            <div class="handoff-reveal__card">
              <span class="handoff-reveal__avatar">
                <img
                  v-if="handoffRevealAvatar"
                  :src="handoffRevealAvatar"
                  :alt="handoffRevealName"
                  class="handoff-reveal__image"
                />
                <span v-else class="handoff-reveal__fallback">
                  {{ handoffInitial }}
                </span>
              </span>
              <div class="handoff-reveal__name">
                {{ handoffRevealName }}
              </div>
            </div>
          </div>
        </div>
        <template v-else>
          <div
            v-for="m in ephemeralThread"
            :key="m.id"
            class="my-1"
            :class="m.from === 'me' ? 'text-right' : 'text-left'"
          >
            <div
              class="px-3 py-2 rounded-xl d-inline-block mb-1"
              :class="m.from === 'me' ? 'onboarding-bubble onboarding-bubble--me' : 'onboarding-bubble onboarding-bubble--bot'"
              v-html="(render && render(m.text)) || m.text"
            />
            <div
              v-if="
                m.from !== 'me' &&
                m.id === lastBotMessageId &&
                Array.isArray(m.quickReplies) &&
                m.quickReplies.length
              "
              class="onboarding-chip-row"
            >
              <button
                v-for="q in m.quickReplies"
                :key="q"
                type="button"
                class="onboarding-chip onboarding-chip--outline"
                @click="onQuickReply(q)"
              >
                {{ q }}
              </button>
            </div>
          </div>
          <!-- {{ botTyping }} -->
          <!-- 🔹 Single trailing typing bubble (never duplicates) -->
          <div v-if="botTyping" class="my-1 text-left">
            <div
              class="px-3 py-2 rounded-xl d-inline-block mb-1 typing-chip"
            >
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="typing-label">{{ $t("onboarding.typing") }}</span>
            </div>
          </div>

          <!-- Consent action chips (show ONLY until consent) -->
          <div
            v-if="!consented"
            class="onboarding-consent-actions"
          >
            <button
              type="button"
              class="onboarding-chip onboarding-chip--solid"
              :disabled="consentBusy || captchaVerifying"
              @click="onConsentYes"
            >
              {{ $t("onboarding.yes") }}
            </button>

            <button
              type="button"
              class="onboarding-chip onboarding-chip--outline"
              :disabled="consentBusy || captchaVerifying"
              @click="onConsentNo"
            >
              {{ $t("onboarding.no") }}
            </button>

            <button
              type="button"
              class="onboarding-chip onboarding-chip--outline"
              :disabled="consentBusy || captchaVerifying"
              @click="onLogin"
            >
              {{ $t("onboarding.alreadyAccount") }}
            </button>
          </div>

          <ClientOnly>
            <div
              v-if="showCaptcha"
              class="onboarding-captcha"
            >
              <TurnstileWidget
                :site-key="captchaSiteKey"
                @verified="onCaptchaVerified"
                @expired="onCaptchaExpired"
                @error="onCaptchaError"
              />
              <div class="onboarding-caption onboarding-caption--center">
                {{ $t("onboarding.captchaPrompt") }}
              </div>
              <div v-if="captchaError" class="onboarding-caption onboarding-caption--error">
                {{ captchaError }}
              </div>
            </div>
          </ClientOnly>
        </template>
      </div>
    </div>

    <div class="onboarding-footer">
      <div v-if="!canSend" class="onboarding-caption">
        {{
          authStatus === "guest" || authStatus === "onboarding"
            ? $t("onboarding.finishProfileNotice")
            : authStatus === "unauthenticated"
            ? $t("onboarding.consentNotice")
            : $t("onboarding.messagingDisabled")
        }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useGeoLocationDefaults } from "~/composables/useGeoLocationDefaults";
import {
  useOnboardingAi,
  setOnboardingBotMessageHandler,
} from "~/composables/useOnboardingAi";
import { useMarkdown } from "~/composables/useMarkdown";

const { init: initMd, render } = useMarkdown();
const { t, te, locale, availableLocales } = useI18n();
const config = useRuntimeConfig();

const draft = useOnboardingDraftStore();
const { getDefaults } = useGeoLocationDefaults();
const { resume, sendUserMessage } = useOnboardingAi();
const router = useRouter();

const props = defineProps({
  authStatus: { type: String, required: true },
  canSend: { type: Boolean, default: false },
  isPreAuth: { type: Boolean, default: false },
  isBotSelected: { type: Boolean, default: false },
  consented: { type: Boolean, default: false }, // <- passed from index.vue
});
const emit = defineEmits(["send"]);

const ephemeralThread = computed(() => draft.thread || []); // persisted thread
const isFinalizing = computed(() => draft.stage === "finalizing");
const scrollEl = ref(null);
const consentBusy = ref(false);
const captchaVerifying = ref(false);
const booted = ref(false);
const botTyping = ref(false);
const localeRefreshBusy = ref(false);
const captchaToken = ref("");
const captchaError = ref("");
const pendingConsent = ref(false);
const captchaSiteKey = computed(
  () => config.public?.TURNSTILE_SITE_KEY || ""
);
const captchaEnabled = computed(() => !!captchaSiteKey.value);
const showCaptcha = computed(
  () => captchaEnabled.value && pendingConsent.value && !props.consented
);
const lastBotMessageId = computed(() => {
  const list = ephemeralThread.value || [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.from !== "me") return list[i]?.id || null;
  }
  return null;
});
const handoffRevealName = computed(() =>
  String(draft.liveMoodPersonaDisplayName || "").trim()
);
const handoffRevealAvatar = computed(() =>
  String(draft.liveMoodPersonaAvatarUrl || "").trim()
);
const handoffInitial = computed(() => {
  const name = handoffRevealName.value;
  return name ? name.charAt(0).toUpperCase() : "?";
});

// let parent toggle it while awaiting the bot
defineExpose({
  setTyping(val) {
    botTyping.value = !!val;
  },
  acceptConsent() {
    return onConsentYes();
  },
});

// Simple detector for the consent prompt text
function isConsentPrompt(text = "") {
  const normalized = String(text || "").trim().toLowerCase();
  const allLocales = Array.isArray(availableLocales) ? availableLocales : [];
  const localized = allLocales
    .map((code) => {
      try {
        if (!te("onboarding.consentPrompt", code)) return null;
        return t("onboarding.consentPrompt", {}, { locale: code });
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const prompts = [
    te("onboarding.consentPrompt")
      ? t("onboarding.consentPrompt")
      : "Do you confirm you are 18+ and accept the terms to continue?",
    "do you confirm you are 18+ and accept the terms to continue?",
    ...localized,
  ]
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean);
  return prompts.some((p) => normalized.includes(p));
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function captureBotMessage(payload) {
  if (!props.isPreAuth) return;

  const data = typeof payload === "string" ? { text: payload } : payload || {};
  const text = data?.text ?? "";
  if (!text) return;
  if (props.consented && isConsentPrompt(text)) return;

  botTyping.value = false; // stop dots when message lands

  // de-dupe last message
  const last = ephemeralThread.value[ephemeralThread.value.length - 1];
  if (last && last.text === text) {
    const incomingReplies = Array.isArray(data?.quickReplies)
      ? data.quickReplies
      : [];
    const lastReplies = Array.isArray(last.quickReplies)
      ? last.quickReplies
      : [];
    if (incomingReplies.length && !lastReplies.length) {
      draft.setField?.("thread", [
        ...ephemeralThread.value.slice(0, -1),
        { ...last, quickReplies: incomingReplies },
      ]);
    }
    return;
  }

  draft.appendThreadMessage({
    from: "imchatty",
    text,
    quickReplies: Array.isArray(data?.quickReplies) ? data.quickReplies : [],
    ts: Date.now(),
  });

  scrollToBottom();
}

if (import.meta.client) {
  onMounted(async () => {
    // console.log("[onb] props:", {
    //   isPreAuth: props.isPreAuth,
    //   isBotSelected: props.isBotSelected,
    //   consented: props.consented,
    //   authStatus: props.authStatus,
    // });

    setOnboardingBotMessageHandler(captureBotMessage);
    try {
      const notices = ["mfLimitNotice", "mfRegisterNotice"];
      for (const key of notices) {
        const notice = localStorage.getItem(key);
        if (!notice) continue;
        draft.appendThreadMessage({
          from: "imchatty",
          text: notice,
          ts: Date.now(),
        });
        localStorage.removeItem(key);
      }
    } catch {}
    if (props.isPreAuth && props.isBotSelected && !booted.value) {
      const needsResume =
        !props.consented || (props.consented && draft.stage !== "done");
      if (needsResume) {
        booted.value = true;
        botTyping.value = true;
        resume().catch((err) => console.warn("[onb] resume error:", err));
      }
    }

    draft.loadLocal?.();
    await initMd();
  });

  onBeforeUnmount(() => setOnboardingBotMessageHandler(() => {}));
}

watch(ephemeralThread, scrollToBottom, { deep: true });

watch(
  locale,
  async (val, old) => {
    if (!val || val === old) return;
    if (!props.isPreAuth || !props.isBotSelected || props.consented) return;
    if (localeRefreshBusy.value) return;
    localeRefreshBusy.value = true;
    try {
      if (typeof draft.clearThread === "function") {
        draft.clearThread();
      } else if (typeof draft.setField === "function") {
        draft.setField("thread", []);
      } else {
        draft.thread = [];
      }
      botTyping.value = true;
      await resume();
    } catch (err) {
      botTyping.value = false;
      console.warn("[onboarding] locale refresh failed:", err?.message || err);
    } finally {
      localeRefreshBusy.value = false;
    }
  }
);

// Clear ephemerals when unlocking
watch(
  () => props.authStatus,
  (s) => {
    if (
      s === "anon_authenticated" ||
      s === "authenticated" ||
      s === "unauthenticated"
    ) {
      draft.clearThread?.();
      if (s === "unauthenticated") {
        draft.clearAll?.();
      }
      botTyping.value = false;
    }
  }
);
const withTimeout = (p, ms = 4000) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("geo timeout")), ms)
    ),
  ]);

watch(
  () => props.consented,
  async (v, prev) => {
    if (!v || prev) return;

    // remove consent prompts
    ephemeralThread.value = ephemeralThread.value.filter(
      (m) => !isConsentPrompt(m.text)
    );

    // client only + only once
    if (!import.meta.client) return;

    if (draft.countryId || draft.stateId || draft.cityId) return;

    (async () => {
      try {
        const { countryId, stateId, cityId, ip } = await withTimeout(
          getDefaults()
        );

        if (countryId) draft.setField("countryId", countryId);
        if (stateId) draft.setField("stateId", stateId);
        if (cityId) draft.setField("cityId", cityId);
        if (ip) draft.setField("ip", ip);
      } catch (e) {
        // DO NOT reference countryId/stateId/cityId here
        console.warn("[onboarding][geo] failed:", e?.message || e, e?.stack || "");
      }
    })();
  }
);

watch(
  () => props.consented,
  (v) => {
    if (!v) return;
    pendingConsent.value = false;
    captchaToken.value = "";
    captchaError.value = "";
    captchaVerifying.value = false;
  }
);

// If the user leaves the bot, don't nuke the flow.
// Just stop typing dots and allow re-entry to re-run resume().
watch(
  () => props.isBotSelected,
  (isBot) => {
    if (!isBot && props.isPreAuth) {
      botTyping.value = false;
      // Allow resume() to run again when user returns, as long as onboarding isn't done.
      if (draft.stage !== "done") booted.value = false;
    }
  }
);

// If user switches to the bot later, resume once
watch(
  () => ({
    pre: props.isPreAuth,
    bot: props.isBotSelected,
    c: props.consented,
  }),
  ({ pre, bot, c }) => {
    if (!pre || !bot || booted.value) return;
    const needsResume = !c || (c && draft.stage !== "done");
    if (needsResume) {
      booted.value = true;
      botTyping.value = true;
      resume();
    }
  },
  { immediate: false, deep: false }
);

async function onConsentYes() {
  if (consentBusy.value) return;
  if (captchaEnabled.value && !captchaToken.value) {
    pendingConsent.value = true;
    captchaError.value = "";
    return;
  }
  await submitConsent(captchaToken.value || undefined);
}

function onConsentNo() {
  router.push("/");
}

function onLogin() {
  router.push("/signin");
}

async function onQuickReply(label) {
  if (!label) return;
  botTyping.value = true;
  await sendUserMessage(label);
}

async function submitConsent(token) {
  if (consentBusy.value || captchaVerifying.value) return;
  consentBusy.value = true;
  captchaVerifying.value = true;
  try {
    // Optimistically remove the consent bubble(s) from the merged stream
    ephemeralThread.value = ephemeralThread.value.filter(
      (m) => !(m.from === "imchatty" && isConsentPrompt(m.text))
    );

    // Let the server drive: it will emit set_consent + first question
    botTyping.value = true;
    await sendUserMessage("yes", { captchaToken: token });
  } finally {
    consentBusy.value = false;
    captchaVerifying.value = false;
    pendingConsent.value = false;
    captchaToken.value = "";
  }
}

async function onCaptchaVerified(token) {
  if (!token) return;
  captchaToken.value = token;
  captchaError.value = "";
  if (pendingConsent.value) {
    await submitConsent(token);
  }
}

function onCaptchaExpired() {
  captchaToken.value = "";
  captchaError.value = t("onboarding.captchaExpired");
}

function onCaptchaError() {
  captchaToken.value = "";
  captchaError.value = t("onboarding.captchaFailed");
}
</script>

<style scoped>
.onboarding-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.55);
  border: none;
  border-radius: 10px;
  padding: 4px 6px;
}

.onboarding-scroll {
  flex: 1 1 auto;
  overflow: auto;
}

.onboarding-finalizing {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 1.5rem;
  text-align: center;
}

.onboarding-spinner {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  border: 3px solid rgba(96, 165, 250, 0.22);
  border-top-color: #60a5fa;
  animation: onboarding-spin 0.85s linear infinite;
  margin-bottom: 0.75rem;
}

.onboarding-finalizing__title,
.handoff-reveal__name {
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
}

.onboarding-finalizing__body,
.handoff-reveal__label,
.onboarding-caption {
  color: #cbd5e1;
  font-size: 0.875rem;
}

.onboarding-finalizing__body {
  margin-top: 0.25rem;
}

.handoff-reveal__label {
  margin-bottom: 0.5rem;
}

.handoff-reveal__name {
  margin-top: 0.75rem;
}

.onboarding-bubble {
  color: #e2e8f0;
}

.onboarding-bubble--bot {
  background: #334155;
}

.onboarding-bubble--me {
  background: #2563eb;
  color: #ffffff;
}

.onboarding-chip-row,
.onboarding-consent-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.onboarding-chip-row {
  margin-top: 0.5rem;
}

.onboarding-consent-actions {
  margin-top: 0.75rem;
  justify-content: center;
}

.onboarding-chip {
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.onboarding-chip:disabled {
  opacity: 0.55;
  cursor: default;
}

.onboarding-chip--solid {
  border: 1px solid transparent;
  background: #2563eb;
  color: #ffffff;
}

.onboarding-chip--outline {
  border: 1px solid rgba(96, 165, 250, 0.45);
  background: rgba(37, 99, 235, 0.1);
  color: #bfdbfe;
}

.onboarding-chip--solid:hover:not(:disabled) {
  background: #1d4ed8;
}

.onboarding-chip--outline:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.18);
}

.onboarding-captcha {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.onboarding-caption--center {
  margin-top: 0.5rem;
  text-align: center;
}

.onboarding-caption--error {
  margin-top: 0.25rem;
  color: #fca5a5;
}

.onboarding-footer {
  margin-top: 0.5rem;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  margin-right: 4px;
  animation: blink 1.2s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.15s;
}
.dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.2;
  }
  40% {
    opacity: 1;
  }
}

.typing-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid rgba(148, 163, 184, 0.35);
}
.typing-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.9);
  display: inline-block;
  animation: blink 1.2s infinite;
}
.typing-chip .dot:nth-child(1) {
  animation-delay: 0s;
}
.typing-chip .dot:nth-child(2) {
  animation-delay: 0.15s;
}
.typing-chip .dot:nth-child(3) {
  animation-delay: 0.3s;
}
.typing-chip .typing-label {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.95);
  margin-left: 4px;
}

.handoff-reveal {
  width: 100%;
  max-width: 280px;
}

.handoff-reveal__card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 20px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.handoff-reveal__avatar {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.3);
}

.handoff-reveal__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.handoff-reveal__fallback {
  align-items: center;
  background: rgba(59, 130, 246, 0.2);
  color: #e2e8f0;
  display: inline-flex;
  font-size: 1.4rem;
  font-weight: 700;
  height: 100%;
  justify-content: center;
  width: 100%;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

@keyframes onboarding-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
