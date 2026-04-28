<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">{{ $t('components.profile-tagline.label') }}</span>
    <input
      v-model="tagLine"
      :disabled="!props.isEditable"
      type="text"
      class="ui-settings-field__control"
    >
    <span
      v-if="props.errorMessage || validationError"
      class="ui-settings-field__error"
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
