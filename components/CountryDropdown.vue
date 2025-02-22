<template>
  <v-container>
    <v-form>
      <v-select
        v-model="localValue"
        :items="countryOptions"
        variant="underlined"
        item-title="name"
        item-value="id"
        label="Country"
        @change="emitValue"
        :loading="loading"
        :error-messages="errorMessages"
      ></v-select>
    </v-form>
  </v-container>
</template>

<script setup>

const supabase = useSupabaseClient();

const props = defineProps({
  modelValue: [Number, null]
});

const emit = defineEmits(['update:modelValue']);

const localValue = ref(props.modelValue);
const countryOptions = ref([]);
const loading = ref(false);
const errorMessages = ref([]);
let hasFetchedCountries = false; // Guard to prevent multiple fetches

const fetchCountryOptions = async () => {
  if (hasFetchedCountries) return; // Check if already fetched
  hasFetchedCountries = true; // Set guard

  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name');

    if (error) {
      throw error;
    }

    console.log('Fetched country options:', data);
    countryOptions.value = data;
  } catch (error) {
    console.error('Failed to fetch country options:', error);
    errorMessages.value = ['An error occurred while fetching country options'];
  } finally {
    loading.value = false;
  }
};

const getUserIp = async () => {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
};

const getUserCountry = async (ip) => {
  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await response.json();
  return data.country_name;
};

const setDefaultCountry = async () => {
  const userIp = await getUserIp();
  const userCountry = await getUserCountry(userIp);

  const country = countryOptions.value.find(country => country.name === userCountry);
  if (country) {
    localValue.value = country.id;
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

watch(localValue, (newVal) => {
  console.log('localValue changed:', newVal);
  emitValue();
});

onMounted(async () => {
  await fetchCountryOptions();
  await setDefaultCountry();
});
</script>
