<template>
  <div>
    <div class="grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
      <div class="px-1 py-0">
        <label v-if="countries.length" class="ui-settings-field">
          <span class="ui-settings-field__label">{{ $t('components.location-selection.country') }}</span>
          <select
            :disabled="!props.isEditable"
            :value="selectedCountryValue"
            class="ui-settings-field__control"
            @change="countryChanged($event.target.value)"
          >
            <option value="" />
            <option
              v-for="country in countries"
              :key="country.id"
              :value="country.id"
            >
              {{ country.name }}
            </option>
          </select>
        </label>
      </div>
      <div class="px-1 py-0">
        <label v-if="states.length" class="ui-settings-field">
          <span class="ui-settings-field__label">{{ $t('components.location-selection.state') }}</span>
          <select
            :disabled="!props.isEditable"
            :value="selectedStateValue"
            class="ui-settings-field__control"
            @change="stateChanged($event.target.value)"
          >
            <option value="" />
            <option
              v-for="state in states"
              :key="state.id"
              :value="state.id"
            >
              {{ state.name }}
            </option>
          </select>
        </label>
      </div>
      <div class="px-1 py-0">
        <label class="ui-settings-field">
          <span class="ui-settings-field__label">{{ $t('components.location-selection.city') }}</span>
          <select
            :disabled="!props.isEditable"
            :value="selectedCityValue"
            class="ui-settings-field__control"
            @change="cityChanged($event.target.value)"
          >
            <option value="" />
            <option
              v-for="city in cities"
              :key="city.id"
              :value="city.id"
            >
              {{ city.name }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedCountry: [String, Number, null],
  selectedState: [String, Number, null],
  selectedCity: {
    type: [String, Number, null],
    default: null,
  },
  countries: Array,
  states: Array,
  cities: Array,
  isEditable: Boolean,
});

const emits = defineEmits(["updateCountry", "updateState", "updateCity"]);

const selectedCountry = ref(props.selectedCountry);
const selectedState = ref(props.selectedState);
const selectedCity = ref(props.selectedCity);
const selectedCountryValue = computed(() => String(selectedCountry.value ?? ""));
const selectedStateValue = computed(() => String(selectedState.value ?? ""));
const selectedCityValue = computed(() => String(selectedCity.value ?? ""));

// Keep local state in sync with props
watch(
  () => props.selectedCountry,
  (val) => {
    selectedCountry.value = val;
  }
);

watch(
  () => props.selectedState,
  (val) => {
    selectedState.value = val;
  }
);

watch(
  () => props.selectedCity,
  (val) => {
    selectedCity.value = val;
  }
);

// Emit updates when user changes values
const parseSelectValue = (val) => (val === "" ? null : Number(val));

const countryChanged = (val) => {
  const nextCountry = parseSelectValue(val);
  selectedCountry.value = nextCountry;
  selectedState.value = null;
  selectedCity.value = null;
  emits("updateCountry", nextCountry);
};

const stateChanged = (val) => {
  const nextState = parseSelectValue(val);
  selectedState.value = nextState;
  selectedCity.value = null;
  emits("updateState", nextState);
};

const cityChanged = (val) => {
  const nextCity = parseSelectValue(val);
  selectedCity.value = nextCity;
  emits("updateCity", nextCity);
};
</script>
