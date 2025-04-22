import { ref } from "vue";

export function useUserProfile() {
  const profile = ref(null);
  const error = ref(null); // Also track errors
  const { getUserProfileFunctionFromId, getUserProfileFromDisplayName } = useDb();

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      error.value = "User ID is required";
      console.error("fetchUserProfile error: User ID is required.");
      return null; // Return null if no userId is provided
    }

    const data = await getUserProfileFunctionFromId(userId);

    if (data) {
      profile.value = data[0];
      return data[0]; // Return the fetched profile
    }else {
      error.value = "Error fetching user profile"
      return null; // Return null in case of error
    }

    return null; // In case data is undefined or empty
  };

  const fetchUserProfileFromDisplayName = async (displayName) => {
    if(!displayName) {
      error.value = "Display name is required";
      console.error("fetchUserProfileFromDisplayName error: Display name is required.");
      return null; // Return null if no displayName is provided
    }

    const data = await getUserProfileFromDisplayName(displayName);
    // console.log("Fetched data from display name:", data); // Debugging log

    if (data)
    {
      profile.value = data[0];
      return data[0]; // Return the fetched profile
    } else
    {
      error.value = "Error fetching user profile"
      return null; // Return null in case of error
    }

    return null;
  };

  return { profile, fetchUserProfile, fetchUserProfileFromDisplayName, error };
}
