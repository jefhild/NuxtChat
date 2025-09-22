import { ref } from "vue";
import { useDb } from "@/composables/useDB";

export function useLookingFor() {
  const lookingForIcons = ref([]);
  const lookingForOptions = ref([]);
  const userLookingForIds = ref([]);

  const {
    getInterests,
    getInterestsIds,
    getInterestsIcons,
    insertUserInterest,
    deleteUserInterest,
  } = useDb();

  const fetchLookingForOptions = async () => {
    const { data, error } = await getInterests();
    if (error) {
      console.error("Error fetching looking for options:", error);
      return [];
    }
    lookingForOptions.value = data;
    return data;
  };

  const fetchUserLookingFor = async (userId) => {
    if (!userId || userId === "undefined") {
      console.warn("[useLookingFor] Invalid userId:", userId);
      return [];
    }

    const data = await getInterestsIds(userId);
    if (!Array.isArray(data)) {
      console.warn("userLookingFor is not an array:", data);
      return [];
    }

    const ids = data.map((item) => item.looking_for_id);
    userLookingForIds.value = ids;
    return ids;
  };

  const fetchUserLookingForIcons = async (userId) => {
    const userLookingFor = await getInterestsIds(userId);

    if (!Array.isArray(userLookingFor)) {
      console.warn("userLookingFor is not an array:", userLookingFor);
      return [];
    }

    const lookingForIds = userLookingFor.map((item) => item.looking_for_id);
    if (lookingForIds.length === 0) {
      lookingForIcons.value = [];
      return [];
    }

    const { data: iconData, error } = await getInterestsIcons(lookingForIds);
    if (error) {
      console.error("Error fetching icons:", error);
      return [];
    }

    lookingForIcons.value = iconData || [];
    return iconData;
  };

  const toggleLookingFor = async (userId, lookingForId, value) => {
    if (value) {
      if (!userLookingForIds.value.includes(lookingForId)) {
        userLookingForIds.value.push(lookingForId);
        const error = await insertUserInterest(userId, lookingForId);
        if (error) {
          console.error("Insert failed:", error);
          userLookingForIds.value = userLookingForIds.value.filter(
            (id) => id !== lookingForId
          );
        }
      }
    } else {
      userLookingForIds.value = userLookingForIds.value.filter(
        (id) => id !== lookingForId
      );
      const { error } = await deleteUserInterest(userId, lookingForId);
      if (error) {
        console.error("Delete failed:", error);
        userLookingForIds.value.push(lookingForId);
      }
    }
  };

  return {
    // reactive state
    lookingForIcons,
    lookingForOptions,
    userLookingForIds,

    // fetchers
    fetchLookingForOptions,
    fetchUserLookingFor,
    fetchUserLookingForIcons,

    // actions
    toggleLookingFor,
  };
}
