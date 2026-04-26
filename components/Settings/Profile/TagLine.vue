<template>
  <label class="profile-field">
    <span class="profile-field__label">{{ $t('components.profile-tagline.label') }}</span>
    <input
      v-model="tagLine"
      :disabled="!props.isEditable"
      type="text"
      class="profile-field__control"
    >
    <span
      v-if="props.errorMessage || validationError"
      class="profile-field__error"
    >
      {{ props.errorMessage || validationError }}
    </span>
  </label>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps({
  tagLine: {
    type: String,
    default: "",
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
  errorMessage: {
    type: String,
    default: "",
  },
});

// Rule to check for spaces
// const noSpacesRule = (value) => {
//   return !/\s/.test(value) || "No spaces allowed";
// };

// Rule to check for minimum length of 4 characters
const minLengthRule = (value) => {
  return value.length >= 4 || t("components.profile-tagline.min-4");
};

const maxLengthRule = (value) => {
  return value.length <= 45 || t("components.profile-tagline.max-45");
};

// Rule to check for special characters
const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || t("components.profile-tagline.less-3-special");
};
const blockedDomainRule = (value) => {
  // Regular expression to match domain names and URLs
  const domainRegex =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/[^\s]*)?/;

  // Check if the value matches the domain/URL regex
  const isBlocked = domainRegex.test(value);

  // Return the validation result
  return !isBlocked || t("components.profile-tagline.no-domain");
};

const emits = defineEmits(["updateTagLine"]);

const tagLine = ref(props.tagLine);
const validationRules = [blockedDomainRule, specialCharsRule, minLengthRule, maxLengthRule];

const validationError = computed(() => {
  if (!props.isEditable) return "";
  const failedRule = validationRules.find((rule) => rule(tagLine.value) !== true);
  return failedRule ? failedRule(tagLine.value) : "";
});

watch(
  () => props.tagLine,
  (newValue) => {
    tagLine.value = newValue;
  }
);

watch(tagLine, (newTagLine) => {
  emits("updateTagLine", newTagLine);
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
