<template>
  <div class="d-flex align-center ga-1 text-disabled">
    <v-btn
      icon
      variant="text"
      density="comfortable"
      :disabled="disabled || !canVote"
      :color="currentVote === 1 ? 'primary' : undefined"
      @click="handleVote(1)"
    >
      <v-icon size="18">mdi-arrow-up-bold</v-icon>
    </v-btn>

    <span class="text-caption">{{ formatCount(currentScore) }}</span>

    <v-btn
      icon
      variant="text"
      density="comfortable"
      :disabled="disabled || !canVote"
      :color="currentVote === -1 ? 'primary' : undefined"
      @click="handleVote(-1)"
    >
      <v-icon size="18">mdi-arrow-down-bold</v-icon>
    </v-btn>
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
