<template>
  <v-row align="center" justify="space-between" class="m-3">
    <!-- Categories Dropdown -->
    <v-col cols="12" md="4" class="d-flex">
      <v-select
        :id="'category-select'"
        :items="categories"
        item-title="name"
        item-value="slug"
        label="Select Category"
        outlined
        density="compact"
        hide-details
        @update:modelValue="onCategory"
        class="flex-grow-1"
      />
    </v-col>

    <!-- Tags Dropdown -->
    <v-col cols="12" md="4" class="d-flex">
      <v-select
        :id="'tag-select'"
        :items="tags"
        item-title="name"
        item-value="slug"
        label="Select Tag"
        outlined
        density="compact"
        hide-details
        @update:modelValue="onTag"
        class="flex-grow-1"
      />
    </v-col>

    <!-- Search Bar -->
    <v-col cols="12" md="4" class="d-flex">
      <v-text-field
        v-model="searchQuery"
        :label="searchLabel"
        prepend-inner-icon="mdi-magnify"
        clearable
        density="compact"
        outlined
        hide-details
        class="search-bar"
      />
    </v-col>
  </v-row>
</template>

<script setup>
const selectedCategory = ref(null);
defineProps({
  categories: Array,
  tags: Array,
  searchQuery: String,
  searchLabel: String,
});
const emit = defineEmits([
  "update:searchQuery",
  "categorySelected",
  "tagSelected",
]);

const searchQuery = defineModel("searchQuery");

const router = useRouter();

const onCategory = (slug) => {
  if (slug === null) {
    router.push(localPath("/categories"));
  } else {
    emit("categorySelected", slug);
  }
};
const onTag = (slug) => {
  emit("tagSelected", slug);
};
</script>

<style scoped>
.search-bar {
  max-width: 400px;
  width: 100%;
}
</style>
