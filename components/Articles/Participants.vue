<script setup>
import { computed } from 'vue'
import { useArticlePresence } from '@/composables/articles/useArticlePresence'

const props = defineProps({
  threadId: { type: String, required: true }
})
const threadIdRef = computed(() => props.threadId)
const { now } = useArticlePresence(threadIdRef)
</script>

<template>
  <div>
    <div class="font-semibold mb-2">Participants (Now)</div>
    <div v-if="!now.length" class="text-sm text-gray-500">No one visible right now.</div>
    <ul>
      <li v-for="u in now" :key="u.userId" class="text-sm py-1 flex items-center gap-2">
        <img v-if="u.avatarUrl" :src="u.avatarUrl" class="w-6 h-6 rounded-full" />
        <span>{{ u.displayname || u.userId }}</span>
      </li>
    </ul>
  </div>
</template>