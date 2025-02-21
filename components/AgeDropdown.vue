<template>
  <v-container>
    <v-form>
      <v-responsive max-width="75">
        <v-select
          v-model="localValue"
          :items="ages"
          variant="underlined"
          label="Age"
          @change="emitValue"
        ></v-select
      ></v-responsive>
    </v-form>
  </v-container>
</template>

<script setup>
// import { ref, watch } from '@nuxtjs/composition-api';

const props = defineProps({
  modelValue: Number,
});

const emit = defineEmits(["update:modelValue"]);

const localValue = ref(props.modelValue);
const ages = Array.from({ length: 65 - 18 + 1 }, (v, i) => i + 18);

watch(
  () => props.modelValue,
  (newVal) => {
    localValue.value = newVal;
  }
);

const emitValue = () => {
  emit("update:modelValue", localValue.value);
};

watch(localValue, emitValue);
</script>
