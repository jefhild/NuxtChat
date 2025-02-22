<template>
  <v-container>
    <v-form>
      <v-select
        v-model="localValue"
        :items="stateOptions"
        variant="underlined"
        item-title="name"
        item-value="id"
        label="State/Province"
        @change="emitValue"
        :loading="loading"
        :error-messages="errorMessages"
        :disabled="!props.countryId"
      ></v-select>
    </v-form>
  </v-container>
</template>

<script setup>

const supabase = useSupabaseClient();

const props = defineProps({
  modelValue: Number,
  countryId: Number
});

const emit = defineEmits(['update:modelValue']);

const localValue = ref(props.modelValue);
const stateOptions = ref([]);
const loading = ref(false);
const errorMessages = ref([]);

const fetchStateOptions = async (countryId) => {
  if (!countryId) {
    stateOptions.value = [];
    return;
  }

  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('states')
      .select('id, name')
      .eq('country_id', countryId);

    if (error) {
      throw error;
    }

    console.log('Fetched state options:', data);
    stateOptions.value = data;
  } catch (error) {
    console.error('Failed to fetch state options:', error);
    errorMessages.value = ['An error occurred while fetching state options'];
  } finally {
    loading.value = false;
  }
};

const emitValue = () => {
  emit('update:modelValue', localValue.value);
};

watch(
  () => props.modelValue,
  (newVal) => {
    localValue.value = newVal;
  }
);

watch(
  () => props.countryId,
  async (newVal) => {
    await fetchStateOptions(newVal);
  }
);

watch(localValue, (newVal) => {
  console.log('localValue changed:', newVal);
  emitValue();
});

onMounted(() => {
  if (props.countryId) {
    fetchStateOptions(props.countryId);
  }
});
</script>
