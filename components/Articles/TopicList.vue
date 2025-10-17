<script setup>
const props = defineProps({
  topics: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
})
const emit = defineEmits(['select'])
const onSelect = (id) => emit('select', id)
</script>

<template>
  <div>
    <div class="font-semibold mb-2">Articles</div>
    <ul>
<li v-for="t in topics" :key="t.id" @click="$emit('select', t.id)">
        <div class="text-sm font-medium flex items-center gap-2">
          <img v-if="t.botAvatarUrl" :src="t.botAvatarUrl" alt="" class="w-5 h-5 rounded" />
          <span>{{ t.title }}</span>
        </div>
        <div class="text-xs text-gray-500">
          {{ new Date(t.lastActivityAt).toLocaleString() }}
          · Today {{ t.todayCount }}
          · Score {{ t.score }}
        </div>
      </li>
    </ul>
  </div>
</template>