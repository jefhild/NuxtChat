// composables/useFetchOnlineUsers.js
export function useFetchOnlineUsers() {
  const supabase = useSupabaseClient();
  const imchattyId = "a3962087-516b-48df-a3ff-3b070406d832"; // Replace with actual ID or a config value

  const { getUsersFromIds } = useDb();
  // Reactive states
  const arrayOnlineUsers = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOnlineUsers = async (filters, arrayOfUserIds, userId) => {
    const {
      gender_id,
      age_range,
      is_anonymous,
      interests,
      country_id,
      status_id,
    } = filters;

    // console.log("Fetching online users with filters:", filters); // Debug log
    loading.value = true; // Set loading state to true
    // console.log("User ID:", user.value?.id); // Debug log

    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age =
      age_range && age_range[1] !== undefined ? age_range[1] : 100; // Default max_age to 100

    // console.log("Age Range: ", min_age, max_age); // Debug log

    // const { data, errorDb } = await getUsersFromIds(
    //   arrayOfUserIds,
    //   gender_id,
    //   min_age,
    //   max_age,
    //   is_anonymous,
    //   interests,
    //   country_id,
    //   status_id,
    //   userId
    // );

    let data, errorDb;
    const result = await getUsersFromIds(
      arrayOfUserIds,
      gender_id,
      min_age,
      max_age,
      is_anonymous,
      interests,
      country_id,
      status_id,
      userId
    );
    if (Array.isArray(result)) {
      data = result; // fallback case
      errorDb = null;
    } else {
      data = result.data;
      errorDb = result.error;
    }

    loading.value = false; // Reset loading state after the fetch

    if (errorDb) {
      error.value = errorDb;
      arrayOnlineUsers.value = [];
    } else {
      let combinedUsers = data;

      // Ensure imchatty is injected
      if (!data.some((user) => user.user_id === imchattyId)) {
        const { data: aiUserData, error: aiError } = await supabase
          .from("profiles") // match your actual table name
          .select("*")
          .eq("user_id", imchattyId)
          .single();

        if (!aiError && aiUserData) {
          combinedUsers = [aiUserData, ...data];
        } else {
          console.error("Failed to fetch imchatty:", aiError?.message);
        }
      }

      arrayOnlineUsers.value = combinedUsers;
      // console.log("Online users (with imchatty):", arrayOnlineUsers.value);
    }

    // console.log("Fetched online users:", arrayOnlineUsers.value); // Debug log
  };

  // Return reactive states and methods
  return {
    arrayOnlineUsers,
    fetchOnlineUsers,
  };
}
