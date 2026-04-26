<template>
  <label class="profile-field">
    <span class="profile-field__label">{{ $t('components.profile-site.label') }}</span>
    <input
      v-model="siteUrl"
      :disabled="!props.isEditable"
      type="url"
      class="profile-field__control"
    >
    <span
      v-if="props.isEditable && validationError"
      class="profile-field__error"
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
