<template>
  <v-select
    :disabled="!props.isEditable"
    :items="genders"
    :model-value="genderId"
     variant="underlined"
    label="Gender"
    item-title="name"
    item-value="id"
    @update:modelValue="(val) => emit('updateGenderId', val)"
  />
  <!-- <div v-else>
    {{ genders.find((g) => g.id === genderId)?.name || "Not specified" }}
  </div> -->
</template>

<script setup>
const props = defineProps({
  genderId: Number,
  genders: Array,
  isEditable: Boolean,
});

const emit = defineEmits(["updateGenderId", "validation"]);
</script>