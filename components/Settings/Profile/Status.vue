<template>
  <label class="profile-field">
    <span class="profile-field__label">Status</span>
    <select
      :disabled="!props.isEditable"
      :value="props.selectedStatus ?? ''"
      class="profile-field__control"
      @change="emit('updateStatus', Number(($event.target).value))"
    >
      <option
        v-for="status in props.statuses"
        :key="status.id"
        :value="status.id"
      >
        {{ status.name }}
      </option>
    </select>
  </label>
</template>

<script setup>
const props = defineProps({
  selectedStatus: Number,
  statuses: Array,
  isEditable: Boolean,
});

const emit = defineEmits(["updateStatus"]);
</script>

<style scoped>
.profile-field {
  display: grid;
  gap: 0.35rem;
}

.profile-field__label {
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 600;
}

.profile-field__control {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.7rem 0.85rem;
  font-size: 1rem;
  color-scheme: light dark;
}

.profile-field__control:disabled {
  opacity: 1;
  cursor: default;
  background: rgb(var(--color-surface) / 0.76);
  color: rgb(var(--color-foreground) / 0.62);
}
</style>
