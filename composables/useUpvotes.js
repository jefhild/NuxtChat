import { ref } from "vue";

// Remove the TypeScript interface, as it's not needed in JavaScript

export function useUpvotes(userId) {
  // Define a reactive reference to store the upvoted profiles
  const upvotedProfiles = ref([]);
  const client = useSupabaseClient();

  // Function to fetch upvoted profiles from Supabase
  const fetchUpvotes = async () => {
    if (userId) {
      const { data, error } = await client.rpc("get_upvoted_profiles", {
        upvoter_id: userId,
      });

      if (error) {
        console.error("Error fetching upvoted profiles:", error);
      } else {
        upvotedProfiles.value = data; // Type assertion is not needed in JavaScript
        console.log("Upvoted profiles:", upvotedProfiles.value);
      }
    }
  };

  // Function to remove a user from the upvoted profiles
  const unupvoteUser = async (upvotedProfileId) => {
    if (userId) {
      const { error } = await client
        .from("votes")
        .delete()
        .eq("user_id", userId)
        .eq("profile_id", upvotedProfileId);

      if (error) {
        console.error("Error unblocking user:", error);
      } else {
        // Filter out the profile from the list using its ID
        upvotedProfiles.value = upvotedProfiles.value.filter(
          (profile) => profile.profile_id !== upvotedProfileId
        );
      }
    }
  };

  // Fetch profiles initially when the composable is used
  fetchUpvotes();

  // Return the reactive data and methods
  return {
    upvotedProfiles,
    fetchUpvotes,
    unupvoteUser,
  };
}
