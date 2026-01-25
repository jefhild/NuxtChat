// composables/useFetchProfiles.ts
// This is your function to fetch profiles
export async function fetchProfiles() {
  const { getRegisteredUsersIds } = useDb();
  try {
    const { data: profiles, error } = await getRegisteredUsersIds();

    if (error) throw error;

    return profiles;
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
}
