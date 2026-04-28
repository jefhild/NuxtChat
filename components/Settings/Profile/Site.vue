<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">{{ $t('components.profile-site.label') }}</span>
    <input
      v-model="siteUrl"
      :disabled="!props.isEditable"
      type="url"
      class="ui-settings-field__control"
    >
    <span
      v-if="props.isEditable && validationError"
      class="ui-settings-field__error"
    >
      {{ validationError }}
    </span>
  </label>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps({
  siteUrl: {
    type: String,
    default: "",
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

const urlValidationRule = (value) => {
  // Regular expression to match URLs
  const urlRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/;

  // Check if the value matches the URL regex
  const isValidUrl = urlRegex.test(value);

  // Return the validation result
  return isValidUrl || t('components.profile-site.valid');
};

const emits = defineEmits(["updateSite"]);

const siteUrl = ref(props.siteUrl);
const validationError = computed(() => {
  const result = urlValidationRule(siteUrl.value);
  return result === true ? "" : result;
});

watch(
  () => props.siteUrl,
  (newValue) => {
    siteUrl.value = newValue;
  }
);

watch(siteUrl, (newSiteUrl) => {
  emits("updateSite", newSiteUrl);
});
</script>
