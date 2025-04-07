<template>
  <v-select
    v-if="isEditable"
    v-model="age"
    :items="getAgeList()"
    item-title="age"
    item-value="age"
    label="Age"
    :rules="[requiredAgeRule]"
    variant="underlined"
  />
  <v-row v-else>
    <v-col class="age-label">{{ age }}</v-col></v-row
  >
</template>

<script setup>
const items = ref([]);

const props = defineProps({
  age: {
    type: Number,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

const emits = defineEmits(["updateAge"]);

const age = ref(props.age);

const getAgeList = () => {
  const ageList = [];
  for (let i = 18; i <= 65; i++) {
    ageList.push({ age: i });
  }
  return ageList;
};

// Rule to check if age is provided
const requiredAgeRule = (value) => {
  return (
    (value !== null && value !== undefined && value !== "") || "Age is required"
  );
};

watch(age, (newAge) => {
  emits("updateAge", newAge);
});
</script>

<style scoped>
.age-label {
  font-size: 1.1rem;
  line-height: 1.45;
  color: #1b2029;
  font-style: italic;
  padding-left: 1rem;
  text-align: justify;
}
</style>
