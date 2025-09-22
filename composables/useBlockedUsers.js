export function useBlockedUsers() {
  const { getUserBlockedProfiles } = useDb();
  const blockedUsers = ref([]);

  /**
   * Loads the list of user IDs that the given user has blocked.
   * @param {string|null} userId - The ID of the current user.
   */
  const loadBlockedUsers = async (userId) => {
    if (!userId) {
      console.warn("loadBlockedUsers called with null userId");
      return;
    }

    try {
      const data = await getUserBlockedProfiles(userId);
      blockedUsers.value = data.map((item) => item.blocked_user_id);
      // console.log("Blocked users:", blockedUsers.value);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  };

  return {
    blockedUsers,
    loadBlockedUsers,
  };
}
