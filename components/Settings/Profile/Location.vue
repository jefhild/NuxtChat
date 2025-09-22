<template>
  <div>
    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <v-select
          v-if="countries.length"
          :disabled="!props.isEditable"
          v-model="selectedCountry"
          :items="countries"
          item-title="name"
          item-value="id"
          :label="$t('components.location-selection.country')"
          variant="underlined"
          @update:modelValue="countryChanged"
        />

        <!-- <v-row v-else
          ><v-col cols="auto" class="mt-1"
            ><label class="font-weight-bold">{{
              $t("components.location-selection.country2")
            }}</label></v-col
          >
          <v-col class="location-label">{{
            countries.find((c) => c.id === selectedCountry)?.name || ""
          }}</v-col>
        </v-row> -->
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <v-select
          v-if="states.length"
          :disabled="!props.isEditable"
          v-model="selectedState"
          :items="states"
          item-title="name"
          item-value="id"
          :label="$t('components.location-selection.state')"
          variant="underlined"
          @update:modelValue="stateChanged"
        />

        <!-- <v-row v-else
          ><v-col cols="auto" class="mt-1"
            ><label class="font-weight-bold">{{
              $t("components.location-selection.state2")
            }}</label></v-col
          >
          <v-col class="location-label">{{
            states.find((c) => c.id === selectedState)?.name || ""
          }}</v-col>
        </v-row> -->
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <v-select
          :disabled="!props.isEditable"
          v-model="selectedCity"
          :items="cities"
          item-title="name"
          item-value="id"
          :label="$t('components.location-selection.city')"
          variant="underlined"
          @update:modelValue="cityChanged"
        />

        <!-- <v-row v-else
          ><v-col cols="auto" class="mt-1"
            ><label class="font-weight-bold">{{
              $t("components.location-selection.city2")
            }}</label></v-col
          >

          <v-col class="location-label">{{
            cities.find((c) => c.id === selectedCity)?.name || ""
          }}</v-col>
        </v-row> -->
      </v-col>
    </v-row>
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
const countryChanged = (val) => {
  selectedState.value = null;
  selectedCity.value = null;
  emits("updateCountry", val);
};

const stateChanged = (val) => {
  selectedCity.value = null;
  emits("updateState", val);
};

const cityChanged = (val) => {
  emits("updateCity", val);
};
</script>

<style>
.location-label {
  font-size: 1.1rem;
  line-height: 1.45;
  color: #1b2029;
  font-style: italic;
  padding-left: 1rem;
  text-align: justify;
}
</style>
