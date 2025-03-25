import { ref } from "vue";

export function useUserProfile() {
  const profile = ref(null);
  const error = ref(null); // Also track errors
  const { getUserProfileFromId } = useDb();

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      error.value = "User ID is required";
      console.error("fetchUserProfile error: User ID is required.");
      return null; // Return null if no userId is provided
    }

    const data = await getUserProfileFromId(userId);

    if (data) {
      profile.value = data[0];
      return data[0]; // Return the fetched profile
    }else {
      error.value = "Error fetching user profile"
      return null; // Return null in case of error
    }

    return null; // In case data is undefined or empty
  };

  return { profile, fetchUserProfile, error };
}
