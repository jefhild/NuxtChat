// composables/useFetchOnlineUsers.js

export function useFetchOfflineUsers(user) {
  const { getRegisteredUsersIds, getUsersFromIds } = useDb();

  // Reactive states
  const arrayOfflineUsers = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOfflineUsers = async (filters, arrayOfOnlineUsersIds, userId) => {
    const { gender_id, age_range, is_anonymous, interests, country_id, status_id } = filters;


    // console.log("Fetching offline users with filters:", filters); // Debug log
    loading.value = true; // Set loading state to true

    // console.log("User ID:", user.value?.id); // Debug log
    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age = age_range && age_range[1] !== undefined ? age_range[1] : 100; // Default max_age to 100

    //Get all registered users
    const { data: dataReg } = await getRegisteredUsersIds();
    const allRegisteredUserIds = dataReg.map((u) => u.user_id);

    //Remove online users from the registered users = offline users
    const arrayOfOfflineUserIds = allRegisteredUserIds.filter(userId => !arrayOfOnlineUsersIds.includes(userId));

    const { data, errorDb } = await getUsersFromIds(arrayOfOfflineUserIds, gender_id, min_age, max_age, is_anonymous, interests, country_id, status_id, userId);

    // console.log("Fetched offline users:", data); // Debug log
    loading.value = false; // Reset loading state after the fetch

    if (errorDb)
    {
      error.value = errorDb;
      arrayOfflineUsers.value = [];
    }
    else
    {
      arrayOfflineUsers.value = data;
    }
  };

  // Return reactive states and methods
  return {
    arrayOfflineUsers,
    fetchOfflineUsers,
  };
}
