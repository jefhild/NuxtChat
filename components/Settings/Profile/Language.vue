<template>
  <v-select
    :disabled="!props.isEditable"
    variant="underlined"
    :items="props.locales"
    :model-value="props.selectedLocale || 'en'"
    item-title="label"
    item-value="code"
    :label="t('components.profile-language.default')"
    @update:modelValue="(val) => emit('updateLocale', val)"
  />
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  selectedLocale: String,
  locales: {
    type: Array,
    default: () => [],
  },
  isEditable: Boolean,
});

const emit = defineEmits(["updateLocale"]);
const { t } = useI18n();
</script>
