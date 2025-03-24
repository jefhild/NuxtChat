// composables/useFetchOnlineUsers.js

export function useFetchOnlineUsers(user) {
  const supabase = useSupabaseClient();

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

    const response = await supabase.rpc("fetch_online_profiles", {
      logged_in_user_id: user.value?.id,
      gender_filter: gender_id,
      min_age: min_age,
      max_age: max_age,
    });

    loading.value = false; // Reset loading state after the fetch

    if (response.error) {
      console.error("Error fetching online users:", response.error);
      error.value = response.error;
      onlineData.value = []; // Clear data in case of error
    } else {
      onlineData.value = response.data; // Set the fetched data
      // console.log("Fetched online users:", response.data); // Debug log
    }
  };

  // Return reactive states and methods
  return {
    onlineData,
    fetchOnlineUsers,
  };
}
