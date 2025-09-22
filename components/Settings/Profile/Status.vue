<template>
  <v-select
    :disabled="!props.isEditable"
    variant="underlined"
    :items="props.statuses"
    :model-value="props.selectedStatus"
    item-title="name"
    item-value="id"
    label="Status"
    @update:modelValue="(val) => emit('updateStatus', val)"
  />

  <!-- <span v-else>
    {{
      props.statuses.find((s) => s.id === props.selectedStatus)?.name ||
      "Unknown"
    }}
  </span> -->
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
.status-label {
  font-size: 1.1rem;
  line-height: 1.45;
  color: #1b2029;
  font-style: italic;
  padding-left: 1rem;
  text-align: justify;
}
</style>
