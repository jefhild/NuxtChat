

<template>
  <v-card flat class="flex-grow-1 overflow-auto">
    <div class="px-3 py-2 text-subtitle-2">Participants</div>

    <v-skeleton-loader
      v-if="props.pending"
      type="list-item-avatar@6"
      class="px-2"
    />

    <template v-else>
      <v-list v-if="props.participants.length" density="comfortable">
        <ParticipantsItem
          v-for="p in props.participants"
          :key="p.id"
          :participant="p"
          :formatDateTime="props.formatDateTime"
          @open="id => emit('open-profile', id)"
        />
      </v-list>

      <div
        v-else
        class="flex-grow-1 d-flex align-center justify-center text-medium-emphasis py-8"
      >
        <span>Participants appear when a thread is open</span>
      </div>
    </template>
  </v-card>
</template>


<script setup>
import ParticipantsItem from './ParticipantsItem.vue'

/**
 * Props:
 *  - participants: Array<{ id, displayname, avatarUrl?, role?, lastSeenAt? }>
 *  - pending: boolean
 *  - formatDateTime?: (iso: string) => string
 *
 * Emits:
 *  - open-profile(id: string)
 */
const props = defineProps({
  participants: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
  formatDateTime: { type: Function, default: null },
})
const emit = defineEmits(['open-profile'])
</script>