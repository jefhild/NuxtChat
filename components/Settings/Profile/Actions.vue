<template>
  <div>
    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="profile-action-btn profile-action-btn--primary"
          :disabled="!isFormValid"
          @click="$emit('toggleEditMode')"
        >
          {{ isEditable ? $t("components.profile-container.save") : $t("components.profile-container.edit") }}
        </button>
        <button
          v-if="isEditable"
          type="button"
          class="profile-action-btn profile-action-btn--secondary"
          @click="$emit('cancelEdit')"
        >
          {{ $t("components.profile-container.cancel") }}
        </button>
      </div>
      <div class="flex justify-start sm:justify-end">
        <button
          type="button"
          class="profile-action-btn profile-action-btn--primary"
          :disabled="!isFormValid"
          @click="$emit('gotoChat')"
        >
          {{ $t("components.profile-container.go-to-chat") }}
        </button>
      </div>
    </div>

    <div class="mt-3 grid gap-3 sm:grid-cols-3 sm:items-center">
      <div class="flex justify-start">
        <button
          type="button"
          class="profile-link-btn"
          @click="$emit('toggleDeleteDialog')"
        >
          {{ isMarkedForDeletion
            ? $t("components.profile-container.restore")
            : $t("components.profile-container.delete") }}
        </button>
      </div>

      <div class="flex justify-start sm:justify-center">
        <button
          v-if="!isFinished && isEditable"
          type="button"
          class="profile-link-btn"
          @click="$emit('openFinishProfileDialog')"
        >
          {{ $t("components.profile-container.finish") }}
        </button>
      </div>

      <div class="flex items-center justify-start gap-5 sm:justify-center">
        <button
          type="button"
          class="profile-link-btn profile-link-btn--blue"
          @click="$emit('gotoPublicProfile')"
        >
          {{ $t("components.profile-container.public") }}
        </button>

        <button
          type="button"
          class="profile-icon-btn"
          :title="$t('components.profile-container.copy')"
          :aria-label="$t('components.profile-container.copy')"
          @click="$emit('copyPublicProfileLink')"
        >
          <i class="mdi mdi-content-copy" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isEditable: Boolean,
  isFormValid: Boolean,
  isMarkedForDeletion: Boolean,
  isFinished: Boolean,
});

defineEmits([
  "toggleEditMode",
  "cancelEdit",
  "gotoChat",
  "gotoPublicProfile",
  "copyPublicProfileLink",
  "toggleDeleteDialog",
  "openFinishProfileDialog",
]);
</script>

<style scoped>
.profile-action-btn {
  border-radius: 0.85rem;
  padding: 0.65rem 1rem;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.2;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.profile-action-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.profile-action-btn--primary {
  border: 1px solid transparent;
  background: #2563eb;
  color: #fff;
}

.profile-action-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.profile-action-btn--secondary {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(30, 41, 59, 0.92);
  color: #e2e8f0;
}

.profile-action-btn--secondary:hover:not(:disabled) {
  background: rgba(51, 65, 85, 0.92);
}

.profile-link-btn {
  border: 0;
  background: transparent;
  padding: 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
}

.profile-link-btn:hover {
  color: #e2e8f0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.profile-link-btn--blue {
  color: #93c5fd;
}

.profile-icon-btn {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.14);
  color: #93c5fd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.profile-icon-btn:hover {
  background: rgba(37, 99, 235, 0.22);
}
</style>
