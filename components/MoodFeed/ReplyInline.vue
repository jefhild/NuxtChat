<template>
  <div class="reply-inline">
    <textarea
      ref="ta"
      v-model="local"
      class="reply-inline__input"
      rows="2"
      maxlength="500"
      :disabled="disabled || loading"
      :placeholder="placeholder"
    />
    <div class="reply-inline__actions">
      <button
        type="button"
        class="reply-inline__button reply-inline__button--secondary"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="reply-inline__button reply-inline__button--primary"
        :class="{ 'is-loading': loading }"
        :disabled="disabled"
        @click="onSubmit"
      >
        <span v-if="loading" class="reply-inline__spinner" aria-hidden="true" />
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  autoFocus: { type: Boolean, default: true },
  submitLabel: { type: String, default: "Reply" },
  placeholder: { type: String, default: "Write a reply..." },
});

const emit = defineEmits(["update:modelValue", "submit", "cancel"]);

const local = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => {
    if (value !== local.value) local.value = value;
  }
);
watch(local, (value) => emit("update:modelValue", value));

const ta = ref();
onMounted(async () => {
  if (!props.autoFocus) return;
  await nextTick();
  try {
    ta.value?.focus?.();
  } catch {}
});

const onSubmit = () => {
  const text = String(local.value || "").trim();
  if (!text || props.disabled || props.loading) return;
  emit("submit", text);
  local.value = "";
};
</script>

<style scoped>
.reply-inline {
  padding: 0.75rem;
  border-radius: 0.875rem;
  background: color-mix(in oklab, var(--v-theme-surface) 96%, black 4%);
}

.reply-inline__input {
  width: 100%;
  min-height: 4.5rem;
  resize: vertical;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.16);
  color: inherit;
  font: inherit;
  line-height: 1.45;
}

.reply-inline__input:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.42);
  outline-offset: 1px;
}

.reply-inline__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.45rem;
}

.reply-inline__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.45rem 0.8rem;
  border-radius: 0.7rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, opacity 0.15s ease;
}

.reply-inline__button--secondary {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: transparent;
  color: inherit;
}

.reply-inline__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.reply-inline__button:hover:not(:disabled),
.reply-inline__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.reply-inline__button:disabled {
  opacity: 0.55;
  cursor: default;
}

.reply-inline__spinner {
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: reply-inline-spin 0.7s linear infinite;
}

@keyframes reply-inline-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
