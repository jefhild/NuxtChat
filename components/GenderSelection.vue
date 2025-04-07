<template>
  <v-select
    v-if="isEditable"
    v-model="internalSelectedGender"
    :items="genders"
    item-title="name"
    item-value="id"
    variant="underlined"
    :rules="genderRules"
    label="Gender"
    @blur="validateGender"
    :error="genderError"
    :error-messages="genderErrorMessage"
  />
  <v-row v-else>
    <v-col class="gender-label">{{ selectedGenderLabel }}</v-col>
  </v-row>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [Number, null], // Allow Number and null
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
  genders: {
    type: Array,
    required: true,
  },
});

const emits = defineEmits(["update:modelValue", "validation"]);

const internalSelectedGender = ref(props.modelValue);

// Watch for changes and emit both the new value and validation status
watch(internalSelectedGender, (newValue) => {
  emits("update:modelValue", newValue);
  validateGender(); // Re-validate the selection when it changes
});

watch(() => props.modelValue, (newValue) => {
  internalSelectedGender.value = newValue;
});

const genderError = ref(false);
const genderErrorMessage = ref("");

// Validation rules for gender selection
const genderRules = [
  (v) => !!v || "Gender is required",
  (v) => v !== null || "You must select a gender",
];

const selectedGenderLabel = computed(() => {
  const gender = props.genders.find((g) => g.id === internalSelectedGender.value);
  return gender ? gender.name : "";
});

const validateGender = () => {
  if (!internalSelectedGender.value) {
    genderError.value = true;
    genderErrorMessage.value = "You must select a gender.";
    emits("validation", false); // Emit false if invalid
  } else {
    genderError.value = false;
    genderErrorMessage.value = "";
    emits("validation", true); // Emit true if valid
  }
};
</script>

<style scoped>
.gender-label {
  font-size: 1.1rem;
  line-height: 1.45;
  color: #1b2029;
  font-style: italic;
  padding-left: 1rem;
  text-align: justify;
}
</style>