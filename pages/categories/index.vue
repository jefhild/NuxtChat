<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1>{{ $t("pages.categories.index.title") }}</h1>
      </v-col>
    </v-row>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.categories.index.loading')"
    />

    <v-container fluid v-else>

      <v-row justify="center" class="category-container">
        <v-col
          v-for="category in categories"
          :key="category.slug"
          cols="auto"
          class="my-2"
        >
          <NuxtLink
            :to="localPath(`/categories/${category.slug}`)"
            class="category-link"
            v-if="category.articleCount > 0"
          >
            {{ category.name }}
            <v-chip class="ma-1" size="small" color="black">
              {{ category.articleCount }}
            </v-chip>
          </NuxtLink>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
import { useI18n } from "vue-i18n";
const { getAllCategories, getCountArticleByCategory } = useDb();
const isLoading = ref(true);
const authStore = useAuthStore();

const categories = ref([]);

useSeoI18nMeta("categories.index");



onMounted(async () => {
  authStore.checkAuth();
  const rawCategories = await getAllCategories();

  const categoriesWithCounts = await Promise.all(
    rawCategories.map(async (cat) => {
      // console.log(cat);
      const count = await getCountArticleByCategory(cat.id);
      return { ...cat, articleCount: count };
    })
  );

  categories.value = categoriesWithCounts;
  isLoading.value = false;
});
</script>

<style scoped>


.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 2.5rem;
  color: #1f1f1f;
}

.category-container {
  flex-wrap: wrap;
  max-width: 900px;
  margin: 0 auto;
}

.category-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background-color: #1565c0;
  /* Light blue background */
  color: #e3f2fd;
  /* Blue border */
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
}

.category-link:hover {
  background-color: #bbdefb;
  /* Darker on hover */
  color: #0d47a1;
}
</style>
