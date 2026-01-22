<template>
  <form
    ref="composerRef"
    class="w-full flex items-center gap-2"
    @submit.prevent="handleSubmit"
  >
    <input
      v-model="localDraft"
      :placeholder="placeholderText"
      class="flex-1 w-full border rounded px-3 py-2 chat-composer-input"
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
});

const config = useRuntimeConfig();
const imchattyPeerId = config.public.IMCHATTY_ID;

const emit = defineEmits(["update:draft", "send"]);
const localDraft = ref(props.draft);

const auth = useAuthStore();
const meId = computed(() => props.meId || auth.user?.id || null);
const { t } = useI18n();
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
.chat-composer-input,
.chat-composer-send {
  border-color: rgb(var(--v-theme-primary)) !important;
}
</style>

<style scoped>
form {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}
input {
  flex: 1 1 auto;
  min-width: 0;
}
button {
  flex: 0 0 auto;
}
</style>
