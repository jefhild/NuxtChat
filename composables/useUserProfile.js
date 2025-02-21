import { ref } from "vue";

export function useUserProfile() {
  const profile = ref(null);
  const error = ref(null); // Also track errors
  const supabase = useSupabaseClient(); // Ensure Supabase client is initialized

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      error.value = "User ID is required";
      console.error("fetchUserProfile error: User ID is required.");
      return null; // Return null if no userId is provided
    }

    const { data, error: supabaseError } = await supabase.rpc(
      "get_user_profile",
      {
        p_user_id: userId,
      }
    );

    if (supabaseError) {
      console.error(
        "Error fetching user profile with RPC:",
        supabaseError.message
      );
      error.value = supabaseError.message;
      return null; // Return null in case of error
    }

    if (data) {
      profile.value = data[0];
      return data[0]; // Return the fetched profile
    }

    return null; // In case data is undefined or empty
  };

  return { profile, fetchUserProfile, error };
}
