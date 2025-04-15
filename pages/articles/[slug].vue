<template>
  <v-container class="py-8" v-if="article">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-2">{{ article.title }}</h1>
        <div class="text-body-2 text-grey-darken-1 mb-4">
          {{ formatDate(article.created_at) }} • <NuxtLink :to="`/categories/${article.category.slug}`" :href="`/categories/${article.category.slug}`"> {{ article.category.name }} </NuxtLink> 
        </div>

        <div class="d-flex flex-wrap mb-4">
          <v-chip
            v-for="tag in article.tags"
            :key="tag.id"
            class="ma-1"
            color="primary"
            size="small"
            variant="outlined"
            :to="`/tags/${tag.slug}`"
            :href="`/tags/${tag.slug}`"
          >
            #{{ tag.name }}
          </v-chip>
        </div>

        <!-- Render Markdown content -->
        <div class="prose" v-html="renderedMarkdown"></div>
      </v-col>
    </v-row>
  </v-container>

  <v-container v-else class="py-12 text-center">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-container>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { ref, onMounted } from "vue";
import { marked } from "marked"; // or use @nuxt/content if preferred

const route = useRoute();
const slug = route.params.slug as string;

const article = ref<any>(null);
const renderedMarkdown = ref("");

const { getArticleBySlug } = useDb(); // You'd need to define this helper

onMounted(async () => {
  const data = await getArticleBySlug(slug);
  if (data) {
    article.value = data;
    renderedMarkdown.value = await marked(data.content || ""); // Convert Markdown to HTML
  }
});

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
</script>

<style scoped>
.prose {
  max-width: 750px;
  margin: auto;
  line-height: 1.7;
  font-size: 1rem;
}
</style>
