<template>
	<v-card class="pa-6" elevation="3">
		<v-card-title>Existing Articles</v-card-title>

		<v-card-text v-if="loadingArticles" class="text-center">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</v-card-text>
		<v-card-text v-else>
			<v-row dense>
				<v-col v-for="article in paginatedArticles" :key="article.id" cols="12" sm="6" md="6" lg="4">
					<ArticleCard :article="article" disableNavigation admin @click="toggleEditDialog(article)" />
				</v-col>
			</v-row>

			<!-- Pagination -->
			<v-pagination v-model="currentPage" :length="pageCount" class="mt-6" color="primary"></v-pagination>
		</v-card-text>
	</v-card>
	<v-card class="pa-6" elevation="3">
		<v-card-title>Create New Article</v-card-title>
		<v-card-text>
			<v-form @submit.prevent="handleSubmit" ref="articleForm">
				<v-text-field v-model="form.title" label="Title" required :rules="[v => !!v || 'Title is required']" />
				<v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id"
					label="Category" :rules="[v => !!v || 'Category is required']" required />

				<v-select v-model="form.tag_ids" :items="tags" item-title="name" item-value="id" label="Tags" multiple
					chips :rules="[v => v.length > 0 || 'At least one tag is required']" />

				<v-select v-model="form.type" :items="types" item-title="name" item-value="id" label="Type"
					:rules="[v => v.length > 0 || 'Pick a type']" required />

				<!-- HTML Content Editor -->
				<v-textarea v-model="form.content" label="HTML Content" rows="10" auto-grow class="mb-4"
					placeholder="<h2>Hello</h2><p>This is an article</p>"
					:rules="[v => !!v || 'Content is required']" />

				<!-- Live Preview -->
				<div class="html-preview" v-html="form.content"></div>

				<v-switch v-model="form.is_published" label="Published" color="primary" />
				<v-btn :loading="loading" :disabled="loading" type="submit" color="primary" class="mt-4">
					Create Article
				</v-btn>
			</v-form>
		</v-card-text>
	</v-card>
	<v-snackbar v-model="snackbar.show" :timeout="3000" color="red" location="top">
		{{ snackbar.message }}
	</v-snackbar>

	<v-dialog v-model="editDialog" max-width="700px">
		<v-card>
			<v-card-title>Edit Article</v-card-title>

			<v-card-text v-if="loadingUpdate" class="text-center">
				<v-progress-circular indeterminate color="primary" />
			</v-card-text>

			<v-card-text v-else>
				<v-form ref="editForm" @submit.prevent="handleArticleUpdate">
					<v-text-field v-model="selectedArticle.title" label="Title"
						:rules="[v => !!v || 'Title is required']" />
					<v-select v-model="selectedArticle.category_id" :items="categories" item-title="name"
						item-value="id" label="Category" />

					<v-select v-model="selectedArticle.tag_ids" :items="tags" item-title="name" item-value="id"
						label="Tags" multiple chips />

					<v-select v-model="selectedArticle.type" :items="types" label="Type" />

					<v-textarea v-model="selectedArticle.content" label="HTML Content" rows="6" auto-grow
						:rules="[v => !!v || 'Content is required']" />

					<div class="html-preview" v-html="selectedArticle.content"></div>
					<v-switch v-model="selectedArticle.is_published" label="Published" color="primary" />
				</v-form>
			</v-card-text>

			<v-card-actions>
				<v-btn :disabled="loadingUpdate" color="primary" :to="`/articles/${selectedArticle.slug}`">
					Go to Article Page
				</v-btn>
				<v-spacer />
				<v-btn :disabled="loadingUpdate" color="primary" @click="handleArticleUpdate">Save</v-btn>
				<v-btn :disabled="loadingUpdate" color="red" @click="toggleEditDialog(null)">Cancel</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>


<script setup>
import { useDisplay } from 'vuetify';
const { getAllArticlesWithTags, getAllCategories, getAllTags, insertArticle, updateArticle, updateArticleTags } = useDb();

const editDialog = ref(false)
const selectedArticle = ref({})
const editForm = ref(null)
const loadingUpdate = ref(false)

const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const types = ref(['blog', 'guide']);
const router = useRouter();
const loading = ref(false);
const loadingArticles = ref(true);


const currentPage = ref(1);
const { md, smAndDown, xs } = useDisplay();

