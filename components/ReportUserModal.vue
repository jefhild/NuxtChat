<template>
  <Teleport to="body">
    <div
      v-if="dialog"
      class="report-modal"
      role="dialog"
      aria-modal="true"
      @click.self="dialog = false"
    >
      <div class="report-modal__card">
        <div class="report-modal__header">
          <h2 class="report-modal__title">
            {{ $t("components.report-user-modal.title") }}
          </h2>
        </div>

        <div class="report-modal__body">
          <section class="report-section">
            <p class="report-label">
              {{ $t("components.report-user-modal.select-issues") }}
            </p>
            <div class="report-category-grid">
              <label
                v-for="category in categories"
                :key="category.value"
                class="report-category"
              >
                <input
                  :checked="selectedCategories.includes(category.value)"
                  type="checkbox"
                  class="report-category__checkbox"
                  @change="toggleCategory(category.value)"
                />
                <span>{{ category.label }}</span>
              </label>
            </div>
          </section>

          <section class="report-section">
            <label class="report-label" for="report-reason">
              {{ $t("components.report-user-modal.describe-problem") }}
            </label>
            <textarea
              id="report-reason"
              v-model="reportReason"
              rows="4"
              class="report-textarea"
            />
          </section>

          <section class="report-section">
            <div class="report-section__row">
              <label class="report-label">
                {{ $t("components.report-user-modal.select-message") }}
              </label>
              <div class="report-count">
                {{ $t("components.report-user-modal.selected-messages") }}
                {{ selectedMessages.length }} /
                {{ $t("components.report-user-modal.10") }}
              </div>
            </div>

            <div class="message-scroll-list" @scroll.passive="handleScroll">
              <LoadingContainer v-if="isLoadingMore" />
              <button
                v-for="message in messages"
                :key="message.id"
                type="button"
                class="report-message"
                :class="{
                  'report-message--selected': selectedMessages.some(
                    (selectedMessage) => selectedMessage.id === message.id
                  ),
                }"
                @click="selectMessage(message)"
              >
                <span class="report-message__content">{{ message.content }}</span>
                <div v-if="message.file_url" class="image-wrapper">
                  <NuxtImg
                    :src="message.file_url"
                    :alt="message.file_name"
                    class="preview-image"
                  />
                </div>
                <span class="report-message__meta">
                  {{ formatDate(message.created_at) }}
                </span>
              </button>
            </div>
          </section>
        </div>

        <div class="report-modal__actions">
          <button type="button" class="report-action report-action--ghost" @click="dialog = false">
            {{ $t("components.report-user-modal.cancel") }}
          </button>
          <button
            type="button"
            class="report-action report-action--danger"
            :disabled="!canSubmit"
            @click="submitReport"
          >
            {{ $t("components.report-user-modal.submit") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <div v-if="showAlert" class="report-toast" role="status" aria-live="polite">
    {{ snackbarMessage }}
  </div>
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

const toggleCategory = (value) => {
  if (selectedCategories.value.includes(value)) {
    selectedCategories.value = selectedCategories.value.filter(
      (category) => category !== value
    );
    return;
  }

  selectedCategories.value = [...selectedCategories.value, value];
};

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

	const loadMessages = async (el = null) => {
  if (
    isLoadingMore.value ||
    !props.reportedUserId ||
    !hasMore.value ||
    !authStore.userProfile?.user_id
  ) {
    return;
  }

  isLoadingMore.value = true;
  const prevScrollHeight = el?.scrollHeight ?? 0;

  try {
    const data = await getMessagesOfAUserWithUser(
      props.reportedUserId,
      authStore.userProfile.user_id,
      lastMessageTime.value
    );

    if (data && data.length) {
      messages.value = [...data, ...messages.value];
      lastMessageTime.value = data[data.length - 1].created_at;
      if (data.length < 20) hasMore.value = false;
    } else {
      hasMore.value = false;
    }

    await nextTick();

    if (el) {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = newScrollHeight - prevScrollHeight;
    }
  } catch (err) {
    console.error("Failed to load messages:", err);
  } finally {
    isLoadingMore.value = false;
  }
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
  [() => props.reportedUserId, () => authStore.userProfile?.user_id],
  async ([id, userId]) => {
    if (id && userId) {
      selectedMessages.value = [];
      messages.value = [];
      lastMessageTime.value = null;
      hasMore.value = true;
      await loadMessages();
    }
  },
  { immediate: true }
);

watch(dialog, async (visible) => {
  if (
    visible &&
    props.reportedUserId &&
    authStore.userProfile?.user_id
  ) {
    selectedMessages.value = [];
    messages.value = [];
    lastMessageTime.value = null;
    hasMore.value = true;
    await loadMessages();
    await nextTick(() => {
      const el = document.querySelector(".message-scroll-list");
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
});


const canSubmit = computed(() =>
	selectedCategories.value.length > 0 && reportReason.value.trim().length > 0
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
	selectedCategories.value = [];
	reportReason.value = "";
	dialog.value = false;
};
</script>

<style scoped>
.report-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.72);
}

.report-modal__card {
  width: min(100%, 500px);
  border-radius: 18px;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.98);
  color: rgb(var(--color-foreground) / 0.92);
  box-shadow: 0 28px 60px rgb(var(--color-shadow) / 0.28);
}

.report-modal__header {
  padding: 1.2rem 1.25rem 0;
}

.report-modal__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.report-modal__body {
  padding: 1rem 1.25rem;
}

.report-section + .report-section {
  margin-top: 1rem;
}

.report-label {
  display: block;
  margin-bottom: 0.55rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--color-foreground) / 0.84);
}

