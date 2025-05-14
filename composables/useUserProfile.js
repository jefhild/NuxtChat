import { ref } from "vue";

export function useUserProfile() {
  const profile = ref(null);
  const error = ref(null); // Also track errors
  const { getUserProfileFunctionFromId, getUserProfileFromSlug } = useDb();

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

  const fetchUserProfileFromSlug = async (slug) => {
    if (!slug) {
      error.value = "slug is required";
      console.error("fetchUserProfileFromSlug error:slug is required.");
      return null; // Return null if no displayName is provided
    }

    const data = await getUserProfileFromSlug(slug);
    // console.log("Fetched data from slug:", slug, data); // Debugging log

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

  return { profile, fetchUserProfile, fetchUserProfileFromSlug, error };
}
