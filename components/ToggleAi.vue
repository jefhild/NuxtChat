<template>
  <div class="d-flex align-center">
    <v-switch
      :model-value="modelValue"
      @update:model-value="onToggle"
      color="primary"
      hide-details
      class="text-medium-emphasis"
      :label="modelValue ? 'AI Users' : 'Real Users'"
    />
    <!-- <v-icon size="18" class="mr-1">mdi-robot</v-icon> AI -->
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const route = useRoute();
const router = useRouter();

const onToggle = (val) => {
  emit("update:modelValue", val);
  const query = { ...route.query, user: val ? "ai" : "human" };
  router.push({ query });
};
</script>
