<template>
  <div class="mt-6">
    <hr class="settings-delete-divider">
    <button
      type="button"
      class="settings-delete-btn"
      :class="{ 'is-loading': deleteBusy }"
      :disabled="deleteBusy || !userId"
      @click="toggleDeletionMark"
    >
      <span v-if="deleteBusy" class="settings-delete-spinner" aria-hidden="true" />
      {{ isMarkedForDeletion
        ? $t("components.profile-container.marked-for-deletion")
        : $t("components.profile-container.delete") }}
    </button>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";

const authStore = useAuthStore();
const { markUserForDeletion, unmarkUserForDeletion } = useDb();

const userId = computed(() => authStore.userProfile?.user_id);

const isMarkedForDeletion = computed(
  () => !!authStore.userProfile?.marked_for_deletion_at
);

const deleteBusy = ref(false);

const toggleDeletionMark = async () => {
  if (!userId.value || deleteBusy.value) return;
  deleteBusy.value = true;
  try {
    if (isMarkedForDeletion.value) {
      await unmarkUserForDeletion(userId.value);
      authStore.userProfile.marked_for_deletion_at = null;
    } else {
      await markUserForDeletion(userId.value);
      authStore.userProfile.marked_for_deletion_at = new Date().toISOString();
    }
  } catch (err) {
    console.error("[DeleteAccount] error:", err);
  } finally {
    deleteBusy.value = false;
  }
};
</script>

<style scoped>
.settings-delete-divider {
  margin: 0 0 1rem;
  border: 0;
  border-top: 1px solid rgb(var(--color-border) / 0.72);
}

.settings-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgb(var(--color-danger) / 0.45);
  border-radius: 10px;
  background: transparent;
  color: rgb(var(--color-danger));
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.settings-delete-btn:hover:not(:disabled),
.settings-delete-btn:focus-visible {
  background: rgb(var(--color-danger) / 0.08);
  outline: none;
}

.settings-delete-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.settings-delete-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: settings-delete-spin 0.7s linear infinite;
}

@keyframes settings-delete-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
