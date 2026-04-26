<template>
  <label class="profile-field">
    <span class="profile-field__label">{{ $t('components.profile-displayname.display-name') }}</span>
    <input
      v-model="localDisplayName"
      :disabled="!props.isEditable"
      type="text"
      class="profile-field__control"
    >
    <span
      v-if="props.isEditable && displayNameError"
      class="profile-field__error"
    >
      {{ displayNameError }}
    </span>
  </label>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from "vue-i18n";
const { t } = useI18n();
// Props
const props = defineProps({
  displayName: {
    type: String,
    required: true,
  },
  isEditable: {
    type: Boolean,
    default: false,
  },
});

// Emit events
const emit = defineEmits(['updateDisplayName', 'validation']);

// Local state for the display name
const localDisplayName = ref(props.displayName);

// Validation rules
const noSpacesRule = (value) => {
  return !/\s/.test(value) || t('components.profile-displayname.no-spaces');
};

const minLengthRule = (value) => {
  return value.length >= 4 || t('components.profile-displayname.min-4');
};

const maxLengthRule = (value) => {
  return value.length <= 15 || t('components.profile-displayname.max-15'); 
};

const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || t('components.profile-displayname.less-3-special');
};

const displayNameRules = [
  (v) => !!v || t('components.profile-displayname.required '),
  noSpacesRule,
  minLengthRule,
  maxLengthRule,
  specialCharsRule,
];

const displayNameError = computed(() => {
  const failedRule = displayNameRules.find((rule) => rule(localDisplayName.value) !== true);
  return failedRule ? failedRule(localDisplayName.value) : "";
});

// Emit validation result
const validateDisplayName = () => {
  const isValid = displayNameRules.every((rule) => rule(localDisplayName.value) === true);
  emit('validation', isValid);
};

// Watch for changes to the local display name and emit the necessary events
watch(localDisplayName, (newDisplayName) => {
  emit('updateDisplayName', newDisplayName);
  validateDisplayName(); // Validate after every change
});

// Watch for changes to the prop and update localDisplayName accordingly
watch(() => props.displayName, (newDisplayName) => {
  localDisplayName.value = newDisplayName;
});
// Watch for changes to `isEditable` and trigger validation when switching to edit mode
watch(() => props.isEditable, (newEditableState) => {
  if (newEditableState) {
    validateDisplayName(); // Validate when entering edit mode
  }
});

// Validate when the component is mounted
onMounted(() => {
  validateDisplayName(); // Trigger validation immediately when mounted
});
</script>

<style scoped>
.profile-field {
  display: grid;
  gap: 0.35rem;
}

.profile-field__label {
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 600;
}

.profile-field__control {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.7rem 0.85rem;
  font-size: 1rem;
}

.profile-field__control:disabled {
  opacity: 1;
  cursor: default;
  background: rgb(var(--color-surface) / 0.76);
  color: rgb(var(--color-foreground) / 0.62);
}

.profile-field__error {
  color: rgb(var(--color-danger));
  font-size: 0.8rem;
}
</style>
