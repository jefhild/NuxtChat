<template>
  <div class="vote-controls">
    <button
      type="button"
      class="vote-btn"
      :class="{ 'is-active': currentVote === 1 }"
      :disabled="disabled || !canVote"
      @click="handleVote(1)"
    >
      <i class="mdi mdi-arrow-up-bold" aria-hidden="true" />
    </button>

    <span class="vote-count">{{ formatCount(currentScore) }}</span>

    <button
      type="button"
      class="vote-btn"
      :class="{ 'is-active': currentVote === -1 }"
      :disabled="disabled || !canVote"
      @click="handleVote(-1)"
    >
      <i class="mdi mdi-arrow-down-bold" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const props = defineProps({
  id: { type: String, required: true },
  target: { type: String, required: true }, // 'entry' | 'reply'
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  disabled: { type: Boolean, default: true },
});

const emit = defineEmits(["update:score", "update:myVote", "vote"]);
const auth = useAuthStore();
const canVote = computed(() => auth.authStatus === "authenticated");

const currentVote = ref(props.myVote);
const currentScore = ref(props.score);

const formatCount = (value) => {
  const num = Number(value || 0);
  if (num < 1000) return String(num);
  if (num < 1000000) return `${(num / 1000).toFixed(1).replace(/\\.0$/, "")}k`;
  return `${(num / 1000000).toFixed(1).replace(/\\.0$/, "")}m`;
};

watch(
  () => props.myVote,
  (val) => {
    currentVote.value = val;
  }
);
watch(
  () => props.score,
  (val) => {
    currentScore.value = val;
  }
);

async function handleVote(value) {
  if (props.disabled || !canVote.value) return;
  try {
    const endpoint =
      props.target === "entry"
        ? "/api/votes/mood-feed-entry"
        : "/api/votes/mood-feed-reply";
    const payload =
      props.target === "entry"
        ? { entryId: props.id, value }
        : { replyId: props.id, value };
    const res = await $fetch(endpoint, { method: "POST", body: payload });
    currentVote.value = res.userVote;
    currentScore.value = res.score;
    emit("update:score", res.score);
    emit("update:myVote", res.userVote);
    emit("vote", {
      id: props.id,
      target: props.target,
      value,
      myVote: res.userVote,
      score: res.score,
    });
  } catch (err) {
    console.error("vote error:", err);
  }
}
</script>

<style scoped>
.vote-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: rgba(226, 232, 240, 0.82);
}

.vote-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.vote-btn:hover:not(:disabled),
.vote-btn:focus-visible {
  background: rgba(148, 163, 184, 0.16);
  color: rgba(241, 245, 249, 0.98);
  outline: none;
}

.vote-btn.is-active {
  color: #60a5fa;
}

.vote-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.vote-btn .mdi {
  font-size: 1rem;
}

.vote-count {
  min-width: 2ch;
  font-size: 0.76rem;
}
</style>
