<template>
  <div>
    <v-select
      v-if="isEditable"
      v-model="selectedStatus"
      :items="status"
      item-title="name"
      item-value="id"
      variant="underlined"
      label="Status"
    />
    <div v-else>
      <v-row>
        <!-- <v-col cols="auto" class="mt-1"
          ><v-icon>{{ selectedStatusIcon }}</v-icon> 
          </v-col
        > -->
        <v-col class="text-h6"> {{ selectedStatusLabel }} </v-col></v-row
      >
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedStatus: {
    type: Number,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
  status: {
    type: Array,
    required: true,
  },
});

const emits = defineEmits(["updateStatus"]);

const selectedStatus = ref(props.selectedStatus);

const selectedStatusLabel = computed(() => {
  const status = props.status.find((s) => s.id === selectedStatus.value);
  return status ? status.name : "";
});

const selectedStatusIcon = computed(() => {
  const status = props.status.find((s) => s.id === selectedStatus.value);
  return status ? status.icon : "";
});

const updateStatus = () => {
  emits("updateStatus", selectedStatus.value);
};

watch(selectedStatus, updateStatus);
</script>

<style>
/* Add any additional styles if needed */
</style>
