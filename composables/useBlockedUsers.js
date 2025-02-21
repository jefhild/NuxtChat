export function useBlockedUsers(user) {
  const supabase = useSupabaseClient();
  const blockedUsers = ref([]);

  const loadBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_user_id")
        .eq("user_id", user.value.id);

      if (error) throw error;

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
