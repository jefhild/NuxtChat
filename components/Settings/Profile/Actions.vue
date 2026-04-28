<template>
  <div>
    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="ui-settings-btn ui-settings-btn--primary"
          :disabled="!isFormValid"
          @click="$emit('toggleEditMode')"
        >
          {{ isEditable ? $t("components.profile-container.save") : $t("components.profile-container.edit") }}
        </button>
        <button
          v-if="isEditable"
          type="button"
          class="ui-settings-btn ui-settings-btn--secondary"
          @click="$emit('cancelEdit')"
        >
          {{ $t("components.profile-container.cancel") }}
        </button>
      </div>
      <div class="flex justify-start sm:justify-end">
        <button
          type="button"
          class="ui-settings-btn ui-settings-btn--secondary"
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
          class="ui-settings-text-link profile-link-btn--danger"
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
          class="ui-settings-text-link"
          @click="$emit('openFinishProfileDialog')"
        >
          {{ $t("components.profile-container.finish") }}
        </button>
      </div>

      <div class="flex items-center justify-start gap-5 sm:justify-center">
        <button
          type="button"
          class="ui-settings-text-link"
          @click="$emit('gotoPublicProfile')"
        >
          {{ $t("components.profile-container.public") }}
        </button>

        <button
          type="button"
          class="ui-settings-icon-btn"
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
.profile-link-btn--danger {
  color: rgb(var(--color-danger));
}

.profile-link-btn--danger:hover,
.profile-link-btn--danger:focus-visible {
  color: rgb(var(--color-danger));
}
</style>
