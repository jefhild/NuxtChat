// composables/useFetchActiveChats.js

export function useFetchActiveChats(user) {
  const { getActiveChats } = useDb();
  // Reactive states
  const activeChatsData = ref([]);
  const error = ref(null);

  // Method to fetch active chats
  const fetchActiveChats = async (filters) => {
    // console.log("Fetching online users with filters:", filters); // Debug log

    const { gender_id, age_range } = filters;
    // console.log("User ID:", user.value?.id); // Debug log

    // Set default values for min_age and max_age if they are undefined
    const min_age = age_range && age_range[0] !== undefined ? age_range[0] : 18; // Default min_age to 18
    const max_age = age_range && age_range[1] !== undefined ? age_range[1] : 80; // Default max_age to 100
    // loading.value = true; // Set loading state to true

    const data = await getActiveChats(user.value?.id, gender_id, min_age, max_age);

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
