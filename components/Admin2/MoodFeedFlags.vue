<template>
  <section class="admin-flags-card">
    <div class="admin-flags-card__header">
      <div class="admin-flags-card__heading">
        <i class="mdi mdi-flag admin-flags-card__icon" aria-hidden="true" />
        <div>
          <h2 class="admin-flags-card__title">Mood Feed Flags</h2>
          <p class="admin-flags-card__subtitle">
            Review flagged entries and replies, remove abusive content, or dismiss false positives.
          </p>
        </div>
      </div>
      <button
        type="button"
        class="admin-flags-button"
        :disabled="isLoading"
        @click="loadFlags"
      >
        Refresh
      </button>
    </div>

    <div class="admin-flags-card__body">
      <div
        v-if="errorMessage"
        class="admin-flags-banner admin-flags-banner--error"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <LoadingContainer v-if="isLoading" />

      <div
        v-else-if="flags.length === 0"
        class="admin-flags-banner admin-flags-banner--info"
      >
        No flagged mood feed items.
      </div>

      <div v-else class="admin-flags-table-wrap">
        <table class="admin-flags-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Content</th>
              <th>Reporter</th>
              <th>Author</th>
              <th>Reason</th>
              <th>Flagged</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="flag in flags" :key="flag.id">
              <td>
                <span
                  class="admin-flags-chip"
                  :class="flag.target_type === 'entry' ? 'admin-flags-chip--entry' : 'admin-flags-chip--reply'"
                >
                  {{ flag.target_type }}
                </span>
                <div class="admin-flags-target-id">
                  {{ flag.target_id }}
                </div>
              </td>
              <td>
                <div v-if="flag.target?.missing" class="admin-flags-missing">
                  Missing target
                </div>
                <div v-else>
                  <div class="flag-content">
                    {{ flag.target?.content || "" }}
                  </div>
                  <div v-if="flag.target?.prompt_text" class="admin-flags-prompt">
                    Prompt: {{ flag.target.prompt_text }}
                  </div>
                </div>
              </td>
              <td>{{ flag.reporter?.displayname || flag.reporter?.user_id }}</td>
              <td>{{ flag.target?.author?.displayname || flag.target?.author?.user_id }}</td>
              <td>{{ flag.reason || "—" }}</td>
              <td>{{ formatDate(flag.created_at) }}</td>
              <td>
                <div class="actions-col">
                  <button
                    type="button"
                    class="admin-flags-button admin-flags-button--danger"
                    :disabled="flag.target?.missing"
                    @click="deleteTarget(flag)"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    class="admin-flags-button"
                    @click="dismissFlag(flag.id)"
                  >
                    Dismiss
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";

const isLoading = ref(true);
const flags = ref([]);
const errorMessage = ref("");

const loadFlags = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const res = await $fetch("/api/admin/mood-feed/flags");
    flags.value = res?.flags || [];
  } catch (error) {
    console.error("[admin][mood-feed] flags load error", error);
    flags.value = [];
    errorMessage.value = "Failed to load flagged items.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadFlags);

const deleteTarget = async (flag) => {
  if (!flag?.target_id || !flag?.target_type) return;
  const endpoint =
    flag.target_type === "entry"
      ? `/api/admin/mood-feed/entries/${flag.target_id}`
      : `/api/admin/mood-feed/replies/${flag.target_id}`;

  try {
    await $fetch(endpoint, { method: "DELETE" });
    flags.value = flags.value.filter(
      (item) =>
        !(
          item.target_type === flag.target_type &&
          item.target_id === flag.target_id
        )
    );
  } catch (error) {
    console.error("[admin][mood-feed] delete target error", error);
    errorMessage.value = "Failed to delete flagged content.";
  }
};

const dismissFlag = async (flagId) => {
  if (!flagId) return;
  try {
    await $fetch(`/api/admin/mood-feed/flags/${flagId}`, { method: "DELETE" });
    flags.value = flags.value.filter((item) => item.id !== flagId);
  } catch (error) {
    console.error("[admin][mood-feed] dismiss flag error", error);
    errorMessage.value = "Failed to dismiss flag.";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};
</script>

<style scoped>
.admin-flags-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-flags-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-flags-card__heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.admin-flags-card__icon {
  color: rgb(var(--color-primary));
  font-size: 1.3rem;
  margin-top: 2px;
}

.admin-flags-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-flags-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-flags-card__body {
  padding: 20px 22px 22px;
}

.admin-flags-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.admin-flags-banner--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.24);
  color: rgb(var(--color-text));
}

.admin-flags-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-flags-button {
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

.admin-flags-button--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: rgb(185, 28, 28);
}

.admin-flags-table-wrap {
  overflow-x: auto;
}

.admin-flags-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-flags-table th,
.admin-flags-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
  text-align: left;
  vertical-align: top;
}

.admin-flags-table th {
  color: rgb(var(--color-heading));
  font-weight: 700;
}

.admin-flags-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.admin-flags-chip--entry {
  background: rgba(99, 102, 241, 0.12);
  color: rgb(67, 56, 202);
}

.admin-flags-chip--reply {
  background: rgba(20, 184, 166, 0.12);
  color: rgb(13, 148, 136);
}

.admin-flags-target-id,
.admin-flags-prompt {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.8rem;
  margin-top: 6px;
}

.admin-flags-missing {
  color: rgb(185, 28, 28);
  font-weight: 600;
}

.flag-content {
  max-width: 420px;
  white-space: pre-wrap;
}

.actions-col {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
