
<template>
  <v-list lines="two" density="comfortable">
    <v-skeleton-loader
      v-if="props.pending"
      type="list-item@6"
      class="pa-2"
    />
    <template v-else>
      <TopicItem
        v-for="t in props.topics"
        :key="t.id"
        :topic="t"
        :formatDateTime="props.formatDateTime"
        @select="id => emit('open-thread', id)"
      />

      <v-list-item v-if="!props.topics.length" title="No discussions yet." />
    </template>
  </v-list>
</template>




<script setup>
import TopicItem from './TopicItem.vue'

/**
 * Props:
 *  - topics: Array<{ id, title, botAvatarUrl?, lastActivityAt, todayCount, messageCount, score }>
 *  - pending: boolean
 *  - formatDateTime: (iso: string) => string   // inject from page for SSR-safe formatting
 *
 * Emits:
 *  - open-thread(id: string)
 */
const props = defineProps({
  topics: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
  formatDateTime: { type: Function, required: true },
})
const emit = defineEmits(['open-thread'])
</script>
