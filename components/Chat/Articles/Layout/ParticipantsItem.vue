<script setup>
/**
 * Single participant row.
 * Props:
 *  - participant: { id, displayname, avatarUrl?, role?, lastSeenAt? }
 *  - formatDateTime?: (iso: string) => string
 * Emits:
 *  - open(id)
 */
const props = defineProps({
  participant: { type: Object, required: true },
  formatDateTime: { type: Function, default: null },
})
const emit = defineEmits(['open'])

const roleColor = (role) => {
  switch (role) {
    case 'author': return 'deep-purple-lighten-4'
    case 'editor': return 'indigo-lighten-4'
    case 'bot': return 'green-lighten-4'
    default: return 'grey-lighten-4'
  }
}
</script>

<template>
  <v-list-item class="cursor-pointer" @click="emit('open', props.participant.id)">
    <template #prepend>
      <v-avatar size="32">
        <v-img v-if="props.participant.avatarUrl" :src="props.participant.avatarUrl" />
        <v-icon v-else icon="mdi-account-circle" />
      </v-avatar>
    </template>

    <v-list-item-title class="text-body-2 font-weight-medium">
      {{ props.participant.displayname }}
    </v-list-item-title>

    <v-list-item-subtitle class="text-caption d-flex align-center gap-1">
      <v-chip
        v-if="props.participant.role"
        size="x-small"
        :color="roleColor(props.participant.role)"
        class="mr-1"
        label
      >
        {{ props.participant.role }}
      </v-chip>

      <span v-if="props.participant.lastSeenAt && props.formatDateTime">
        • Seen {{ props.formatDateTime(props.participant.lastSeenAt) }}
      </span>
    </v-list-item-subtitle>
  </v-list-item>
</template>