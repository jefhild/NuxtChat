<template>
  <div class="d-flex align-center">
    <v-switch
      :model-value="modelValue"
      @update:model-value="onToggle"
      color="primary"
      hide-details
      class="text-medium-emphasis"
      :label="modelValue ? $t('components.toggle-ai.ai') : $t('components.toggle-ai.real')"
    />
    <!-- <v-icon size="18" class="mr-1">mdi-robot</v-icon> AI -->
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps({
  modelValue: Boolean,
});
const localPath = useLocalePath();
const emit = defineEmits(["update:modelValue"]);

const route = useRoute();
const router = useRouter();

const onToggle = (val) =>
{
  emit("update:modelValue", val);
  const query = { ...route.query, user: val ? "ai" : "human" };

  const localizedPath = localPath(route.fullPath.split("?")[0]); 

  router.push({ path: localizedPath, query });
};

</script>
