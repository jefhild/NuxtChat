<template>
  <v-text-field
    v-if="isEditable"
    v-model="siteUrl"
    :label="$t('components.profile-site.label')"
    variant="underlined"
    :rules="[urlValidationRule]"
  ></v-text-field>

  <div v-else>
    <!-- <p>{{ tagLine }}</p> -->
  </div>
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

watch(siteUrl, (newSiteUrl) => {
  emits("updateSite", newSiteUrl);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
