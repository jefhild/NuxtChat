<template>
  <div class="flex items-center">
    <label class="toggle-ai">
      <input
        :checked="modelValue"
        type="checkbox"
        class="toggle-ai__input"
        :disabled="isDisabled"
        @change="onToggle(($event.target).checked)"
      >
      <span class="toggle-ai__track" aria-hidden="true">
        <span class="toggle-ai__thumb" />
      </span>
      <span class="toggle-ai__label">
        {{ modelValue ? t('components.toggle-ai.ai') : t('components.toggle-ai.real') }}
      </span>
    </label>
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

<style scoped>
.toggle-ai {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: rgba(226, 232, 240, 0.78);
  cursor: pointer;
}

.toggle-ai__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-ai__track {
  position: relative;
  width: 2.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.85);
  transition: background 0.18s ease;
}

.toggle-ai__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.18s ease;
}

.toggle-ai__input:checked + .toggle-ai__track {
  background: rgba(59, 130, 246, 0.85);
}

.toggle-ai__input:checked + .toggle-ai__track .toggle-ai__thumb {
  transform: translateX(1rem);
}

.toggle-ai__input:disabled + .toggle-ai__track,
.toggle-ai__input:disabled ~ .toggle-ai__label {
  opacity: 0.55;
  cursor: default;
}

.toggle-ai__label {
  font-size: 0.875rem;
}
</style>