const perPage = computed(() =>
{
	if (xs.value) return 1;         // Extra small: 1 card per page
	if (smAndDown.value) return 2;  // Small screen: 2 per page
	if (md.value) return 2;    // Medium and up: 3 per page
	return 3;                       // Fallback
});

const articleForm = ref(null); // ref to <v-form>
const form = useState('articleForm', () => ({
	title: '',
	slug: '',
	category_id: '',
	tag_ids: [],
	content: '',
	is_published: true,
	type: ''
}));

const snackbar = ref({
	show: false,
	message: ''
});

onMounted(async () =>
{
	articles.value = await getAllArticlesWithTags(false);
	console.log("articles", articles.value);
	loadingArticles.value = false;
	categories.value = await getAllCategories() || [];
	tags.value = await getAllTags() || [];
});

const paginatedArticles = computed(() =>
{
	const start = (currentPage.value - 1) * perPage.value;
	return articles.value.slice(start, start + perPage.value);
});

const pageCount = computed(() =>
{
	return Math.ceil(articles.value.length / perPage.value);
});

const formatName = (name) =>
	name
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

const slugify = (text) =>
	text
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '');

const handleSubmit = async () =>
{
	loading.value = true;
	const { valid } = await articleForm.value.validate();
	console.log("form validation", valid);
	if (!valid)
	{
		console.error("Form validation failed");
		snackbar.value.message = "Please fill in all required fields.";
		snackbar.value.show = true;
		loading.value = false;
		return;
	}

	try {
		form.value.title = formatName(form.value.title);
		form.value.slug = slugify(form.value.title);

		// Check for duplicate name or slug
		const duplicate = articles.value.find(art =>
			art.title === form.value.title || art.slug === form.value.slug
		);

		if (duplicate)
		{
			snackbar.value.message = "This article name already exists.";
			snackbar.value.show = true;
			loading.value = false;
			return;
		}

		const res = await insertArticle(form.value);
		if (res?.error) throw res.error;

		// Reset + update
		articleForm.value.reset();
		await nextTick();
		articleForm.value.resetValidation();
		articles.value = await getAllArticlesWithTags(false);

	} catch (err)
	{
		console.error("Error creating article:", err.message || err);
		snackbar.value.message = "Failed to create article.";
		snackbar.value.show = true;
	} finally
	{
		loading.value = false;
	}
};

const toggleEditDialog = (article) =>
{
	if (!article)
	{
		editDialog.value = false;
		selectedArticle.value = {};
		return;
	}

	selectedArticle.value = {
		id: article.id,
		title: article.title,
		content: article.content,
		slug: article.slug,
		type: article.type || '',

		// Get the category ID based on the name
		category_id: categories.value.find(cat => cat.name === article.category_name)?.id || '',

		// Map tag names to their corresponding IDs
		tag_ids: article.tags.map(tagName =>
		{
			const match = tags.value.find(t => t.name === tagName);
			return match?.id || null;
		}).filter(Boolean), // remove any nulls
		is_published: article.is_published ?? true,
	};

	editDialog.value = true;
};

const handleArticleUpdate = async () =>
{
	loadingUpdate.value = true
	const { valid } = await editForm.value.validate()
	if (!valid)
	{
		loadingUpdate.value = false
		return
	}

	const payload = {
		title: formatName(selectedArticle.value.title),
		content: selectedArticle.value.content,
		slug: slugify(selectedArticle.value.title),
		category_id: selectedArticle.value.category_id,
		type: selectedArticle.value.type,
		is_published: selectedArticle.value.is_published,
	}

	await updateArticle(selectedArticle.value.id, payload);

	await updateArticleTags(selectedArticle.value.id, selectedArticle.value.tag_ids);

	articles.value = await getAllArticlesWithTags(false);
	toggleEditDialog(null)
	loadingUpdate.value = false

}
</script>

<style scoped>
.v-pagination .v-pagination__item--is-active {
	background-color: #1976d2 !important;
	color: white !important;
	border-radius: 8px;
}

.html-preview {
	border: 1px solid #ccc;
	border-radius: 8px;
	padding: 1rem;
	margin-top: 1rem;
	background-color: #fafafa;
	font-family: "Segoe UI", sans-serif;
	line-height: 1.6;
}
</style>