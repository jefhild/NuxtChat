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

export function useBlockedProfiles(userId: string) {
  const blockedProfiles = ref<Profile[]>([]);
  const client = useSupabaseClient();

  const fetchBlockedProfiles = async () => {
    if (userId) {
      const { data, error } = await client.rpc("get_blocked_profiles", {
        blocker_id: userId,
      });

      if (error) {
        console.error("Error fetching blocked profiles:", error);
      } else {
        blockedProfiles.value = data as Profile[];
      }
    }
  };

  // Method to unblock a user directly using Supabase's client
  const unblockUser = async (blockedUserId: string) => {
    if (userId) {
      const { error } = await client
        .from("blocked_users")
        .delete()
        .eq("user_id", userId)
        .eq("blocked_user_id", blockedUserId); // Use blocked_user_id instead of profile_id

      if (error) {
        console.error("Error unblocking user:", error);
      } else {
        // Remove the unblocked profile from the list using user_id
        blockedProfiles.value = blockedProfiles.value.filter(
          (profile) => profile.user_id !== blockedUserId
        );
      }
    }
  };

  // Fetch profiles initially when the composable is used
  fetchBlockedProfiles();

  return {
    blockedProfiles,
    fetchBlockedProfiles,
    unblockUser, // Expose the unblock method
  };
}
