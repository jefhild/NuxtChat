<script setup>
import { ref } from 'vue'
const props = defineProps({ disabled: { type: Boolean, default: false } })
const emit = defineEmits(['send'])
const text = ref('')

function submit() {
  if (props.disabled) return
  const t = text.value.trim()
  if (!t) return
  emit('send', t)
  text.value = ''
}
</script>

<template>
  <div class="d-flex gap-2 mt-2">
    <input
      v-model="text"
      :disabled="disabled"
      class="flex-1"
      placeholder="Type a message…"
      @keydown.enter.prevent="submit"
    />
    <button :disabled="disabled" @click="submit">Send</button>
  </div>
</template>