<template>
  <v-text-field
    v-if="isEditable"
    v-model="displayName"
    label="Profile Name"
    variant="underlined"
    :rules="[noSpacesRule, specialCharsRule, minLengthRule, maxLengthRule]"
  ></v-text-field>

  <div v-else>
    <p>{{ displayName }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  displayName: {
    type: String,
    default: "",
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

// Rule to check for spaces
const noSpacesRule = (value) => {
  return !/\s/.test(value) || "No spaces allowed";
};

// Rule to check for minimum length of 4 characters
const minLengthRule = (value) => {
  return value.length >= 4 || "Minimum 4 characters required";
};
const maxLengthRule = (value) => {
  return value.length <= 15 || "Maximum 15 characters allowed"; 
};

// Rule to check for special characters
const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || "Less than 3 special characters required";
};

const emits = defineEmits(["updateDisplayName"]);

const displayName = ref(props.displayName);

watch(displayName, (newDisplayName) => {
  emits("updateDisplayName", newDisplayName);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
