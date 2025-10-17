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
      placeholder="Write a reply…"
    />
    <div class="d-flex justify-end ga-2 mt-1">
      <v-btn size="small" variant="text" @click="emit('cancel')" :disabled="loading">Cancel</v-btn>
      <v-btn size="small" color="primary" :loading="loading" :disabled="disabled" @click="onSubmit">Reply</v-btn>
    </div>
  </div>
</template>


<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },   // draft text
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  autoFocus: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const local = ref(props.modelValue)
watch(() => props.modelValue, v => { if (v !== local.value) local.value = v })
watch(local, v => emit('update:modelValue', v))

const ta = ref()
onMounted(async () => {
  if (!props.autoFocus) return
  await nextTick()
  try { ta.value?.focus?.() } catch {}
})

const onSubmit = () => {
  const t = (local.value || '').trim()
  if (!t || props.disabled || props.loading) return
  emit('submit', t)
  local.value = ''
}
</script>



<style scoped>
.bg-surface-1 { background: color-mix(in oklab, var(--v-theme-surface) 96%, black 4%); }
</style>