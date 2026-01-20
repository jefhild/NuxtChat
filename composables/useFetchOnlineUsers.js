// composables/useFetchOnlineUsers.js
export function useFetchOnlineUsers() {
  // const supabase = getClient()
  const supabase = useSupabaseClient();
  const imchattyId = "a3962087-516b-48df-a3ff-3b070406d832"; // Replace with actual ID or a config value

  const { getUsersFromIds, getProfileTranslationsForUsers } = useDb();
  // Reactive states
  const arrayOnlineUsers = ref([]);
  const error = ref(null);
  const loading = ref(false);

  // Method to fetch online users
  const fetchOnlineUsers = async (filters, arrayOfUserIds = [], userId) => {
    console.log("[fetchOnlineUsers] called with presenceIds:", arrayOfUserIds);
    console.log("[fetchOnlineUsers] filters:", filters);
    console.log("[fetchOnlineUsers] current userId:", userId);

    const {
      gender_id,
      age_range,
      is_anonymous,
      interests,
      country_id,
      status_id,
    } = filters;

    loading.value = true;

    const min_age = age_range?.[0] ?? 18;
    const max_age = age_range?.[1] ?? 100;

    let combinedUsers = [];

    if (arrayOfUserIds.length) {
      if (!arrayOfUserIds.length) {
        console.warn(
          "[fetchOnlineUsers] No presence IDs provided. Skipping getUsersFromIds"
        );
      }
      const result = await getUsersFromIds(
        arrayOfUserIds,
        gender_id,
        min_age,
        max_age,
        is_anonymous,
        interests,
        country_id,
        status_id,
        userId
      );

      const data = Array.isArray(result) ? result : result.data;

      const errorDb = Array.isArray(result) ? null : result.error;

      if (errorDb) {
        error.value = errorDb;
      }

      combinedUsers = Array.isArray(data) ? data : [];
    }

    // Always try to inject imchatty
    const { data: aiUserData, error: aiError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", imchattyId)
      .single();

    if (!aiError && aiUserData) {
      console.log(
        "[injectImchatty] Successfully fetched imchatty profile:",
        aiUserData
      );

      const exists = combinedUsers.some((user) => user.user_id === imchattyId);
      console.log(
        `[injectImchatty] Is imchatty already in combinedUsers?`,
        exists
      );

      if (!exists) {
        console.log("[injectImchatty] Injecting imchatty into combinedUsers");
        combinedUsers.unshift(aiUserData);
      }
    } else {
      console.error(
        "[injectImchatty] Failed to fetch imchatty:",
        aiError?.message
      );
    }
    console.log(
      "[fetchOnlineUsers] Final online users list:",
      combinedUsers.map((u) => u.displayname || u.user_id)
    );
    const userIds = combinedUsers
      .map((u) => u?.user_id)
      .filter((id) => id);
    if (userIds.length) {
      try {
        const { data: translations } = await getProfileTranslationsForUsers(
          userIds
        );
        const map = new Map();
        (translations || []).forEach((row) => {
          const key = row.user_id;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(row);
        });
        combinedUsers = combinedUsers.map((u) => ({
          ...u,
          profile_translations: map.get(u.user_id) || [],
        }));
      } catch (e) {
        console.warn("[fetchOnlineUsers] translations failed:", e);
      }
    }

    arrayOnlineUsers.value = combinedUsers;
    loading.value = false;
  };

  // Return reactive states and methods
  return {
    arrayOnlineUsers,
    fetchOnlineUsers,
  };
}
