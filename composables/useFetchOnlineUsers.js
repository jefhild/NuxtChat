// composables/useFetchOnlineUsers.js
export function useFetchOnlineUsers() {
  const { getUsersFromIds } = useDb();
  // Reactive states
  const arrayOnlineUsers = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOnlineUsers = async (filters, arrayOfUserIds, userId) => {
    const { gender_id, age_range, is_anonymous, interests } = filters;
    // console.log("Fetching online users with filters:", filters); // Debug log
    loading.value = true; // Set loading state to true
    // console.log("User ID:", user.value?.id); // Debug log

    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age = age_range && age_range[1] !== undefined ? age_range[1] : 100; // Default max_age to 100

    // console.log("Age Range: ", min_age, max_age); // Debug log


    const { data, errorDb } = await getUsersFromIds(arrayOfUserIds, gender_id, min_age, max_age, is_anonymous, interests, userId);

    loading.value = false; // Reset loading state after the fetch

    if(errorDb)
    {
      error.value = errorDb;
      arrayOnlineUsers.value = [];
    }
    else
    {
      arrayOnlineUsers.value = data;
    }

    // console.log("Fetched online users:", arrayOnlineUsers.value); // Debug log
    
      
  };

  // Return reactive states and methods
  return {
    arrayOnlineUsers,
    fetchOnlineUsers,
  };
}
