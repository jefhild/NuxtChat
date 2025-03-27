import { ref } from "vue";

interface Profile {
  profile_id: string;
  user_id: string;
  displayname: string;
  tagline: string;
  avatar_url: string | null;
  gender_id: number;
  age: number;
  country: string;
  country_emoji: string;
}

export function useFavorites(userId: string) {
  
  const favoriteProfiles = ref<Profile[]>([]);
  const { getUserFavoriteProfiles, deleteFavorite } = useDb();

  const fetchFavorites = async () => {
    if (userId) {
      const data = await getUserFavoriteProfiles(userId);

      if (data) {
        favoriteProfiles.value = data as Profile[];
      }
    }
  };

  // Method to unblock a user directly using Supabase's client
  const unfavoriteUser = async (favoriteUserId: string) => {
    if (userId) {
      const error = await deleteFavorite(userId, favoriteUserId);

      if (!error) {
        // Remove the unblocked profile from the list using user_id
        favoriteProfiles.value = favoriteProfiles.value.filter(
          (profile) => profile.user_id !== favoriteUserId
        );
      }
    }
  };

  // Fetch profiles initially when the composable is used
  fetchFavorites();

  return {
    favoriteProfiles,
    fetchFavorites,
    unfavoriteUser, // Expose the unblock method
  };
}
