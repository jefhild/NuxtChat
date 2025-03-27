// composables/useFetchOnlineUsers.js

export function useFetchOfflineUsers(user) {
  const { getOfflineProfiles } = useDb();

  // Reactive states
  const offlineData = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOfflineUsers = async (filters) => {
    const { gender_id, age_range } = filters;
    // console.log("Fetching online users with filters:", filters); // Debug log
    loading.value = true; // Set loading state to true

    // console.log("User ID:", user.value?.id); // Debug log
    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age = age_range && age_range[1] !== undefined ? age_range[1] : 35; // Default max_age to 100

    const {data, errorDb} = await getOfflineProfiles(user.value?.id, gender_id, min_age, max_age);

    loading.value = false; // Reset loading state after the fetch

    data ? offlineData.value = data : offlineData.value = [];
    errorDb ? error.value = errorDb : error.value = null;

  };

  // Return reactive states and methods
  return {
    offlineData,
    fetchOfflineUsers,
  };
}
