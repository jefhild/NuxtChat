<template>
  <form
    ref="composerRef"
    class="w-full flex items-center gap-2"
    @submit.prevent="handleSubmit"
  >
    <div v-if="helperActions.length" class="chat-composer-helpers">
      <button
        v-for="action in helperActions"
        :key="action"
        type="button"
        class="chat-composer-helper"
        :disabled="isDisabled || !peerId"
        @click="emit('apply-helper', action)"
      >
        {{ helperActionLabels[action] || action }}
      </button>
    </div>
    <div class="chat-composer-row">
      <input
        v-model="localDraft"
        :placeholder="placeholderText"
        :class="[
          'flex-1 border rounded px-3 py-2 chat-composer-input',
          { 'chat-composer-input--language': languagePracticeMode },
        ]"
        :disabled="isDisabled || !peerId"
        :title="isDisabled ? placeholderText : ''"
        @input="onInput"
        @keydown="onKey"
      />
      <button
        class="shrink-0 rounded ml-2 px-3 py-2 border chat-composer-send"
        :disabled="isDisabled || !peerId || !localDraft.trim()"
      >
        {{ t("components.message.composer.send") }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch, computed, toRef } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useTypingChannel } from "@/composables/useTypingChannel";
import { useI18n } from "vue-i18n";

const props = defineProps({
  draft: { type: String, default: "" },
  peerId: { type: String, default: null },
  meId: { type: String, default: null },
  conversationKey: { type: String, default: null },
  blockedUserIds: { type: Array, default: () => [] },
  helperActions: { type: Array, default: () => [] },
  languagePracticeMode: { type: Boolean, default: false },
});

const config = useRuntimeConfig();
const imchattyPeerId = config.public.IMCHATTY_ID;

const emit = defineEmits(["update:draft", "send", "apply-helper"]);
const localDraft = ref(props.draft);

const auth = useAuthStore();
const meId = computed(() => props.meId || auth.user?.id || null);
const { t } = useI18n();
const browserLocale = computed(() => {
  if (!import.meta.client || typeof navigator === "undefined") return "en";
  const value = String(navigator.language || "").trim().toLowerCase();
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("zh")) return "zh";
  return "en";
});
const isBlocked = computed(() =>
  props.peerId
    ? (props.blockedUserIds || []).some(
        (id) => String(id) === String(props.peerId)
      )
    : false
);
const needsProfileCompletion = computed(() =>
  ["anon_authenticated", "authenticated"].includes(auth.authStatus) &&
  !auth.isProfileComplete
);

const derivedKey = computed(
  () =>
    props.conversationKey ||
    (!meId.value || !props.peerId
      ? null
      : [String(meId.value), String(props.peerId)].sort().join(":"))
);

const { sendTypingPing } = useTypingChannel({
  meId,
  peerId: toRef(props, "peerId"),
  conversationKey: derivedKey,
});

const isDisabled = computed(() => {
  if (isBlocked.value) return true;
  if (needsProfileCompletion.value) return true;
  switch (auth.authStatus) {
    case "anonymous":
      return true;
    case "guest":
    case "onboarding":
      return props.peerId !== imchattyPeerId;
    case "anon_authenticated":
    case "authenticated":
      return false;
    default:
      // safest fallback: disable
      return true;
  }
});

watch(
  () => props.draft,
  (val) => {
    if (val !== localDraft.value) localDraft.value = val;
  }
);
watch(localDraft, (val) => emit("update:draft", val));

/** ——— Throttled sender (never undefined) ——— */
const sendPing = (() => {
  let last = 0;
  const WAIT = 1000;
  return () => {
    const now = Date.now();
    if (now - last >= WAIT) {
      last = now;
      try {
        sendTypingPing?.(); // 🔹 send broadcast
      } catch (err) {
        console.error("[sendPing] error:", err);
      }
    }
  };
})();

