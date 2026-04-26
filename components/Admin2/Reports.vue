<template>
  <section class="admin-reports-card">
    <div class="admin-reports-card__header">
      <div class="admin-reports-card__heading">
        <i class="mdi mdi-alert-circle-outline admin-reports-card__icon" aria-hidden="true" />
        <div>
          <h2 class="admin-reports-card__title">User Reports</h2>
          <p class="admin-reports-card__subtitle">
            Review profile and behavior reports, inspect attached messages, and clear resolved cases.
          </p>
        </div>
      </div>

      <label class="admin-reports-field">
        <span class="admin-reports-field__label">Filter by category</span>
        <select v-model="selectedCategory" class="admin-reports-field__control">
          <option :value="null">All categories</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
    </div>

    <div class="admin-reports-card__body">
      <LoadingContainer v-if="isLoading" />

      <div
        v-else-if="reports.length === 0"
        class="admin-reports-banner admin-reports-banner--info"
      >
        No reports found.
      </div>

      <div v-else class="admin-reports-table-wrap">
        <table class="admin-reports-table">
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Reported</th>
              <th>Categories</th>
              <th>Reason</th>
              <th>Messages</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in filteredReports" :key="report.id">
              <td>{{ report.reporter_displayname }}</td>
              <td>{{ report.reported_displayname }}</td>
              <td>
                <div class="admin-reports-chip-list">
                  <span
                    v-for="cat in report.categories"
                    :key="cat"
                    class="admin-reports-chip"
                  >
                    {{ cat }}
                  </span>
                </div>
              </td>
              <td class="admin-reports-reason">{{ report.reason }}</td>
              <td>
                <button
                  v-if="report.report_messages.length"
                  type="button"
                  class="admin-reports-button admin-reports-button--primary"
                  @click="openMessageDialog(report.report_messages)"
                >
                  View Messages ({{ report.report_messages?.length || 0 }})
                </button>
              </td>
              <td>{{ formatDate(report.created_at) }}</td>
              <td>
                <button
                  type="button"
                  class="admin-reports-button admin-reports-button--danger"
                  @click="handleDeleteReport(report.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="admin-reports-modal-fade">
      <div
        v-if="messageDialog"
        class="admin-reports-modal-layer"
        role="presentation"
      >
        <button
          type="button"
          class="admin-reports-modal-backdrop"
          aria-label="Close reported messages dialog"
          @click="messageDialog = false"
        />
        <div
          class="admin-reports-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reports-messages-title"
        >
          <div class="admin-reports-modal__card">
            <div class="admin-reports-modal__header">
              <h2 id="admin-reports-messages-title" class="admin-reports-modal__title">
                Reported Messages
              </h2>
              <button
                type="button"
                class="admin-reports-icon-button"
                aria-label="Close reported messages dialog"
                @click="messageDialog = false"
              >
                <i class="mdi mdi-close" aria-hidden="true" />
              </button>
            </div>
            <div class="admin-reports-modal__body">
              <div v-if="selectedReportMessages?.length" class="admin-reports-message-list">
                <article
                  v-for="m in selectedReportMessages"
                  :key="m.message.id"
                  class="admin-reports-message"
                >
                  <div class="admin-reports-message__content">{{ m.message.content }}</div>
                  <div class="admin-reports-message__meta">
                    {{ formatDate(m.message.created_at) }}
                  </div>
                  <NuxtImg
                    v-if="m.message.file_url"
                    :src="m.message.file_url"
                    class="preview-image"
                  />
                </article>
              </div>
              <div v-else class="admin-reports-banner admin-reports-banner--info">
                No messages found for this report.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { NuxtImg } from "#components";

const { getAllReports, getUserDisplayNameFromId, deleteReport } = useDb();

const isLoading = ref(true);
const reports = ref([]);
const selectedCategory = ref(null);

const messageDialog = ref(false);
const selectedReportMessages = ref([]);

const openMessageDialog = (messages) => {
  selectedReportMessages.value = messages;
  messageDialog.value = true;
};

onMounted(async () => {
  const rawReports = await getAllReports();

  const resolved = await Promise.all(
    rawReports.map(async (report) => {
      const reporter_displayname = await getUserDisplayNameFromId(
        report.reporter_id
      );
      const reported_displayname = await getUserDisplayNameFromId(
        report.reported_user_id
      );
      return {
        ...report,
        reporter_displayname: reporter_displayname ?? report.reporter_id,
        reported_displayname: reported_displayname ?? report.reported_user_id,
      };
    })
  );

  reports.value = resolved;
  isLoading.value = false;
});

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

const categoryOptions = ["name", "photo", "descriptors", "actions"];

const filteredReports = computed(() => {
  if (!selectedCategory.value) return reports.value;

  return reports.value.filter((report) =>
    report.categories.includes(selectedCategory.value)
  );
});

const handleDeleteReport = async (reportId) => {
  await deleteReport(reportId);
  reports.value = reports.value.filter((report) => report.id !== reportId);
};
</script>

<style scoped>
.admin-reports-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-reports-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-reports-card__heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.admin-reports-card__icon {
  color: rgb(var(--color-primary));
  font-size: 1.4rem;
  margin-top: 2px;
}

.admin-reports-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-reports-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-reports-card__body {
  padding: 20px 22px 22px;
}

.admin-reports-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  width: min(100%, 280px);
}

.admin-reports-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-reports-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  color-scheme: light dark;
}

.admin-reports-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
}

.admin-reports-banner--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.24);
  color: rgb(var(--color-text));
}

.admin-reports-table-wrap {
  overflow-x: auto;
}

.admin-reports-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.admin-reports-table th,
.admin-reports-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
  text-align: left;
  vertical-align: top;
}

.admin-reports-table th {
  color: rgb(var(--color-heading));
  font-weight: 700;
}

.admin-reports-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.admin-reports-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.admin-reports-reason {
  max-width: 280px;
  white-space: pre-wrap;
}

.admin-reports-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 12px;
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-reports-button--primary {
  border-color: rgba(var(--color-primary), 0.3);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.admin-reports-button--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: rgb(185, 28, 28);
}

.admin-reports-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-reports-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.56);
}

.admin-reports-modal {
  position: relative;
  width: min(100%, 600px);
  max-height: calc(100vh - 40px);
}

.admin-reports-modal__card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

.admin-reports-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.admin-reports-modal__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-reports-modal__body {
  overflow: auto;
  max-height: calc(100vh - 180px);
  padding: 20px;
}

.admin-reports-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
}

.admin-reports-message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-reports-message {
  border: 1px solid rgba(var(--color-border), 0.78);
  border-radius: 18px;
  background: rgba(var(--color-surface-elevated), 0.72);
  padding: 14px;
}

.admin-reports-message__content {
  color: rgb(var(--color-text));
  white-space: pre-wrap;
}

.admin-reports-message__meta {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.8rem;
  margin-top: 8px;
}

.preview-image {
  width: min(100%, 280px);
  height: auto;
  display: block;
  border-radius: 16px;
  margin-top: 12px;
}

.admin-reports-modal-fade-enter-active,
.admin-reports-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.admin-reports-modal-fade-enter-from,
.admin-reports-modal-fade-leave-to {
  opacity: 0;
}
</style>
