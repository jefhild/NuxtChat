// composables/useFetchOnlineUsers.js

import OnlineUsers from "~/components/OnlineUsers.vue";

export function useFetchOnlineUsers(user) {
  const { getOnlineProfiles } = useDb();
  // Reactive states
  const onlineData = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOnlineUsers = async (filters) => {
    const { gender_id, age_range } = filters;
    // console.log("Fetching online users with filters:", filters); // Debug log
    loading.value = true; // Set loading state to true
    // console.log("User ID:", user.value?.id); // Debug log

    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age = age_range && age_range[1] !== undefined ? age_range[1] : 100; // Default max_age to 100

    // console.log("Age Range: ", min_age, max_age); // Debug log

    const { data, errorDb } = await getOnlineProfiles(user.value?.id, gender_id, min_age, max_age);

    loading.value = false; // Reset loading state after the fetch

    if(errorDb)
    {
      error.value = errorDb;
      onlineData.value = [];
    }
    else
    {
      onlineData.value = data;
    }
      
  };

  // Return reactive states and methods
  return {
    onlineData,
    fetchOnlineUsers,
  };
}
