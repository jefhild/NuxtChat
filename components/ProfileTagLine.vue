<template>
  <v-text-field
    v-if="isEditable"
    v-model="tagLine"
    label="Tag Line"
    variant="underlined"
    :rules="[blockedDomainRule, specialCharsRule, minLengthRule, maxLengthRule]"
  ></v-text-field>

  <div v-else>
    <!-- <p>{{ tagLine }}</p> -->
  </div>
</template>

<script setup>
const props = defineProps({
  tagLine: {
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
// const noSpacesRule = (value) => {
//   return !/\s/.test(value) || "No spaces allowed";
// };

// Rule to check for minimum length of 4 characters
const minLengthRule = (value) => {
  return value.length >= 4 || "Minimum 4 characters required";
};

const maxLengthRule = (value) => {
  return value.length <= 30 || "Maximum 30 characters allowed"; 
};

// Rule to check for special characters
const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || "Less than 3 special characters required";
};
const blockedDomainRule = (value) => {
  // Regular expression to match domain names and URLs
  const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/[^\s]*)?/;

  // Check if the value matches the domain/URL regex
  const isBlocked = domainRegex.test(value);

  // Return the validation result
  return !isBlocked || "Domain names or links are not allowed";
};

const emits = defineEmits(["updateTagLine"]);

const tagLine = ref(props.tagLine);

watch(tagLine, (newTagLine) => {
  emits("updateTagLine", newTagLine);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
