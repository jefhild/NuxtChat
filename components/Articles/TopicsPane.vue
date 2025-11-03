<script setup>
const props = defineProps({
  topics: { type: Array, default: () => [] },
  slug: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  formatDateTime: { type: Function, required: true },
  localePath: { type: Function, required: true },
})
const emit = defineEmits(['select']) // fire to let parent close drawer
</script>

<template>
  <v-list lines="two" density="comfortable">
    <v-skeleton-loader v-if="loading" type="list-item@6" class="pa-2" />
    <template v-else>
      <v-list-item
        v-for="t in topics"
        :key="t.id"
        :active="t.slug === slug"
        class="cursor-pointer"
        :to="localePath(`/chat/articles/${t.slug}`)"
        link
        @click="emit('select', t)"
      >
        <template #prepend>
          <v-avatar v-if="t.botAvatarUrl" size="28">
            <v-img :src="t.botAvatarUrl" />
          </v-avatar>
        </template>

        <v-list-item-title class="text-body-2 font-weight-medium">
          {{ t.title }}
        </v-list-item-title>

        <v-list-item-subtitle class="text-caption">
          {{ formatDateTime(t.lastActivityAt) }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-list>
</template>