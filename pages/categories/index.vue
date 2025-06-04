<template>
	<v-container>
		<v-row justify="center">
			<v-col cols="12" md="8">
				<h1>{{ $t("pages.categories.index.title") }}</h1>
			</v-col>
		</v-row>

		<v-container v-if="isLoading">
			<v-row justify="center" class="py-12 text-center">
				<v-progress-circular indeterminate color="primary"></v-progress-circular>
			</v-row>
		</v-container>

		<v-container v-else>
			<v-row justify="center" class="category-container">
				<v-col v-for="category in categories" :key="category.slug" cols="auto" class="my-2">
					<NuxtLink :to="localPath(`/categories/${category.slug}`)" class="category-link" v-if="category.articleCount > 0">
						{{ category.name }}
						<v-chip class="ma-1" size="small" color="black"> {{ category.articleCount }}
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

const { t } = useI18n();
const categories = ref([]);

const seoTitle = computed(() => t("pages.categories.index.meta.title"));
const seoDescription = computed(() => t("pages.categories.index.meta.description"));
const ogTitle = computed(() => t("pages.categories.index.meta.ogTitle"));
const ogType = computed(() => t("pages.categories.index.meta.ogType"));
const ogUrl = computed(() => t("pages.categories.index.meta.ogUrl"));
const ogDescription = computed(() =>
	t("pages.categories.index.meta.ogDescription")
);
const twitterTitle = computed(() => t("pages.categories.index.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.categories.index.meta.twitterCard"));
const twitterDescription = computed(() =>
	t("pages.categories.index.meta.twitterDescription")
);


useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/categories",
    },
  ],
}));

useSeoMeta({
	title: seoTitle.value,
	description: seoDescription.value,
	ogTitle: ogTitle.value,
	ogType: ogType.value,
	ogUrl: ogUrl.value,
	ogDescription: ogDescription.value,
	twitterCard: twitterCard.value,
	twitterTitle: twitterTitle.value,
	twitterDescription: twitterDescription.value,
});


onMounted(async () =>
{
	authStore.checkAuth();
	const rawCategories = await getAllCategories();

	const categoriesWithCounts = await Promise.all(
		rawCategories.map(async (cat) =>
		{
			console.log(cat);
			const count = await getCountArticleByCategory(cat.id);
			return { ...cat, articleCount: count };
		})
	);

	categories.value = categoriesWithCounts;
	isLoading.value = false;
});

</script>

<style scoped>
.title-bar {
	border-radius: 20px;
	margin: 10px 10px;
	padding: 20px;
	background-image: url('/images/bkg/tiedie2.webp');
	background-position: center;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	color: black;
	margin-bottom: 1.5rem;
}

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
