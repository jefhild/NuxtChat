<template>
  <v-row no-gutters align="start" class="flex-wrap">
    <v-col
      v-if="props.showAiButton"
      cols="12"
      sm="1"
      class="d-flex justify-center pt-1"
    >
      <v-tooltip :text="aiTooltip">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            icon="mdi-auto-fix"
            variant="text"
            :disabled="aiDisabled"
            :loading="props.aiLoading"
            @click="emit('openAiBio')"
          />
        </template>
      </v-tooltip>
    </v-col>
    <v-col
      :cols="props.showAiButton ? 12 : 12"
      :sm="props.showAiButton ? 11 : 12"
    >
      <v-textarea
        :disabled="!props.isEditable"
        v-model="internalBio"
        :label="$t('components.profile-bio.bio')"
        rows="5"
        variant="outlined"
        :counter="props.minLength || undefined"
        :error-messages="props.errorMessage ? [props.errorMessage] : []"
      />
    </v-col>
  </v-row>
  <!-- <div v-else>
    <p class="bio-paragraph">{{ bio }}</p>
  </div> -->
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  bio: {
    type: String,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
  minLength: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: "",
  },
  showAiButton: {
    type: Boolean,
    default: false,
  },
  aiDisabled: {
    type: Boolean,
    default: false,
  },
  aiLoading: {
    type: Boolean,
    default: false,
  },
  aiRemaining: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["updateBio", "openAiBio"]);
const internalBio = ref(props.bio);
const aiDisabled = computed(() => {
  return !props.isEditable || props.aiDisabled || props.aiRemaining <= 0;
});
const aiTooltip = computed(() => {
  if (props.aiRemaining <= 0) {
    return "AI bio limit reached";
  }
  return `Generate bio with AI (${props.aiRemaining} left)`;
});

// Keep internalBio in sync with props.bio
watch(
  () => props.bio,
  (newVal) => {
    if (newVal !== internalBio.value) {
      internalBio.value = newVal;
    }
  }
);

// Emit only on user input
watch(internalBio, (newVal) => {
  emit("updateBio", newVal);
});
</script>

<style scoped>
.bio-paragraph {
  font-size: 1rem;
  line-height: 1.65;
  color: #374151;
  font-style: italic;
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  text-align: justify;
}
</style>
