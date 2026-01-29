<script setup>
const props = defineProps({
  topics: { type: Array, default: () => [] },
  slug: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  formatDateTime: { type: Function, required: true },
  localePath: { type: Function, required: true },
  variant: { type: String, default: 'list' }, // 'list' | 'cards'
})
const emit = defineEmits(['select']) // fire to let parent close drawer

const formatDateOnly = (iso) => {
  const text = props.formatDateTime(iso)
  const idx = text.indexOf(',')
  return idx === -1 ? text : text.slice(0, idx)
}

const { public: pub } = useRuntimeConfig()

const cardImageFor = (t) => {
  const base = (pub?.SUPABASE_BUCKET || '').replace(/\/$/, '')
  const raw = t?.article?.imagePath || ''
  const file = String(raw).replace(/^\//, '')
  if (base && file) return `${base}/articles/${file}`
  if (t?.botAvatarUrl) return t.botAvatarUrl
  return '/images/article-image.webp'
}
</script>

<template>
  <div v-if="variant === 'cards'" class="topics-card-list">
    <v-skeleton-loader v-if="loading" type="card@6" class="pa-2" />
    <template v-else>
      <NuxtLink
        v-for="t in topics"
        :key="t.id"
        :to="localePath(`/chat/articles/${t.slug}`)"
        class="topic-card-link"
        @click="emit('select', t)"
      >
        <v-card
          :class="['topic-card', t.slug === slug ? 'topic-card--active' : '']"
          elevation="2"
          :style="{ backgroundImage: `url(${cardImageFor(t)})` }"
        >
          <div class="topic-card__overlay">
            <div class="topic-card__title text-truncate">
              {{ t.title }}
            </div>
            <div class="topic-card__meta">
              <span class="topic-card__date">
                {{ formatDateOnly(t.lastActivityAt) }}
              </span>
              <span class="topic-card__counts">
                <span class="pill">
                  <v-icon size="16" class="pill-icon">
                    mdi-message-text-outline
                  </v-icon>
                  <span class="pill-count">{{ t.messageCount || 0 }}</span>
                </span>
                <span class="pill">
                  <v-icon size="16" class="pill-icon">
                    mdi-arrow-up-bold-outline
                  </v-icon>
                  <span class="pill-count">{{ t.upvoteCount || 0 }}</span>
                </span>
              </span>
            </div>
          </div>
        </v-card>
      </NuxtLink>
    </template>
  </div>

  <v-list v-else lines="two" density="comfortable">
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
.topics-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
}
.topic-card-link {
  text-decoration: none;
  color: inherit;
}
.topic-card {
  width: 100%;
  height: 92px;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.topic-card:hover {
  transform: translateY(-1px);
}
.topic-card--active {
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.6);
}
.topic-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7),
    rgba(0, 0, 0, 0.1)
  );
}
.topic-card__title {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.2;
  margin-bottom: 4px;
}
.topic-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e5e7eb;
  font-size: 12px;
}
.topic-card__counts {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
}
.pill + .pill {
  margin-left: 8px;
}
.pill-icon {
  color: inherit;
}
.pill-count {
  line-height: 1;
}
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
