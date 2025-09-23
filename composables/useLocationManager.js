import { ref, watchEffect, onMounted, computed } from "vue";
import { useDb } from "@/composables/useDB";

export function useLocationManager(initialCountry, initialState, initialCity) {
  const { getCountries, getStatesFromCountryId, getCitiesFromStateId } =
    useDb();

  const countries = ref([]);
  const states = ref([]);
  const cities = ref([]);

  const selectedCountry = ref(initialCountry || null);
  const selectedState = ref(initialState || null);
  const selectedCity = ref(initialCity || null);

  const loadingStates = ref(false);
  const loadingCities = ref(false);

  const fetchCountries = async () => {
    countries.value = await getCountries();
  };

  const fetchStates = async (countryId) => {
    loadingStates.value = true;
    states.value = await getStatesFromCountryId(countryId);
    loadingStates.value = false;
  };

  const fetchCities = async (stateId) => {
    loadingCities.value = true;
    cities.value = await getCitiesFromStateId(stateId);
    loadingCities.value = false;
  };

  // Load countries on mount
  onMounted(async () => {
    await fetchCountries();

    if (selectedCountry.value) {
      await fetchStates(selectedCountry.value);
    }

    if (selectedState.value) {
      await fetchCities(selectedState.value);
    }
  });

  // Watch for changes in selected country and update states
  watch(selectedCountry, async (newCountry) => {
    if (newCountry) {
      await fetchStates(newCountry);

      const valid = states.value.find((s) => s.id === selectedState.value);
      selectedState.value = valid ? selectedState.value : null;
      cities.value = [];
    }
  });

  // Watch for changes in selected state and update cities
  watch(selectedState, async (newState) => {
    if (newState) {
      await fetchCities(newState);

      const valid = cities.value.find((c) => c.id === selectedCity.value);
      selectedCity.value = valid ? selectedCity.value : null;
    }
  });

  watch(selectedState, async (newState) => {
    // console.log("[watch:selectedState] →", newState);
    if (newState) {
      await fetchCities(newState);
      // console.log("[cities]", cities.value);
      const valid = cities.value.find((c) => c.id === selectedCity.value);
      // console.log("[valid selectedCity match]", valid);
      selectedCity.value = valid ? selectedCity.value : null;
    }
  });

  return {
    countries,
    states,
    cities,
    selectedCountry,
    selectedState,
    selectedCity,
    fetchCountries,
    fetchStates,
    fetchCities,
    loadingStates,
    loadingCities,

    locationProps: computed(() => ({
      countries: countries.value,
      states: states.value,
      cities: cities.value,
      selectedCountry: selectedCountry.value,
      selectedState: selectedState.value,
      selectedCity: selectedCity.value,
    })),
  };
}
