<template>
	<v-dialog v-model="dialog" max-width="500">
		<v-card>
			<v-card-title class="headline">Report User</v-card-title>
			<v-card-text>
				<v-select v-model="selectedCategories" :items="categories" item-title="label" item-value="value"
					label="Select all relevant issues" multiple chips closable-chips variant="outlined"
					density="comfortable" required />
				<v-textarea v-model="reportReason" label="Describe the problem" auto-grow rows="3" variant="outlined"
					density="comfortable" required />
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="dialog = false">Cancel</v-btn>
				<v-btn color="red" variant="flat" :disabled="!canSubmit" @click="submitReport">
					Submit
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
const props = defineProps({
	modelValue: Boolean,
	reportedUserId: String
});

const emit = defineEmits(["update:modelValue", "submit-report"]);

const dialog = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value)
});

const selectedCategories = ref([]);
const reportReason = ref("");

const categories = [
	{ label: "Their photo", value: "photo" },
	{ label: "Their name", value: "name" },
	{ label: "Their text descriptors", value: "descriptors" },
	{ label: "Their actions", value: "actions" },
];

const canSubmit = computed(() =>
	selectedCategories.value != null && reportReason.value.trim().length > 0
);

const submitReport = () =>
{
	emit("submit-report", {
		reportedUserId: props.reportedUserId,
		categories: selectedCategories.value,
		reason: reportReason.value.trim()
	});

	// Reset & close
	selectedCategories.value = null;
	reportReason.value = "";
	dialog.value = false;
};
</script>
