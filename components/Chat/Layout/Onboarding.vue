<template>
  <div class="d-flex flex-column h-100">
    <div ref="scrollEl" class="flex-grow-1 overflow-auto">
      <!-- Ephemeral onboarding bubbles -->

      <!-- {{ consented }} -->
      <div v-if="isPreAuth && isBotSelected" class="pa-2">
        <div
          v-if="isFinalizing"
          class="d-flex align-center justify-center pa-6 flex-column text-center"
        >
          <v-progress-circular indeterminate color="primary" class="mb-3" />
          <div class="text-body-1 font-weight-medium">
            {{ $t("onboarding.finalizingTitle") }}
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ $t("onboarding.finalizingBody") }}
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
              :class="
                m.from === 'me' ? 'bg-primary text-white' : 'bg-grey-lighten-3'
              "
              v-html="(render && render(m.text)) || m.text"
            />
            <div
              v-if="
                m.from !== 'me' &&
                m.id === lastBotMessageId &&
                Array.isArray(m.quickReplies) &&
                m.quickReplies.length
              "
              class="mt-2 d-flex flex-wrap gap-2"
            >
              <v-chip
                v-for="q in m.quickReplies"
                :key="q"
                color="primary"
                variant="outlined"
                @click="onQuickReply(q)"
              >
                {{ q }}
              </v-chip>
            </div>
          </div>
          <!-- {{ botTyping }} -->
          <!-- 🔹 Single trailing typing bubble (never duplicates) -->
          <div v-if="botTyping" class="my-1 text-left">
            <div
              class="px-3 py-2 rounded-xl d-inline-block mb-1 bg-grey-lighten-3 typing-chip"
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
            class="mt-3 d-flex justify-center flex-wrap gap-2"
          >
            <v-chip
              color="primary"
              variant="elevated"
              class="mr-3"
              :disabled="consentBusy || captchaVerifying"
              @click="onConsentYes"
            >
              {{ $t("onboarding.yes") }}
            </v-chip>

            <v-chip
              variant="outlined"
              class="mr-3"
              :disabled="consentBusy || captchaVerifying"
              @click="onConsentNo"
            >
              {{ $t("onboarding.no") }}
            </v-chip>

            <v-chip
              variant="outlined"
              :disabled="consentBusy || captchaVerifying"
              @click="onLogin"
            >
              {{ $t("onboarding.alreadyAccount") }}
            </v-chip>
          </div>

          <ClientOnly>
            <div
              v-if="showCaptcha"
              class="mt-3 d-flex flex-column align-center"
            >
              <HcaptchaWidget
                :site-key="captchaSiteKey"
                @verified="onCaptchaVerified"
                @expired="onCaptchaExpired"
                @error="onCaptchaError"
              />
              <div class="text-caption text-medium-emphasis mt-2 text-center">
                {{ $t("onboarding.captchaPrompt") }}
              </div>
              <div v-if="captchaError" class="text-caption text-error mt-1">
                {{ captchaError }}
              </div>
            </div>
          </ClientOnly>
        </template>
      </div>
    </div>

    <div class="mt-2">
      <div v-if="!canSend" class="text-caption mt-1">
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
const { t, locale, availableLocales } = useI18n();
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
  () => config.public?.HCAPTCHA_SITE_KEY || ""
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
        return t("onboarding.consentPrompt", {}, { locale: code });
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const prompts = [
    t("onboarding.consentPrompt"),
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
const TAG = "[onboarding][geo]";

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
        // console.log(`${TAG} defaults:`, { countryId, stateId, cityId });

        if (countryId) draft.setField("countryId", countryId);
        if (stateId) draft.setField("stateId", stateId);
        if (cityId) draft.setField("cityId", cityId);
        if (ip) draft.setField("ip", ip);

        // sanity log
        console.log(`${TAG} draft now:`, {
          countryId: draft.countryId,
          stateId: draft.stateId,
          cityId: draft.cityId,
          ip: draft.ip,
        });
      } catch (e) {
        // DO NOT reference countryId/stateId/cityId here
        console.warn(`${TAG} failed:`, e?.message || e, e?.stack || "");
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
  router.push("/articles");
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
}
.typing-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
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
  color: rgba(0, 0, 0, 0.55);
  margin-left: 4px;
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
</style>
