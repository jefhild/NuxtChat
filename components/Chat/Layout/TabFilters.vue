<!-- components/ChatLayoutTabFilters.vue -->
<script setup>
import { toRefs } from 'vue'

/**
 * v-model usage:
 * <ChatLayoutTabFilters v-model="tabFilters" />
 */
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
})
const emit = defineEmits(['update:modelValue'])
const { modelValue } = toRefs(props)

const toggle = (key) => {
  emit('update:modelValue', { ...modelValue.value, [key]: !modelValue.value[key] })
}
</script>

<template>
<div class="flex gap-4 items-center text-subtitle-2">
  <label class="flex items-center gap-1 text-blue-darken-3">
    <input
      type="checkbox"
      :checked="modelValue.online"
      @change="toggle('online')"
      class="accent-green-600"
    />
    Online
  </label>
  <label class="flex items-center ml-2 text-red">
    <input
      type="checkbox"
      :checked="modelValue.offline"
      @change="toggle('offline')"
      class="accent-red-600"
    />
    Offline
  </label>
  <label class="flex items-center ml-2 text-green-darken-2">
    <input
      type="checkbox"
      :checked="modelValue.active"
      @change="toggle('active')"
      class="accent-blue-600"
    />
    Active
  </label>
  <!-- <label class="flex items-center gap-1 text-purple-600">
    <input
      type="checkbox"
      :checked="modelValue.articles"
      @change="toggle('articles')"
      class="accent-purple-600"
    />
    Articles
  </label> -->
</div>
</template>