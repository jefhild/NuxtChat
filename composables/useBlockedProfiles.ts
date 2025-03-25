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
  const { getBlockedProfiles, unblockUser } = useDb();

  const fetchBlockedProfiles = async () => {
    if (userId) {
      const data = await getBlockedProfiles(userId);

      if (data) {
        blockedProfiles.value = data as Profile[];
      }
    }
  };

  // Method to unblock a user directly using Supabase's client
  const unblockAUser = async (blockedUserId: string) => {
    if (userId) {
      const error  = await unblockUser(userId, blockedUserId);

      if (!error) {
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
    unblockAUser, // Expose the unblock method
  };
}
