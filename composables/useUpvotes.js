import { ref } from "vue";

// Remove the TypeScript interface, as it's not needed in JavaScript

export function useUpvotes(userId) {
  // Define a reactive reference to store the upvoted profiles
  const upvotedProfiles = ref([]);
  const { getUserUpvotedProfiles, deleteUpvoteFromUser } = useDb();

  // Function to fetch upvoted profiles from db
  const fetchUpvotes = async () => {
    if (userId) {
      const data = getUserUpvotedProfiles(userId);

      if (data){
        upvotedProfiles.value = data; // Type assertion is not needed in JavaScript
        console.log("Upvoted profiles:", upvotedProfiles.value);
      }
    }
  };

  // Function to remove a user from the upvoted profiles
  const unupvoteUser = async (upvotedProfileId) => {
    if (userId) {
      const error = await deleteUpvoteFromUser(userId, upvotedProfileId);

      if (!error) {
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
