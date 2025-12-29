<script setup>
/**
 * Single topic row.
 * Props:
 *  - topic: { id, title, botAvatarUrl?, lastActivityAt, todayCount, messageCount, score }
 *  - formatDateTime: (iso: string) => string
 * Emits:
 *  - select(id)
 */
const props = defineProps({
  topic: { type: Object, required: true },
  formatDateTime: { type: Function, required: true },
})
const emit = defineEmits(['select'])
</script>

<template>
  <v-list-item
    :key="props.topic.id"
    class="cursor-pointer"
    @click="emit('select', props.topic.id)"
  >
    <template #prepend>
      <v-avatar size="28" v-if="props.topic.botAvatarUrl">
        <v-img :src="props.topic.botAvatarUrl" />
      </v-avatar>
      <v-avatar v-else size="28" color="grey-lighten-3">
        <v-icon icon="mdi-file-document-outline" size="18" />
      </v-avatar>
    </template>

    <v-list-item-title class="text-body-2 font-weight-medium">
      {{ props.topic.title }}
    </v-list-item-title>

    <v-list-item-subtitle class="text-caption">
      {{ props.formatDateTime(props.topic.lastActivityAt) }}
      · {{ props.topic.messageCount || 0 }} messages
      · Today {{ props.topic.todayCount }}
      · Score {{ props.topic.score }}
    </v-list-item-subtitle>
  </v-list-item>
</template>
