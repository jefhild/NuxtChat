<template>
	<v-card class="pa-6" elevation="3">
		<v-card-title>Existing Tags</v-card-title>
		<v-card-text v-if="loadingTags" class="text-center">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</v-card-text>
		<v-card-text v-else>
			<v-chip v-for="tag in tags" :key="tag.slug" class="ma-1" color="deep-purple-lighten-2" variant="outlined"
				@click="toggleEditDialog(tag)">
				{{ tag.name }}
			</v-chip>
		</v-card-text>
	</v-card>
	<v-card class="pa-6 mt-5" elevation="3">
		<v-card-title>Create New Tag</v-card-title>
		<v-card-text>
			<v-form @submit.prevent="handleSubmit" ref="tagForm">
				<v-text-field v-model="form.name" label="Name" required :rules="[v => !!v || 'Name is required']" />
				<v-btn :loading="loading" :disabled="loading" type="submit" color="primary" class="mt-4">
					Create Tag
				</v-btn>
			</v-form>
		</v-card-text>
	</v-card>
	<v-snackbar v-model="snackbar.show" :timeout="3000" color="red" location="top">
		{{ snackbar.message }}
	</v-snackbar>

	<v-dialog v-model="editDialog" max-width="500px">
		<v-card>
			<v-card-title>Edit Tag</v-card-title>
			<v-card-text v-if="loadingUpdate" class="text-center">
				<v-progress-circular indeterminate color="primary"></v-progress-circular>
			</v-card-text>
			<v-card-text v-else>
				<v-form ref="editForm" @submit.prevent="handleUpdate">
					<v-text-field v-model="selectedTag.name" label="Tag Name"
						:rules="[v => !!v || 'Name is required']" />
				</v-form>
			</v-card-text>
			<v-card-actions>
				<v-btn :disabled="loadingUpdate" color="primary" :to="`/tags/${selectedTag.slug}`"
					align-content-start>
					Go to Tag Page
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn type="submit" :disabled="loadingUpdate" color="primary" @click="handleUpdate">Save</v-btn>
				<v-btn color="red" :disabled="loadingUpdate" @click="toggleEditDialog(null)">Cancel</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
const { getAllTags, insertTag, updateTag } = useDb();

const editDialog = ref(false);
const selectedTag = ref({ name: '', slug: '' });
const editForm = ref(null);


const tags = ref([]);
const loadingTags = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);

const tagForm = ref(null); // ref to <v-form>
const form = useState('tagForm', () => ({
	name: '',
	slug: ''
}));

const snackbar = ref({
	show: false,
	message: ''
});

onMounted(async () =>
{
	tags.value = await getAllTags() || [];
	loadingTags.value = false;
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
	const { valid } = await tagForm.value.validate();
	if (!valid)
	{
		snackbar.value.message = "Please fill in the name.";
		snackbar.value.show = true;
		loading.value = false;
		return;
	}

	try
	{
		const formattedName = formatName(form.value.name);
		const generatedSlug = slugify(form.value.name);

		// Check for duplicate name or slug
		const duplicate = tags.value.find(tag =>
			tag.name === formattedName || tag.slug === generatedSlug
		);

		if (duplicate)
		{
			snackbar.value.message = "This tag already exists.";
			snackbar.value.show = true;
			loading.value = false;
			return;
		}

		const payload = {
			name: formattedName,
			slug: generatedSlug,
		};

		const res = await insertTag(payload);

		if (res?.error) throw res.error;

		// Reset + update
		form.value.name = '';
		await nextTick();
		tagForm.value.resetValidation();
		tags.value = await getAllTags() || [];
	} catch (err)
	{
		console.error("Error creating tag:", err.message || err);
		snackbar.value.message = "Failed to create tag.";
		snackbar.value.show = true;
	} finally
	{
		loading.value = false;
	}
};

const toggleEditDialog = (tag) =>
{
	selectedTag.value = { ...tag };
	editDialog.value = !editDialog.value;
};

const handleUpdate = async () =>
{
	loadingUpdate.value = true;
	const { valid } = await editForm.value.validate();
	if (!valid) return;

	const tag = {
		name: formatName(selectedTag.value.name),
		slug: slugify(selectedTag.value.name)
	};

	await updateTag(selectedTag.value.slug, tag);

	tags.value = await getAllTags() || [];
	toggleEditDialog(null);
	loadingUpdate.value = false;
};
</script>