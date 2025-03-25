import { ref, watchEffect } from "vue";


export function useLocationManager(initialCountry, initialState) {

  const { getCountries, getStates, getCities } = useDb();

  const countries = ref([]);
  const states = ref([]);
  const cities = ref([]);

  const selectedCountry = ref(initialCountry || null);
  const selectedState = ref(initialState || null);
  const selectedCity = ref(null);

  const fetchCountries = async () => {
    countries.value = await getCountries();
  };

  const fetchStates = async (country) => {
    //  console.log("fetchStates", country);
    states.value = await getStates(country);
  // console.log("fetchStates", data);
  };

  const fetchCities = async (state) => {
    // console.log("fetchCities", state);
    cities.value = await getCities(state);
    // console.log("fetchCities", data);
  };

  // Watch for changes in selected country and update states
  watchEffect(async () => {
    if (selectedCountry.value) {
      await fetchStates(selectedCountry.value);
      selectedState.value = null;
      cities.value = []; // Reset cities when country changes
    }
  });

  // Watch for changes in selected state and update cities
  watchEffect(async () => {
    if (selectedState.value) {
      await fetchCities(selectedState.value);
      selectedCity.value = null;
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
  };
}
