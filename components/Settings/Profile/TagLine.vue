<template>
  <v-text-field
    :disabled="!props.isEditable"
    v-model="tagLine"
    :label="$t('components.profile-tagline.label')"
    variant="underlined"
    :rules="[blockedDomainRule, specialCharsRule, minLengthRule, maxLengthRule]"
    :error-messages="props.errorMessage ? [props.errorMessage] : []"
  ></v-text-field>

  <!-- <div v-else>
    <p>{{ tagLine }}</p>
  </div> -->
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

watch(tagLine, (newTagLine) => {
  emits("updateTagLine", newTagLine);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
