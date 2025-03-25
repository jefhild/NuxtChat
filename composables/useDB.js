export const useDb = () =>
{
  const supabase = useSupabaseClient();

  /*---------------*/
  /* Get functions */
  /*---------------*/

  const getCountries = async () => {
    const { data, error } = await supabase.from("countries").select("*");
    if (error) throw error;

    return data;
  };


  const getStates = async(country) => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_name", country);

    if (error) throw error;
    return data;
  };


  const getCities = async (state) => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("state_name", state);
    if (error) throw error;

    return data;
  };

  const getUserStatus = async (userId) => {
    const { data, error } = await supabase
      .from("presence")
      .select("status")
      .eq("user_id", userId)
      .single();

    if (error)
    {
      console.error("Error fetching status:", error);
    }

    return data;
  };

  const getStatuses = async () =>{
    const { data, error } = await supabase.from("status").select("*");
    if (error) throw error;

    return data;
  };

  const getGenders = async () =>{
    const { data, error } = await supabase.from("genders").select("*");
    if (error) throw error;
    return data;
  };

  const getLookingForId = async (name) =>
  {
    const { data, error } = await supabase
      .from("looking_for")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (error)
    {
      console.error("Error fetching looking for ID:", error);
      return null;
    }

    return data.id;
  };

  const getMessagesBetweenUsers = async (senderUserId, receiverUserId) =>{
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, sender_id, receiver_id, content, created_at, read, profiles!messages_sender_id_fkey(displayname)"
      )
      .or(
        `and(sender_id.eq.${senderUserId},receiver_id.eq.${receiverUserId}),and(sender_id.eq.${receiverUserId},receiver_id.eq.${senderUserId})`
      );

    if (error) throw error;
    return data;
  };

  const getAIInteractionCount = async (senderUserId) => {
    const { data: interactionData, error: updateError } = await supabase
      .from("user_ai_interactions")
      .select("interaction_count")
      .eq("user_id", senderUserId)
      .single();

    if (updateError)
    {
      console.error(
        "Error fetching interaction count for update:",
        updateError
      );
    }
    return interactionData;
  };

  const getCurrentAIInteractionCount = async (senderUserId) => {
    const { data, error } = await supabase
      .from("user_ai_interactions")
      .select("interaction_count")
      .eq("user_id", senderUserId)
      .single();

      return {data, error};
  };

  const getInterests = async () => {
    const { data , error } = await supabase
      .from("looking_for")
      .select("*");

    if (error)
    {
      console.error("Error fetching looking for options:", error);
    }

    return { data, error };
  };

  const getInterestsIds = async (userId) => {
    const { data, error } = await supabase
      .from("user_looking_for")
      .select("looking_for_id")
      .eq("user_id", userId);

    if (error){
      console.error("Error fetching user interests ids:", error);
    }

      return { data, error};
  };

  const getDescriptions = async () => {
    const { data, error } = await supabase
      .from("descriptions")
      .select("*");

    if (error)
    {
      console.error("Error fetching descriptions:", error);
    }

    return { data, error };
  }

  const getInterestsIcons = async (lookingForIds) => {
    const { data, error } = await supabase
        .from("looking_for")
        .select("id, name, icon, tooltip, color")
        .in("id", lookingForIds);

      if (error)
      {
        console.error("Error fetching interests icons:", error);
      }

      return { data, error };
  };

  const getUserFromName = async (displayName) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("displayname", displayName)
      .maybeSingle();

    if (error)
    {
      throw error;
    }

    return data;
  };

  const getUserProfileFromId = async (userId) => {
    const { data, error } = await supabase.rpc(
      "get_user_profile",
      {
        p_user_id: userId,
      }
    );

    if (error) {
        console.error(
          "Error fetching user profile with RPC:",
          supabaseError.message
        );
    }

    return data;
  };

  const getUserProfilePhoto = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

      return { data, error};
  };

  const getRegisteredUsersIds = async () => {
    const { data , error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("avatar_url", "")
      .neq("provider", "anonymous");

      return { data, error};
  };  

  const getAllUsersIdsWithoutAvatar = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("avatar_url", "");

    return { data, error };
  };

  const getRecentFemales = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_recent_females", {
      profile_limit: profileLimit,
    });

    if (error)
    {
      console.error("Error fetching popular profiles:", error);
    } 

    return data;
  };

  const getRecentMales = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_recent_males", {
      profile_limit: profileLimit,
    });

    if (error)
    {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getAiProfiles = async (userId,genderId, minAge, maxAge) => {
    const {data, error} = await supabase.rpc("fetch_ai_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
      is_ai_filter: true,
    });

    if (error)
    {
      console.error("Error fetching ai profiles:", error);
    }

    return {data, error};
  };

  const getOfflineProfiles = async (userId, genderId, minAge, maxAge) =>
  {
    const {data, error} = await supabase.rpc("fetch_offline_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
      is_ai_filter: false,
    });

    if (error)
    {
      console.error("Error fetching offline profiles:", error);
    }

    return {data, error} ;
  };

  const getOnlineProfiles = async (userId, genderId, minAge, maxAge) => {
    const {data, error} = await supabase.rpc("fetch_online_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
    });

    if (error)
    {
      console.error("Error fetching online profiles:", error);
    }

    return {data, error};
  };


  const getOnlineUserCount = async () => {
    const { count, error: supabaseError } = await supabase
      .from("presence") // Fixed table name
      .select("*", { count: "exact", head: true })
      .eq("status", "online"); // Fixed column name and value

    if (supabaseError) throw supabaseError;

    return count;
  };

  const getMostPopularProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_most_popular_profiles", { profile_limit: profileLimit });
    if (error)
    {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getRecentProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_recent_profiles", { profile_limit: profileLimit });

    if (error)
    {
      console.error("Error fetching popular profiles:", error);
    } 

    return data;
  };

  const getMostPopularAiProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_most_popular_ai_profiles", {
      profile_limit: profileLimit,
    });
    if (error)
    {
      console.error("Error fetching popular ai profiles:", error);
    }

    return data;
  };

  const getBlockedProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_blocked_profiles", {
      blocker_id: userId,
    });

    if (error)
    {
      console.error("Error fetching blocked profiles:", error);
    }

    return data;
  };

  const getUserBlockedProfiles = async (userId) => {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", userId);

    if (error) throw error;

    return data;
  };

  const getCountUserFavorites = async (userId, favoriteUserId) => {
    const { count } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);

    return count;
  };

  const getUserFavoriteProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_favorite_profiles", {
      current_user_id: userId,
    });

    if (error)
    {
      console.error("Error fetching favorite profiles:", error);
    } 

    return data;
  };

  const getActiveChats = async (userId) => {
    const {data, error} = await supabase.rpc("fetch_active_chats", {
      logged_in_user_id: userId,
    });

    if (error)
    {
      console.error("Error fetching active chats:", error);
    }

    return data;
  };

  const getUserUpvotedProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_upvoted_profiles", {
      upvoter_id: userId,
    });

    if (error)
    {
      console.error("Error fetching upvoted profiles:", error);
    }

    return data;
  };


  /*------------------*/
  /* Update functions */
  /*------------------*/

  const updateBio = async (bio, userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio,
      })
      .eq("user_id", userId);

    if (error) throw error;
  };

  const updateStatus = async (userId, status) => {
    console.log("Updating status:", status);
    const { error } = await supabase
      .from("presence")
      .upsert({ user_id: userId, status: status ? "online" : "offline" });

    if (error)
    {
      console.error("Error updating status:", error);
    }
  };

  const updateGender = async (genderID, userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ gender_id: genderID })
      .eq("user_id", userId);

    if (error)
    {
      console.error("Error updating gender in Supabase:", error);
    }
  }

  const updateTagline = async (tagline, userId) =>
  {
    console.log("Updating tagline:", tagline);
    console.log("User ID:", userId);

    const { data, error } = await supabase
      .from('profiles')
      .update({ tagline })
      .eq('user_id', userId);

    if (error)
    {
      console.error("Error updating tagline:", error);
    }
  };

  const updateProfilePhoto = async (avatarUrl, userId) => {
    const error = await supabase
      .from < Profile > ("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", userId);

    return error;
  };

  const updateSiteURL = async (siteUrl, userId) =>
  {
    console.log("Updating url:", siteUrl);
    console.log("User ID:", userId);
    const { error } = await supabase
      .from('profiles')
      .update({ site_url: siteUrl })
      .eq('user_id', userId);

    if (error) throw error;
  };

  const updateInterests = async (interestsArray,userId) =>
  {
    for (const interest of interestsArray)
    {
      const id = await getLookingForId(interest.trim());
      const { data, error } = await supabase
        .from("user_looking_for")
        .insert({ user_id: userId, looking_for_id: id });

      if (error) { console.error("Error inserting user looking for:", error); }
    }
  };

  const updateProfile = async (
    id,
    displayname,
    tagline,
    gender_id,
    status_id,
    age,
    bio,
    country_id,
    state_id,
    city_id,
    avatar_url,
    site_url
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        displayname: displayname,
        tagline: tagline,
        gender_id: gender_id,
        status_id: status_id,
        age: age,
        bio: bio,
        country_id: country_id,
        state_id: state_id,
        city_id: city_id,
        avatar_url: avatar_url,
        site_url: site_url,
      })
      .eq("user_id", id);
    if (error) throw error;
  };

  const updateMessagesAsRead = async(receiverUserId, senderUserId) => {
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", receiverUserId)
      .eq("sender_id", senderUserId)
      .eq("read", false); // Ensures only unread messages are affected

    if (error) throw error;
  };

  const updateAIInteractionCount = async (senderUserId, interactionCount) => {
    const { error: updateInteractionError } = await supabase
      .from("user_ai_interactions")
      .update({ interaction_count: interactionCount })
      .eq("user_id", senderUserId);

    if (updateInteractionError)
    {
      console.error(
        "Error updating interaction count:",
        updateInteractionError
      );
    }
  };


  /*------------------*/
  /* Insert functions */
  /*------------------*/

  const insertMessage = async (receiverId, senderId, message) =>{
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: message,
      })
      .select("*");

    if (error)
    {
      console.error("Error sending message:", error);
    } 
    return data;
  }

  const insertFeedback = async (feedback, userId) =>
  {
    const { error } = await supabase
      .from("feedback")
      .insert({ feedback_text: feedback });

    if (error)
    {
      console.error("Error inserting feedback:", error);
    }
  };

  const insertBlockedUser = async (userId, blockedUserId) =>
  {
    const { error } = await supabase.from("blocked_users").insert({
      user_id: userId,
      blocked_user_id: blockedUserId,
    });

    if (error)
    {
      console.error("Error blocking user:", error);
    } else
    {
      console.log("User blocked");
    }

    return error;
  };

  const insertInteractionCount = async (senderUserId, interactionCount) => {
    const { insertError } = await supabase
      .from("user_ai_interactions")
      .insert({
        user_id: senderUserId,
        interaction_count: interactionCount,
      });
    return insertError;
  };

  const insertFavorite = async (userId, favoriteUserId) =>{
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, favorite_user_id: favoriteUserId });

    if (error)
    {
      console.error("Error inserting favorite:", error);
    }

    return error;
  };

  const insertUserInterest = async ( userId, interestId) => {
    const { error } = await supabase.from("user_looking_for").insert({
      user_id: userId,
      looking_for_id: interestId,
    });

    if (error)
    {
      console.error("Error inserting user interest:", error);
    }

    return error;
  };


  /*------------------*/
  /* Delete functions */
  /*------------------*/

  const deleteChatWithUser = async (userId, userToDeleteId) =>{
    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(receiver_id.eq.${userToDeleteId},sender_id.eq.${userId}),and(receiver_id.eq.${userId},sender_id.eq.${userToDeleteId})`
      );

    if (error && error.status !== 204)
    {
      console.error("Error deleting chat:", error);
    }

    return error;
  };

  const deleteFavorite = async (userId, favoriteUserId) =>{
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);

    if(error && error.status !== 204)
    {
      console.error("Error deleting favorite:", error);
    }

    return error;
  };

  const deleteUserInterest = async (userId, interestId) => {
    const error = await supabase.from("user_looking_for").delete().match({
      user_id: userId,
      looking_for_id: interestId,
    });

    if (error && error.status !== 204)
    {
      console.error("Error deleting user interest:", error);
    }

    return error;
  };

  const unblockUser = async (userId, blockedUserId) => {
    const error  = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId)
      .eq("blocked_user_id", blockedUserId)

    if (error && error.status !== 204)
    {
      console.error("Error unblocking user:", error);
    }

    return error;
  };

  const deleteUpvoteFromUser = async (userId, upvotedProfileId) => {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", userId)
      .eq("profile_id", upvotedProfileId);

    if (error && error.status !== 204)
    {
      console.error("Error unblocking user:", error);
    }

    return error;
  };


  /*-----------------*/
  /* Other Functions */
  /*-----------------*/

  const checkDisplayNameExists = async (displayName) =>
  {
    const { data, error } = await supabase
      .from("profiles")
      .select("displayname", { head: false })
      .eq("displayname", displayName)
      .limit(1)
      .maybeSingle();

    console.log("Checking displayname:", data);

    if (error && error.code !== "PGRST116")
    {
      console.error("Error checking displayname:", error);
    }

    return { data, error };
  };

  const hasInterests = async (userId) =>
  {
    const { data, error } = await supabase
      .from("user_looking_for")
      .select("*")
      .eq("user_id", userId);

    if (error)
    {
      console.error("Error fetching user interests:", error);
      return false;
    }

    if (!data || data.length === 0)
    {
      return false;
    }

    return true;
  };

  const upvoteUserProfile = async (targetUserId, voterUserId) =>{
    const { error } = await supabase.rpc("upvote_profile", {
      target_user_id: targetUserId,
      voter_user_id: voterUserId,
    });

    if (error)
    {
      console.error("Error upvoting profile:", error);
    }
    return error;
  };

  const downvoteUserProfile = async (targetUserId, voterUserId) =>{
    const { error } = await supabase.rpc("downvote_profile", {
      target_user_id: targetUserId,
      voter_user_id: voterUserId,
    });

    if (error)
    {
      console.error("Error downvoting profile:", error);
    }

    return error;
  };

  const uploadProfilePhoto = async (filePath, file) => {
    const error = await supabase.storage
      .from("profile-images")
      .upload(filePath, file, { upsert: true });

    return error;
  }

  /*----------------*/
  /* Auth functions */
  /*----------------*/
  /*Get*/
  const authGetUser = async () => {
    //console.log("Getting user");
    const supabase = useSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    return { data, error };
  }

  const authGetSession = async () => {
    const supabase = useSupabaseClient();
    const { data , error } =
      await supabase.auth.getSession();

    return { data, error };
  };

  /*Update*/
  const authUpdateProfile = async (deleteMe, deleteRequestedAt) =>
  {
    //console.log("Updating user metadata");
    const supabase = useSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      data: { delete_me: deleteMe, delete_requested_at: deleteRequestedAt },
    });

    if (error)
    {
      console.error("Error updating user metadata:", error);
    } else
    {
      console.log("User marked for deletion:", data);
      deleteDialog.value = false;
    }
  };


  /*Others*/
  const signInWithOtp = async (email) =>
  {
    const supabase = useSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // emailRedirectTo: "https://imchatty.com/loginemail",
        // emailRedirectTo: "http://localhost:3000/loginemail",
        emailRedirectTo: config.public.SUPABASE_REDIRECT,
      },
    });
    if (error) throw error;
  };

  const signInAnonymously = async () => {
    //console.log("Signing in anonymously");
    const supabase = useSupabaseClient();
    const { data , error } = await supabase.auth.signInAnonymously();

    return { data, error };
  };

  const signInWithOAuth = async (provider, redirectTo) => {
    const supabase = useSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo, // Redirect after OAuth
      },
    });
  }; 

  const linkIdentity = async (provider, redirectTo) => {
    const supabase = useSupabaseClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: provider,
      options: {
        redirectTo: redirectTo,
      },
    });

    return {data, error};
  };

  const authMarkUserAsAnonymous = async () => {
    //console.log("Marking user as anonymous");
    const supabase = useSupabaseClient();
    await supabase.auth.updateUser({
      user_metadata: { isAnonymous: true },
    });
  };


  return {
    getCountries,
    getStates,
    getCities,
    getUserStatus,
    getStatuses,
    getGenders,
    getLookingForId,
    getMessagesBetweenUsers,
    getAIInteractionCount,
    getCurrentAIInteractionCount,
    getInterests,
    getInterestsIds,
    getInterestsIcons,
    getDescriptions,
    getUserFromName,
    getUserProfileFromId,
    getUserProfilePhoto,
    getRegisteredUsersIds,
    getAllUsersIdsWithoutAvatar,
    getRecentFemales,
    getRecentMales,
    getAiProfiles,
    getOfflineProfiles,
    getOnlineProfiles,
    getOnlineUserCount,
    getMostPopularProfiles,
    getRecentProfiles,
    getMostPopularAiProfiles,
    getBlockedProfiles,
    getUserBlockedProfiles,
    getCountUserFavorites,
    getUserFavoriteProfiles,
    getActiveChats,
    getUserUpvotedProfiles,

    updateBio,
    updateStatus,
    updateGender,
    updateTagline,
    updateProfilePhoto,
    updateSiteURL,
    updateInterests,
    updateProfile,
    updateMessagesAsRead,
    updateAIInteractionCount,

    insertMessage,
    insertFeedback,
    insertBlockedUser,
    insertInteractionCount,
    insertFavorite,
    insertUserInterest,

    deleteChatWithUser,
    deleteFavorite,
    deleteUserInterest,
    unblockUser,
    deleteUpvoteFromUser,

    checkDisplayNameExists,
    hasInterests,
    upvoteUserProfile,
    downvoteUserProfile,
    uploadProfilePhoto,

    authGetUser,
    authGetSession,
    authUpdateProfile,
    signInWithOtp,
    signInAnonymously,
    signInWithOAuth,
    linkIdentity,
    authMarkUserAsAnonymous,
  };
};
