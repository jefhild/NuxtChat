// composables/useFetchActiveChats.js

export function useFetchActiveChats(user) {
  const { getActiveChats } = useDb();
  // Reactive states
  const activeChatsData = ref([]);
  const error = ref(null);

  // Method to fetch active chats
  const fetchActiveChats = async () => {
    // loading.value = true; // Set loading state to true

    const data = await getActiveChats(user.value?.id);
      

    // loading.value = false; // Reset loading state after the fetch

    if (data) {
      // Sort active chats so that users with unread messages are at the top
      const sortedData = data.sort(
        (a, b) => b.unread_count - a.unread_count
      );
      activeChatsData.value = sortedData; // Set the sorted data to activeChats
      // console.log("Active chats:", sortedData);
    } else {
      error.value = "Failed to fetch active chats";
      activeChatsData.value = []; // Clear active chats in case of error
    }
  };

  // Return reactive states and methods
  return {
    activeChatsData,
    fetchActiveChats,
  };
}
