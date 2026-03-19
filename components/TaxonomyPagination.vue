<template>
  <nav
    v-if="totalPages > 1"
    class="taxonomy-pagination"
    aria-label="Pagination"
  >
    <NuxtLink
      v-if="currentPage > 1"
      class="taxonomy-pagination__control"
      :to="pagePath(currentPage - 1)"
      rel="prev"
    >
      Previous
    </NuxtLink>

    <div class="taxonomy-pagination__pages">
      <NuxtLink
        v-for="page in visiblePages"
        :key="page"
        :to="pagePath(page)"
        class="taxonomy-pagination__page"
        :class="{ 'taxonomy-pagination__page--active': page === currentPage }"
        :aria-current="page === currentPage ? 'page' : undefined"
      >
        {{ page }}
      </NuxtLink>
    </div>

    <NuxtLink
      v-if="currentPage < totalPages"
      class="taxonomy-pagination__control"
      :to="pagePath(currentPage + 1)"
      rel="next"
    >
      Next
    </NuxtLink>
  </nav>
</template>

<script setup>
const props = defineProps({
  basePath: { type: String, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  maxVisible: { type: Number, default: 7 },
});

const localPath = useLocalePath();

const visiblePages = computed(() => {
  const total = Math.max(1, Number(props.totalPages || 1));
  const current = Math.min(total, Math.max(1, Number(props.currentPage || 1)));
  const maxVisible = Math.max(3, Number(props.maxVisible || 7));
  const halfWindow = Math.floor(maxVisible / 2);

  let start = Math.max(1, current - halfWindow);
  const end = Math.min(total, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});

const pagePath = (page) => {
  const normalizedPage = Math.max(1, Number(page || 1));
  const basePath = localPath(props.basePath);
  return normalizedPage > 1 ? `${basePath}?page=${normalizedPage}` : basePath;
};
</script>

<style scoped>
.taxonomy-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin: 2rem 0 1rem;
}

.taxonomy-pagination__pages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.taxonomy-pagination__control,
.taxonomy-pagination__page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  color: inherit;
  text-decoration: none;
  background: #fff;
}

.taxonomy-pagination__page--active {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: #fff;
}
</style>
