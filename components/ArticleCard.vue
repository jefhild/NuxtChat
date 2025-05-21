<template>
  <v-col>
    <v-card :to="disableNavigation ? undefined : `/articles/${article.slug}`"
      class="article-card pa-4 d-flex flex-column justify-between" elevation="3" @click.stop="handleClick"
      :style="{ minHeight: props.admin ? '360px' : '280px' }">
      <v-card-title class="font-weight-bold text-wrap">
        {{ article.title }}
      </v-card-title>

      <v-card-subtitle class="mb-2 text-medium-emphasis">
        <div class="d-flex align-center">
          <v-icon>mdi-account</v-icon>
          <span class="ml-1">ImChatty</span>

          <v-icon class="ml-5">mdi-calendar-blank</v-icon>
          <span class="ml-1">{{ formatDate(article.created_at) }}</span>
        </div>

        <div class="d-flex align-center mt-2">
          <v-icon>mdi-folder</v-icon>
          <span class="ml-1">{{ article.category_name }}</span>
        </div>
      </v-card-subtitle>

      <v-card-text v-html="truncatedSummary"></v-card-text>
      <v-card-text>
        <div class="tags-links">
          <NuxtLink
            v-for="tag in article.tags"
            :key="tag?.slug || tag"
            :to="`/tags/${formatTagSlug(tag)}`"
            class="tag-link"
          >
            #{{ tag?.name || tag }}
          </NuxtLink>
        </div>
      </v-card-text>

      <v-card-actions v-if="props.admin">
        <v-chip v-if="article.is_published" color="success" size="x-small" class="ml-2" label>
          Published
        </v-chip>
        <v-chip v-else color="grey" size="x-small" class="ml-2" label>
          Draft
        </v-chip>
      </v-card-actions>
    </v-card>
  </v-col>
</template>

<script setup>
const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
  disableNavigation: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
});

const emit = defineEmits(["click"]);
const handleClick = () => {
  if (props.disableNavigation) emit("click", props.article);
};

const truncatedSummary = computed(() => {
  const maxLength = 300;
  if (props.article.content.length > maxLength) {
    return props.article.content.slice(0, maxLength) + "...";
  }
  return props.article.content;
});

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
const formatTagSlug = (tag) => {
  const value = tag?.slug || tag;
  return typeof value === "string" ? value.toLowerCase() : "";
};
</script>

<style scoped>
.article-card {
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  border-radius: 20px;
  margin: 0px 10px;
  background-color: white;
}

.article-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: scale(1.015);
  border-color: #9c27b0; /* Vuetify primary/deep-purple shade for accent */
  background-color: #f9f9ff;
  cursor: pointer;
}
.tags-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-link {
  font-size: 0.8rem;
  color: #5e35b1; /* deep purple-ish */
  text-decoration: none;
  background-color: #f3e5f5;
  padding: 4px 8px;
  border-radius: 12px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.tag-link:hover {
  background-color: #d1c4e9;
  color: #311b92;
}
</style>
