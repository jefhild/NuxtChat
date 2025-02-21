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
  const client = useSupabaseClient();

  const fetchFavorites = async () => {
    if (userId) {
      const { data, error } = await client.rpc("get_favorite_profiles", {
        current_user_id: userId,
      });

      if (error) {
        console.error("Error fetching blocked profiles:", error);
      } else {
        favoriteProfiles.value = data as Profile[];
      }
    }
  };

  // Method to unblock a user directly using Supabase's client
  const unfavoriteUser = async (favoriteUserId: string) => {
    if (userId) {
      const { error } = await client
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("favorite_user_id", favoriteUserId); // Use blocked_user_id instead of profile_id

      if (error) {
        console.error("Error unblocking user:", error);
      } else {
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
