<template>
  <div>
    <v-select
      v-if="isEditable"
      v-model="selectedStatus"
      :items="status"
      item-title="name"
      item-value="id"
      variant="underlined"
      :label="$t('components.status-selection.status')"
    />
    <div v-else>
      <v-row>
        <v-col class="status-label"> {{ selectedStatusLabel }} </v-col></v-row
      >
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
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

// const selectedStatusIcon = computed(() => {
//   const status = props.status.find((s) => s.id === selectedStatus.value);
//   return status ? status.icon : "";
// });

const updateStatus = () => {
  emits("updateStatus", selectedStatus.value);
};

watch(selectedStatus, updateStatus);
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
