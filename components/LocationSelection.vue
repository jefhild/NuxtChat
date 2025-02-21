<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-select
          v-if="isEditable"
          v-model="selectedCountry"
          :items="countries"
          item-title="name"
          item-value="name"
          label="Country"
          variant="underlined"
          @change="countryChanged"
        ></v-select>

        <v-row v-else
          ><v-col cols="auto" class="mt-1"><label>Country:</label></v-col>
          <v-col class="text-h6">{{ selectedCountry }}</v-col>
        </v-row>
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-if="isEditable && selectedCountry"
          v-model="selectedState"
          :items="states"
          item-title="name"
          item-value="name"
          label="State"
          variant="underlined"
          @change="stateChanged"
        ></v-select>

        <v-row v-else
          ><v-col cols="auto" class="mt-1"><label>State:</label></v-col>
          <v-col class="text-h6">{{ selectedState }}</v-col>
        </v-row>
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-if="isEditable && selectedState"
          v-model="selectedCity"
          :items="cities"
          item-title="name"
          item-value="name"
          label="City"
          variant="underlined"
        ></v-select>

        <v-row v-else
          ><v-col cols="auto" class="mt-1"><label>City:</label></v-col>

          <v-col class="text-h6">{{ selectedCity }}</v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedCountry: {
    type: String,
    required: true,
  },
  selectedState: {
    type: String,
    required: true,
  },
  selectedCity: {
    type: String,
    required: true,
  },
  countries: {
    type: Array,
    required: true,
  },
  states: {
    type: Array,
    required: true,
  },
  cities: {
    type: Array,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

const emits = defineEmits(["updateCountry", "updateState", "updateCity"]);

const selectedCountry = ref(props.selectedCountry);
const selectedState = ref(props.selectedState);
const selectedCity = ref(props.selectedCity);

const countryChanged = async () => {
  selectedState.value = null;
  selectedCity.value = null;
  emits("updateCountry", selectedCountry.value);
};

const stateChanged = async () => {
  selectedCity.value = null;
  emits("updateState", selectedState.value);
};

// Watch for changes in selectedCountry
watch(selectedCountry, async (newCountry) => {
  await countryChanged(); // Update state and city when country changes
});

// Watch for changes in selectedState
watch(selectedState, async (newState) => {
  await stateChanged(); // Update city when state changes
});

// Emit city change
watch(selectedCity, (newValue) => {
  emits("updateCity", newValue);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
