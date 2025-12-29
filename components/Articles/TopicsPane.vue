<script setup>
const props = defineProps({
  topics: { type: Array, default: () => [] },
  slug: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  formatDateTime: { type: Function, required: true },
  localePath: { type: Function, required: true },
})
const emit = defineEmits(['select']) // fire to let parent close drawer

const formatDateOnly = (iso) => {
  const text = props.formatDateTime(iso)
  const idx = text.indexOf(',')
  return idx === -1 ? text : text.slice(0, idx)
}
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
          <span class="subtitle-row">
            <span>{{ formatDateOnly(t.lastActivityAt) }}</span>
            <span class="counts-right">
              <span class="message-count-wrap">
                <v-icon size="16" class="message-count-icon">
                  mdi-message-text-outline
                </v-icon>
                <span class="message-count">{{ t.messageCount || 0 }}</span>
              </span>
              <span class="message-count-wrap ml-3">
                <v-icon size="16" class="upvote-count-icon">
                  mdi-arrow-up-bold-outline
                </v-icon>
                <span class="upvote-count">{{ t.upvoteCount || 0 }}</span>
              </span>
            </span>
          </span>
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-list>
</template>

<style scoped>
.message-count-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.subtitle-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.counts-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  padding-right: 6px;
}
.message-count {
  position: absolute;
  top: -2px;
  right: -8px;
  font-size: 12px;
  font-weight: 600;
  color: #230168;
}
.message-count-icon {
  color: #230168;
}
.upvote-count {
  position: absolute;
  top: -2px;
  right: -7px;
  font-size: 12px;
  font-weight: 600;
  color: #1b5e20;
}
.upvote-count-icon {
  color: #1b5e20;
}
</style>
