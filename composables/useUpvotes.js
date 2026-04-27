import { ref, unref } from "vue";

// Remove the TypeScript interface, as it's not needed in JavaScript

export function useUpvotes(userId) {
  // Define a reactive reference to store the upvoted profiles
  const upvotedProfiles = ref([]);
  const upvotedMeProfiles = ref([]);

  const {
    deleteUpvoteFromUser,
  } = useDb();

  const resolveUserId = () => unref(userId);

  const fetchAllUpvotes = async () => {
    if (!resolveUserId()) {
      upvotedProfiles.value = [];
      upvotedMeProfiles.value = [];
      return { upvotedProfiles: [], upvotedMeProfiles: [] };
    }

    try {
      const data = await $fetch("/api/votes/settings");
      upvotedProfiles.value = Array.isArray(data?.upvotedProfiles)
        ? data.upvotedProfiles
        : [];
      upvotedMeProfiles.value = Array.isArray(data?.upvotedMeProfiles)
        ? data.upvotedMeProfiles
        : [];
      return data;
    } catch (error) {
      console.error("Failed to fetch upvote settings:", error);
      upvotedProfiles.value = [];
      upvotedMeProfiles.value = [];
      return { upvotedProfiles: [], upvotedMeProfiles: [] };
    }
  };

  const fetchUpvotes = async () => (await fetchAllUpvotes()).upvotedProfiles;

  const fetchMyUpvotes = async () => (await fetchAllUpvotes()).upvotedMeProfiles;

  // Function to remove a user from the upvoted profiles
  // const unupvoteUser = async (upvotedProfileId) => {
  //   if (userId) {
  //     // console.log("userId: ", userId, "profileId: ", upvotedProfileId)
  //     const error = await deleteUpvoteFromUser(userId, upvotedProfileId);
  //     // console.log("deleteUpvoteFromUser result:", error);

  //     if (!error) {
  //       upvotedProfiles.value = upvotedProfiles.value.filter(
  //         (profile) => profile.profile_id !== upvotedProfileId
  //       );
  //     }
  //   }
  // };
  const unupvoteUser = async (upvotedProfileId) => {
    console.log(
      "Attempting to unupvote, userId:",
      resolveUserId(),
      " profileId: ",
      upvotedProfileId
    );

    const { error, data } = await deleteUpvoteFromUser(
      resolveUserId(),
      upvotedProfileId
    );
    console.log("Supabase delete result:", { error, data });

    if (error) {
      console.error("Failed to delete upvote:", error.message);
    } else {
      upvotedProfiles.value = upvotedProfiles.value.filter(
        (profile) => profile.profile_id !== upvotedProfileId
      );
    }
  };

  // Return the reactive data and methods
  return {
    upvotedProfiles,
    upvotedMeProfiles,
    fetchAllUpvotes,
    fetchUpvotes,
    fetchMyUpvotes,
    unupvoteUser,
  };
}
