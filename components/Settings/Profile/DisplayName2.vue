<template>
  <div>
    <v-text-field
      :disabled="!props.isEditable"
      v-model="localDisplayName"
      :label="$t('components.profile-displayname.display-name')"
      :rules="displayNameRules"
      variant="underlined"
    ></v-text-field>
    <!-- <span v-else>{{ displayName }}</span> -->
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from "vue-i18n";
const { t } = useI18n();
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
  return !/\s/.test(value) || t('components.profile-displayname.no-spaces');
};

const minLengthRule = (value) => {
  return value.length >= 4 || t('components.profile-displayname.min-4');
};

const maxLengthRule = (value) => {
  return value.length <= 15 || t('components.profile-displayname.max-15'); 
};

const specialCharsRule = (value) => {
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
  const specialCharCount = (value.match(specialChars) || []).length;
  return specialCharCount < 3 || t('components.profile-displayname.less-3-special');
};

const displayNameRules = [
  (v) => !!v || t('components.profile-displayname.required '),
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