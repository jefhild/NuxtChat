<template>
  <div class="reply-inline pa-2 rounded-lg bg-surface-1">
    <v-textarea
      ref="ta"
      v-model="local"
      auto-grow
      rows="2"
      variant="outlined"
      density="comfortable"
      :disabled="disabled || loading"
      :counter="500"
      :placeholder="placeholder"
    />
    <div class="d-flex justify-end ga-2 mt-1">
      <v-btn
        size="small"
        variant="text"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancel
      </v-btn>
      <v-btn
        size="small"
        color="primary"
        :loading="loading"
        :disabled="disabled"
        @click="onSubmit"
      >
        {{ submitLabel }}
      </v-btn>
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
.bg-surface-1 {
  background: color-mix(in oklab, var(--v-theme-surface) 96%, black 4%);
}
</style>
