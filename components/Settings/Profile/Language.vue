<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">{{ t('components.profile-language.default') }}</span>
    <select
      :disabled="!props.isEditable"
      :value="props.selectedLocale || 'en'"
      class="ui-settings-field__control"
      @change="emit('updateLocale', ($event.target).value)"
    >
      <option
        v-for="localeOption in props.locales"
        :key="localeOption.code"
        :value="localeOption.code"
      >
        {{ localeOption.label }}
      </option>
    </select>
  </label>
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
