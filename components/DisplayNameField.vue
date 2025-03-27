<template>
  <!-- <v-container> -->
    <v-text-field
      v-model="displayName"
      label="Display Name"
      :rules="[noSpacesRule, specialCharsRule, minLengthRule]"
      :error-messages="errorMessages"
      variant="underlined"
      hint="This is the name that will be displayed to other users"
      @input="handleInput"
      :disabled="!isEditable"
    ></v-text-field>
  <!-- </v-container> -->
</template>

<script setup>
const errorMessages = ref([]);
const isValid = ref(false);


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

const { getUserFromName } = useDb();

const emits = defineEmits(["updateDisplayName", "validation"]);

const displayName = ref(props.displayName);

// Rule to check for spaces
const noSpacesRule = (value) => {
  const isValid = !/\s/.test(value) || "No spaces allowed";
  // console.log(`noSpacesRule - value: ${value}, isValid: ${isValid}`);
  return isValid;
};
// Rule to check for minimum length of 4 characters
const minLengthRule = (value) => {
  const isValid = value.length >= 4 || "Minimum 4 characters required";
  // console.log(`minLengthRule - value: ${value}, isValid: ${isValid}`);
  return isValid;
};
// Rule to check for special characters
const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  const isValid = specialCharCount < 3 || "Less than 3 special characters required";
  // console.log(`specialCharsRule - value: ${value}, isValid: ${isValid}`);
  return isValid;
};

watch(displayName, (newDisplayName) => {
  emits("updateDisplayName", newDisplayName);
});

const validateDisplayName = async () => {
  const name = displayName.value;

  // Reset error messages
  errorMessages.value = [];

  // Check if the display name is empty
  if (name === "") {
    errorMessages.value.push("Display name cannot be empty");
    isValid.value = false;
    emits('validation', false);
    console.log("Validation Failed: Display name cannot be empty");
    return;
  }

  // Check the length of the display name
  if (name.length < 4) {
    errorMessages.value.push("Display name must be at least 4 characters long");
    isValid.value = false;
    emits('validation', false);
    // console.log("Validation Failed: Display name must be at least 4 characters long");
    return;
  }
  if (name.length > 14) {
    errorMessages.value.push(
      "Display name cannot be more than 13 characters long"
    );
    isValid.value = false;
    emits('validation', false);
    console.log("Validation Failed: Display name cannot be more than 13 characters long");
    return;
  }

  // Check for spaces
  if (/\s/.test(name)) {
    errorMessages.value.push("No spaces allowed");
    isValid.value = false;
    emits('validation', false);
    console.log("Validation Failed: No spaces allowed");
    return;
  }

  try {
    const data = await getUserFromName(name);

    if (data.length > 0) {
      errorMessages.value.push("Display name is already taken");
      isValid.value = false;
      emits('validation', false);
      console.log("Validation Failed: Display name is already taken");
      return;
    }
  } catch (error) {
    console.error("Failed to validate display name:", error);
    errorMessages.value.push("An error occurred while validating");
    isValid.value = false;
    emits('validation', false);
    console.log("Validation Failed: An error occurred while validating");
    return;
  }

  // If no errors, set isValid to true
  isValid.value = true;
  emits('validation', true);
  // console.log("Validation Passed");
};

watch(displayName, validateDisplayName);

const handleInput = (event) => {
  const value = event.target.value;
  emits('updateDisplayName', value);
  validateDisplayName();
};
</script>
