import { ref, watchEffect } from "vue";


export function useLocationManager(initialCountry, initialState) {
  const supabase = useSupabaseClient();

  const countries = ref([]);
  const states = ref([]);
  const cities = ref([]);

  const selectedCountry = ref(initialCountry || null);
  const selectedState = ref(initialState || null);
  const selectedCity = ref(null);

  const fetchCountries = async () => {
    const { data, error } = await supabase.from("countries").select("*");
    if (error) throw error;
    countries.value = data;
  };

  const fetchStates = async (country) => {
    //  console.log("fetchStates", country);
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_name", country);
    if (error) throw error;
    states.value = data;
  // console.log("fetchStates", data);
  };

  const fetchCities = async (state) => {
    // console.log("fetchCities", state);
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("state_name", state);
    if (error) throw error;
    cities.value = data;
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
