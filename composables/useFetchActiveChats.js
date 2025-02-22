// composables/useFetchActiveChats.js

export function useFetchActiveChats(user) {
  const supabase = useSupabaseClient();
  // Reactive states
  const activeChatsData = ref([]);
  const error = ref(null);

  // Method to fetch active chats
  const fetchActiveChats = async () => {
    // loading.value = true; // Set loading state to true

    const response = await supabase.rpc("fetch_active_chats", {
      logged_in_user_id: user.value?.id,
    });

    // loading.value = false; // Reset loading state after the fetch

    if (response.error) {
      console.error("Error fetching active chats:", response.error);
      error.value = response.error;
      activeChatsData.value = []; // Clear active chats in case of error
    } else {
      // Sort active chats so that users with unread messages are at the top
      const sortedData = response.data.sort(
        (a, b) => b.unread_count - a.unread_count
      );
      activeChatsData.value = sortedData; // Set the sorted data to activeChats
      // console.log("Active chats:", sortedData);
    }
  };

  // Return reactive states and methods
  return {
    activeChatsData,
    fetchActiveChats,
  };
}
