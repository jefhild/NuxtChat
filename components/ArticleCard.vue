<template>
	<v-col>
		<v-card :to="`/articles/${article.slug}`" class="article-card pa-4 d-flex flex-column justify-between"
			elevation="3">
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

			<v-card-text>
				<v-chip v-for="tag in article.tags" :key="tag.slug || tag" class="ma-1" size="small" color="primary"
					variant="outlined">
					{{ tag.name || tag }}
				</v-chip>
			</v-card-text>
		</v-card>
	</v-col>
</template>

<script setup>
const props = defineProps({
	article: {
		type: Object,
		required: true,
	},
});

const formatDate = (isoDate) =>
{
	const date = new Date(isoDate);
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};
</script>

<style scoped>
.article-card {
  min-height: 270px;
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
</style>