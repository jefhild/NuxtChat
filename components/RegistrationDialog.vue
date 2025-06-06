<template>
  <v-dialog v-model="dialogVisible" max-width="500">
    <v-card>
      <v-card-title>{{ $t('components.registration-dialog.register') }} </v-card-title>
      <v-card-text>
        <LoginGoogle />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <!-- <v-btn color="primary" @click="submitRegistration">Register</v-btn> -->
        <v-btn text @click="closeDialog">{{ $t('components.registration-dialog.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
// import { ref, watch, defineProps, defineEmits } from 'vue';

// Define props with destructuring to directly access `modelValue`
const { modelValue } = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// Define emit events
defineEmits(['update:modelValue']);

// Local states
const dialogVisible = ref(false);
const email = ref('');

// Watch for changes in `modelValue` and sync dialog visibility
watch(
  () => modelValue,
  (newValue) => {
    dialogVisible.value = newValue;
  }
);

function closeDialog() {
  dialogVisible.value = false;
  emit('update:modelValue', false); // Notify parent to close dialog
}

</script>