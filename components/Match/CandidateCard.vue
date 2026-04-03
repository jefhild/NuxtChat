<template>
  <v-card class="candidate-card" :elevation="2" rounded="lg">
    <v-card-text class="pa-3">
      <div class="d-flex align-center gap-3">
        <v-avatar
          size="44"
          color="surface-variant"
          class="cursor-pointer"
          @click="onViewProfile"
        >
          <v-img v-if="candidate.avatar_url" :src="candidate.avatar_url" :alt="candidate.displayname" />
          <v-icon v-else icon="mdi-account" />
        </v-avatar>

        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex align-center gap-1">
            <span
              class="text-body-1 font-weight-medium text-truncate cursor-pointer text-primary"
              style="text-decoration: underline; text-underline-offset: 2px;"
              @click="onViewProfile"
            >
              {{ candidate.displayname || $t("components.candidateCard.anonymous") }}
            </span>
            <span v-if="candidate.country_emoji" class="text-body-2">
              {{ candidate.country_emoji }}
            </span>
            <v-chip
              v-if="isOnline"
              size="x-small"
              color="success"
              variant="flat"
              class="ml-1"
            >
              {{ $t("components.candidateCard.online") }}
            </v-chip>
          </div>
          <p
            v-if="candidate.tagline"
            class="text-body-2 text-medium-emphasis text-truncate mt-0 mb-0"
          >
            {{ candidate.tagline }}
          </p>
        </div>

        <!-- Match score bar -->
        <div v-if="candidate.score" class="score-wrap text-center">
          <v-progress-circular
            :model-value="Math.round(candidate.score * 100)"
            :color="scoreColor"
            size="36"
            width="3"
          >
            <span class="text-caption font-weight-bold">{{ Math.round(candidate.score * 100) }}</span>
          </v-progress-circular>
        </div>
      </div>

      <!-- Mood badges -->
      <div v-if="candidate.emotion || candidate.intent" class="d-flex flex-wrap gap-1 mt-2">
        <v-chip
          v-if="candidate.emotion"
          size="x-small"
          variant="tonal"
          color="secondary"
          :prepend-icon="emotionIcon(candidate.emotion)"
        >
          {{ $t(`match.emotion.${candidate.emotion}`, candidate.emotion) }}
        </v-chip>
        <v-chip
          v-if="candidate.intent"
          size="x-small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-forum-outline"
        >
          {{ $t(`match.intent.${candidate.intent}`, candidate.intent) }}
        </v-chip>
        <v-chip
          v-if="candidate.energy"
          size="x-small"
          variant="tonal"
          color="warning"
          :prepend-icon="energyIcon(candidate.energy)"
        >
          {{ $t(`match.energy.${candidate.energy}`, candidate.energy) }}
        </v-chip>
      </div>
    </v-card-text>

    <v-card-actions class="px-3 pt-0 pb-3">
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        block
        :prepend-icon="isAi ? 'mdi-robot-outline' : 'mdi-message-text-outline'"
        @click="onChat"
      >
        {{ $t("components.candidateCard.chatWith", { name: candidate.displayname || $t("components.candidateCard.anonymous") }) }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  candidate: {
    type: Object,
    required: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isAi: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["chat", "view-profile"]);

const scoreColor = computed(() => {
  const s = props.candidate.score ?? 0;
  if (s >= 0.7) return "success";
  if (s >= 0.4) return "warning";
  return "default";
});

function emotionIcon(emotion) {
  const map = {
    lonely: "mdi-emoticon-sad-outline",
    calm: "mdi-emoticon-neutral-outline",
    annoyed: "mdi-emoticon-angry-outline",
    overwhelmed: "mdi-emoticon-frown-outline",
    playful: "mdi-emoticon-excited-outline",
    curious: "mdi-emoticon-cool-outline",
    hopeful: "mdi-emoticon-happy-outline",
    sad: "mdi-emoticon-cry-outline",
  };
  return map[emotion] ?? "mdi-emoticon-outline";
}

function energyIcon(energy) {
  const map = {
    drained: "mdi-battery-low",
    normal: "mdi-battery-medium",
    wired: "mdi-battery-high",
  };
  return map[energy] ?? "mdi-battery-outline";
}

function onViewProfile() {
  emit("view-profile", props.candidate);
}

function onChat() {
  emit("chat", props.candidate);
}
</script>

<style scoped>
.candidate-card {
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.candidate-card:hover {
  transform: translateY(-2px);
}

.score-wrap {
  flex-shrink: 0;
}
</style>
