import { ref } from "vue";
import { useDb } from "@/composables/useDB";

export function useGeoLocationDefaults() {
  const userLocation = ref(null);
  const defaultCountryId = ref(null);
  const defaultStateId = ref(null);
  const defaultCityId = ref(null);
  const defaultIpId = ref(null); // Placeholder if you want to store IP 

  const getRawLocationData = async () => {
    try {
      const response = await $fetch("https://ipapi.co/json/");
      userLocation.value = response;
    } catch (error) {
      console.error("Error fetching IP location data:", error);
      userLocation.value = null;
    }
  };

  const resolveLocationIds = async () => {
    const {
      getCountryByIsoCode,
      getStateByCodeAndCountry,
      getCityByNameAndState,
    } = useDb();

    if (!userLocation.value) return;

    try {
      const { country_code, region_code, city} = userLocation.value;

      // Country
      const { data: country, error: countryError } = await getCountryByIsoCode(
        country_code
      );
      if (country && !countryError) {
        defaultCountryId.value = country.id;

        // State
        const { data: state, error: stateError } =
          await getStateByCodeAndCountry(region_code, country.id);
        if (state && !stateError) {
          defaultStateId.value = state.id;

          // City
          const { data: cityData, error: cityError } =
            await getCityByNameAndState(city, state.id);
          if (cityData && !cityError) {
            defaultCityId.value = cityData.id;
          }
        }

        defaultIpId.value = userLocation.value.ip;
        console.log("ipapi resolved: ip: ", defaultIpId.value)
      }
    } catch (err) {
      console.error("Failed resolving location IDs:", err);
    }
  };

  const getDefaults = async () => {
    await getRawLocationData();
    await resolveLocationIds();
    return {
      countryId: defaultCountryId.value,
      stateId: defaultStateId.value,
      cityId: defaultCityId.value,
      ip: defaultIpId.value,
    };
  };

  return {
    userLocation,
    defaultCountryId,
    defaultStateId,
    defaultCityId,
    getDefaults,
  };
}
