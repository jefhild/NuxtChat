<template>
  <div class="d-flex align-center">
    <v-checkbox
      :model-value="modelValue"
      @update:model-value="onToggle"
      color="primary"
      hide-details
      density="compact"
      class="text-medium-emphasis"
      :label="modelValue ? $t('components.toggle-ai.ai') : $t('components.toggle-ai.real')"
      :disabled="isDisabled"
    />
  </div>
</template>

<script setup>
import { computed } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  disabled: { type: Boolean, default: false },
})

const isDisabled = computed(() => !!props.disabled)
const emit = defineEmits(["update:modelValue"])

const onToggle = (val) => {
  emit("update:modelValue", val)
}
</script>