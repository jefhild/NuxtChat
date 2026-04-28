<template>
  <label class="ui-settings-field">
    <span class="ui-settings-field__label">Status</span>
    <select
      :disabled="!props.isEditable"
      :value="props.selectedStatus ?? ''"
      class="ui-settings-field__control"
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
