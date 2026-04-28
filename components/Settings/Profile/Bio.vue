<template>
  <div
    class="grid items-start gap-2"
    :class="props.showAiButton ? 'sm:grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'"
  >
    <div
      v-if="props.showAiButton"
      class="flex justify-start pt-1 sm:justify-center"
    >
      <button
        type="button"
        class="bio-ai-btn"
        :disabled="aiDisabled"
        :title="aiTooltip"
        :aria-label="aiTooltip"
        @click="emit('openAiBio')"
      >
        <i
          class="mdi"
          :class="props.aiLoading ? 'mdi-loading bio-ai-btn__icon bio-ai-btn__icon--spinning' : 'mdi-auto-fix bio-ai-btn__icon'"
          aria-hidden="true"
        />
      </button>
    </div>
    <label class="ui-settings-field">
      <span class="ui-settings-field__label">{{ $t('components.profile-bio.bio') }}</span>
      <textarea
        v-model="internalBio"
        :disabled="!props.isEditable"
        rows="5"
        class="ui-settings-field__control ui-settings-field__control--textarea"
      />
      <span v-if="props.errorMessage" class="ui-settings-field__error">
        {{ props.errorMessage }}
      </span>
      <span v-else-if="props.minLength" class="ui-settings-field__meta">
        {{ internalBio.length }} / {{ props.minLength }}
      </span>
    </label>
  </div>
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
.bio-ai-btn {
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.14);
  color: rgb(var(--color-primary));
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bio-ai-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.bio-ai-btn__icon {
  font-size: 1rem;
  line-height: 1;
}

.bio-ai-btn__icon--spinning {
  animation: bio-spin 0.8s linear infinite;
}

.bio-paragraph {
  font-size: 1rem;
  line-height: 1.65;
  color: #374151;
  font-style: italic;
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  text-align: justify;
}

@keyframes bio-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
