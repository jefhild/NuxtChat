<template>
	<v-dialog v-model="dialog" max-width="500">
		<v-card>
			<v-card-title class="headline">{{ $t('components.report-user-modal.title') }}</v-card-title>
			<v-card-text>
				<v-select v-model="selectedCategories" :items="categories" item-title="label" item-value="value"
					:label="$t('components.report-user-modal.select-issues')" multiple chips closable-chips variant="outlined"
					density="comfortable" required />
				<v-textarea v-model="reportReason" :label="$t('components.report-user-modal.describe-problem')" auto-grow rows="3" variant="outlined"
					density="comfortable" required />

				<div class="mt-4">
					<label class="text-subtitle-2 mb-2 d-block">{{ $t('components.report-user-modal.select-message') }}</label>
					<div class="text-caption text-right mb-1 text-grey-darken-1">
						{{ $t('components.report-user-modal.selected-messages') }} {{ selectedMessages.length }} / {{ $t('components.report-user-modal.10') }}
					</div>
					<v-sheet class="message-scroll-list" elevation="1" max-height="200" rounded style="overflow-y: auto"
						@scroll.passive="handleScroll">
						<div v-if="isLoadingMore" class="text-center py-2">
							<v-progress-circular indeterminate color="primary" size="20" />
						</div>
						<v-list density="compact">
							<v-list-item v-for="message in messages" :key="message.id" :value="message"
								@click="selectMessage(message)"
								:class="{ 'bg-grey-lighten-1': selectedMessages.some(m => m.id === message.id) }">
								<v-list-item-title>{{ message.content }}</v-list-item-title>
								<div class="image-wrapper" v-if="message.file_url">
									<NuxtImg :src="message.file_url" :alt="message.file_name" class="preview-image"
										cover />
								</div>
								<v-list-item-subtitle class="text-caption">
									{{ formatDate(message.created_at)}}
								</v-list-item-subtitle>

							</v-list-item>
						</v-list>
					</v-sheet>
				</div>

			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="dialog = false">{{ $t('components.report-user-modal.cancel') }}</v-btn>
				<v-btn color="red" variant="flat" :disabled="!canSubmit" @click="submitReport">
					{{ $t('components.report-user-modal.submit') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<v-snackbar v-model="showAlert" :timeout="3000" color="red" location="top">
		{{ snackbarMessage }}
	</v-snackbar>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
	modelValue: Boolean,
	reportedUserId: String
});
const { getMessagesOfAUserWithUser } = useDb();
const emit = defineEmits(["update:modelValue", "submit-report"]);

const dialog = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value)
});
const authStore = useAuthStore();
const selectedCategories = ref([]);
const reportReason = ref("")
const selectedMessages = ref([]);

const messages = ref([]);
const hasMore = ref(true);
const isLoadingMore = ref(false);
let lastMessageTime = ref(null);

const showAlert = ref(false);
const snackbarMessage = ref(t('components.report-user-modal.10-max'));


const categories = [
	{ label: t('components.report-user-modal.photo'), value: "photo" },
	{ label: t('components.report-user-modal.username'), value: "name" },
	{ label: t('components.report-user-modal.descriptors'), value: "descriptors" },
	{ label: t('components.report-user-modal.actions'), value: "actions" },
];

const selectMessage = (message) =>
{
	const index = selectedMessages.value.findIndex((m) => m.id === message.id);
	// console.log("selectMessages", selectedMessages.value, message, index);
	if (index === -1)
	{
		if (selectedMessages.value.length >= 10){
			showAlert.value = true;
			return;
		} 
		selectedMessages.value.push(message);
	} else
	{
		selectedMessages.value.splice(index, 1);
	}

	// console.log("selectedMessages", selectedMessages.value);
};

const formatDate = (ts) =>
	new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

const loadMessages = async (el = null) =>
{
	if (isLoadingMore.value || !props.reportedUserId || !hasMore.value) return;

	isLoadingMore.value = true;
	const prevScrollHeight = el?.scrollHeight ?? 0;

	const data = await getMessagesOfAUserWithUser(
		props.reportedUserId,
		authStore.userProfile.user_id,
		lastMessageTime.value
	);

	if (data && data.length)
	{
		messages.value = [...data, ...messages.value];
		lastMessageTime.value = data[data.length - 1].created_at;
		if (data.length < 20) hasMore.value = false;
	} else
	{
		hasMore.value = false;
	}

	await nextTick();

	if (el)
	{
		const newScrollHeight = el.scrollHeight;
		el.scrollTop = newScrollHeight - prevScrollHeight;
	}

	isLoadingMore.value = false;
};

const handleScroll = (event) =>
{
	const target = event.target;
	if (target.scrollTop < 50 && !isLoadingMore.value && hasMore.value)
	{
		loadMessages(target);
	}
};

watch(
	() => props.reportedUserId,
	async (id) =>
	{
		if (id)
		{
			selectedMessages.value = [];
			messages.value = [];
			lastMessageTime.value = null;
			hasMore.value = true;
			await loadMessages();
		}
	},
	{ immediate: true }
);

watch(dialog, async (visible) =>
{
	if (visible)
	{
		selectedMessages.value = [];
		messages.value = [];
		lastMessageTime.value = null;
		hasMore.value = true;
		await loadMessages();
		await nextTick(() =>
		{
			const el = document.querySelector(".message-scroll-list");
			if (el) el.scrollTop = el.scrollHeight;
		});
	}
});


const canSubmit = computed(() =>
	selectedCategories.value != null && reportReason.value.trim().length > 0
);

const submitReport = () =>
{
	emit("submit-report", {
		reportedUserId: props.reportedUserId,
		categories: selectedCategories.value,
		reason: reportReason.value.trim(),
		messages: selectedMessages.value,
	});

	selectedMessages.value = [];
	selectedCategories.value = null;
	reportReason.value = "";
	dialog.value = false;
};
</script>

<style scoped>
.message-scroll-list {
	border: 1px solid #ccc;
	max-height: 200px;
	overflow-y: auto;
}

.image-wrapper {
	position: relative;
	display: inline-block;
	max-width: 220px;
	max-height: 220px;
	margin-bottom: 8px;
	border-radius: 20px;
	overflow: hidden;
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.preview-image {
	width: 100%;
	height: auto;
	display: block;
	border-radius: 20px;
}
</style>
