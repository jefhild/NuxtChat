<template>
  <div class="d-flex flex-column h-100">
    <div ref="scrollEl" class="flex-grow-1 overflow-auto">
      <!-- Ephemeral onboarding bubbles -->

      <!-- {{ consented }} -->
      <div v-if="isPreAuth && isBotSelected" class="pa-2">
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
            <span class="typing-label">Typing…</span>
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
            :disabled="consentBusy"
            @click="onConsentYes"
          >
            Yes
          </v-chip>

          <v-chip
            variant="outlined"
            class="mr-3"
            :disabled="consentBusy"
            @click="onConsentNo"
          >
            No
          </v-chip>

          <v-chip variant="outlined" :disabled="consentBusy" @click="onLogin">
            I already have an account
          </v-chip>
        </div>
      </div>
    </div>

    <div class="mt-2">
      <div v-if="!canSend" class="text-caption mt-1">
        {{
          authStatus === "guest" || authStatus === "onboarding"
            ? "Finish your profile to message people."
            : authStatus === "unauthenticated"
            ? "Please consent to our terms, and start chatting."
            : "Messaging is disabled."
        }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useGeoLocationDefaults } from "~/composables/useGeoLocationDefaults";
import {
  useOnboardingAi,
  setOnboardingBotMessageHandler,
} from "~/composables/useOnboardingAi";
import { useMarkdown } from "~/composables/useMarkdown";

const { init: initMd, render } = useMarkdown();

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
const scrollEl = ref(null);
const consentBusy = ref(false);
const booted = ref(false);
const botTyping = ref(false);

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
  return /confirm.*18\+.*accept/i.test(String(text));
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function captureBotMessage(payload) {
  if (!props.isPreAuth) return;

  const text = typeof payload === "string" ? payload : payload?.text ?? "";
  if (!text) return;
  if (props.consented && isConsentPrompt(text)) return;

  botTyping.value = false; // stop dots when message lands

  // de-dupe last message
  const last = ephemeralThread.value[ephemeralThread.value.length - 1];
  if (last && last.text === text) return;

  draft.appendThreadMessage({
    from: "imchatty",
    text,
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
  consentBusy.value = true;
  try {
    // Optimistically remove the consent bubble(s) from the merged stream
    ephemeralThread.value = ephemeralThread.value.filter(
      (m) => !(m.from === "imchatty" && isConsentPrompt(m.text))
    );

    // Let the server drive: it will emit set_consent + first question
    botTyping.value = true;
    await sendUserMessage("yes");
  } finally {
    consentBusy.value = false;
  }
}

function onConsentNo() {
  router.push("/articles");
}

function onLogin() {
  router.push("/signin");
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
