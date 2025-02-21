<template>
  <div>
    <v-text-field
      v-if="isEditable"
      v-model="localDisplayName"
      label="Display Name"
      :rules="displayNameRules"
      variant="underlined"
    ></v-text-field>
    <span v-else>{{ displayName }}</span>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';

// Props
const props = defineProps({
  displayName: {
    type: String,
    required: true,
  },
  isEditable: {
    type: Boolean,
    default: false,
  },
});

// Emit events
const emit = defineEmits(['updateDisplayName', 'validation']);

// Local state for the display name
const localDisplayName = ref(props.displayName);

// Validation rules
const noSpacesRule = (value) => {
  return !/\s/.test(value) || "No spaces allowed";
};

const minLengthRule = (value) => {
  return value.length >= 4 || "Minimum 4 characters required";
};

const maxLengthRule = (value) => {
  return value.length <= 15 || "Maximum 15 characters allowed"; 
};

const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || "Less than 3 special characters required";
};

const displayNameRules = [
  (v) => !!v || "Display Name is required",
  noSpacesRule,
  minLengthRule,
  maxLengthRule,
  specialCharsRule,
];

// Emit validation result
const validateDisplayName = () => {
  const isValid = displayNameRules.every((rule) => rule(localDisplayName.value) === true);
  emit('validation', isValid);
};

// Watch for changes to the local display name and emit the necessary events
watch(localDisplayName, (newDisplayName) => {
  emit('updateDisplayName', newDisplayName);
  validateDisplayName(); // Validate after every change
});

// Watch for changes to the prop and update localDisplayName accordingly
watch(() => props.displayName, (newDisplayName) => {
  localDisplayName.value = newDisplayName;
});
// Watch for changes to `isEditable` and trigger validation when switching to edit mode
watch(() => props.isEditable, (newEditableState) => {
  if (newEditableState) {
    validateDisplayName(); // Validate when entering edit mode
  }
});

// Validate when the component is mounted
onMounted(() => {
  validateDisplayName(); // Trigger validation immediately when mounted
});
</script>