.report-category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.65rem;
}

.report-category {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border) / 0.78);
  background: rgb(var(--color-surface) / 0.9);
  padding: 0.65rem 0.75rem;
  font-size: 0.9rem;
}

.report-category__checkbox {
  accent-color: rgb(var(--color-primary));
}

.report-textarea {
  width: 100%;
  min-height: 7rem;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border) / 0.8);
  background: rgb(var(--color-surface) / 0.9);
  color: rgb(var(--color-foreground) / 0.92);
  padding: 0.8rem 0.9rem;
  line-height: 1.45;
}

.report-section__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.report-count {
  font-size: 0.78rem;
  color: rgb(var(--color-foreground) / 0.62);
  text-align: right;
}

.message-scroll-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
	border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface) / 0.8);
  padding: 0.7rem;
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

.report-message {
  width: 100%;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface) / 0.92);
  color: inherit;
  padding: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease,
    transform 160ms ease;
}

.report-message:hover,
.report-message:focus-visible {
  border-color: rgb(var(--color-primary) / 0.5);
  background: rgb(var(--color-primary) / 0.08);
  transform: translateY(-1px);
  outline: none;
}

.report-message--selected {
  border-color: rgb(var(--color-primary) / 0.75);
  background: rgb(var(--color-primary) / 0.14);
}

.report-message__content {
  display: block;
  font-size: 0.92rem;
  color: rgb(var(--color-foreground) / 0.92);
}

.report-message__meta {
  display: block;
  margin-top: 0.45rem;
  font-size: 0.78rem;
  color: rgb(var(--color-foreground) / 0.62);
}

.report-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0 1.25rem 1.25rem;
}

.report-action {
  border: 0;
  border-radius: 999px;
  padding: 0.6rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 160ms ease, background-color 160ms ease;
}

.report-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.report-action--ghost {
  background: transparent;
  color: rgb(var(--color-foreground) / 0.74);
}

.report-action--danger {
  background: #dc2626;
  color: #fff;
}

.report-toast {
  position: fixed;
  top: 1rem;
  left: 50%;
  z-index: 1250;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  padding: 0.7rem 1rem;
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.25);
}
</style>
