// composables/useFetchProfiles.ts
const { getRegisteredUsersIds } = useDb();

// This is your function to fetch profiles
export async function fetchProfiles() {
  try {
    const { data: profiles, error } = await getRegisteredUsersIds();

    if (error) throw error;

    return profiles;
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
}