const placeholderText = computed(() => {
  if (!props.peerId) return t("components.message.composer.placeholder"); // optional
  if (isBlocked.value) return t("components.message.composer.blocked");
  if (needsProfileCompletion.value)
    return t("components.message.composer.complete-profile");
  if (isDisabled.value) return t("components.message.composer.sign-in"); // unauth / blocked
  return t("components.message.composer.placeholder"); // normal
});

const helperActionLabels = computed(() => ({
  ask_correction: t(
    "components.languagePracticeBanner.actions.askCorrection",
    {},
    { locale: browserLocale.value }
  ),
  translate: t(
    "components.languagePracticeBanner.actions.translate",
    {},
    { locale: browserLocale.value }
  ),
  simpler: t(
    "components.languagePracticeBanner.actions.simpler",
    {},
    { locale: browserLocale.value }
  ),
  natural: t(
    "components.languagePracticeBanner.actions.natural",
    {},
    { locale: browserLocale.value }
  ),
}));

function onInput() {
  if (props.peerId && meId.value) sendPing();
}
function onKey() {
  if (props.peerId && meId.value) sendPing();
}

function handleSubmit() {
  const text = localDraft.value.trim();
  if (!props.peerId || !text) return;
  emit("send", text);
  localDraft.value = "";
}
</script>

<style scoped>
form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
}

.chat-composer-helpers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chat-composer-helper {
  border: 1px solid rgba(var(--color-secondary), 0.28);
  border-radius: 999px;
  background: rgba(var(--color-surface), 0.78);
  color: rgb(var(--color-secondary));
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  padding: 0.35rem 0.7rem;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.chat-composer-helper:disabled {
  border-color: rgba(var(--color-border), 0.22);
  color: rgb(var(--color-muted));
  cursor: default;
}

.chat-composer-helper:hover:not(:disabled) {
  background: rgba(var(--color-secondary), 0.12);
}

.chat-composer-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.32rem;
  border: 1px solid rgba(var(--color-border), 0.22);
  border-radius: 1rem;
  background: rgba(var(--color-surface), 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

input {
  flex: 1 1 auto;
  min-width: 0;
}
button {
  flex: 0 0 auto;
}

.chat-composer-input {
  min-height: 2.55rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(var(--color-border), 0.2) !important;
  background: rgba(var(--color-background), 0.56);
  color: rgb(var(--color-foreground));
  padding: 0.68rem 0.85rem;
  font-size: 0.95rem;
  line-height: 1.35;
}

.chat-composer-input::placeholder {
  color: rgb(var(--color-muted));
}

.chat-composer-input:focus {
  outline: none;
  border-color: rgba(var(--color-secondary), 0.68) !important;
  box-shadow: 0 0 0 3px rgba(var(--color-secondary), 0.16);
}

.chat-composer-input--language {
  border-color: rgba(114, 230, 126, 0.42) !important;
}

.chat-composer-input--language:focus {
  border-color: rgba(114, 230, 126, 0.88) !important;
  box-shadow: 0 0 0 3px rgba(114, 230, 126, 0.16);
}

.chat-composer-input:disabled {
  background: rgba(var(--color-background), 0.36);
  color: rgb(var(--color-muted));
}

.chat-composer-send {
  min-height: 2.55rem;
  min-width: 5.9rem;
  border-radius: 0.8rem;
  border-color: rgba(var(--color-primary), 0.86) !important;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground));
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.chat-composer-send:hover:not(:disabled) {
  background: rgba(var(--color-primary), 0.9);
}

.chat-composer-send:disabled {
  background: rgba(var(--color-surface-elevated), 0.58);
  color: rgb(var(--color-muted));
  border-color: rgba(var(--color-border), 0.2) !important;
}

@media (max-width: 640px) {
  .chat-composer-row {
    gap: 0.4rem;
    padding: 0.28rem;
  }

  .chat-composer-input {
    min-height: 2.4rem;
    padding: 0.62rem 0.75rem;
    font-size: 0.9rem;
  }

  .chat-composer-send {
    min-width: 5.2rem;
    min-height: 2.4rem;
    padding-inline: 0.85rem;
  }
}
</style>
