export function useBlockedUsers(user) {
  const { getUserBlockedProfiles } = useDb();
  const blockedUsers = ref([]);

  const loadBlockedUsers = async () => {
    try {
      const data = await getUserBlockedProfiles(user.value.id);

      blockedUsers.value = data.map((item) => item.blocked_user_id);
      // console.log("Blocked users:", blockedUsers.value);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  };

  // Just return the state and function without calling `onMounted`
  return {
    blockedUsers,
    loadBlockedUsers,
  };
}
