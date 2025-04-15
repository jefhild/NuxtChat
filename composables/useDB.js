export const useDb = () => {
  const supabase = useSupabaseClient();
  const config = useRuntimeConfig();
  let inactivityCheckInterval = null;

  /*---------------*/
  /* Get functions */
  /*---------------*/

  const getCountryByIsoCode = async (isoCode) => {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .eq("iso2", isoCode)
      .single();

    return { data, error };
  };

  const getCountries = async () => {
    const { data, error } = await supabase.from("countries").select("*");
    if (error) throw error;

    return data;
  };

  const getStateByCodeAndCountry = async (regionCode, countryId) => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("state_code", regionCode)
      .eq("country_id", countryId)
      .single();

    return { data, error };
  };

  const getStatesFromCountryId = async (countryId) => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_id", countryId)
      .limit(1)
      .single();

    return { data, error };
  };

  const getStatesFromCountryName = async (country) => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_name", country);

    if (error) throw error;
    return data;
  };

  const getCitiesFromCountryId = async (countryId) => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("country_id", countryId)
      .limit(1);

    return { data, error };
  };

  const getCityByNameAndState = async (cityName, stateId) => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("name", cityName)
      .eq("state_id", stateId)
      .single();

    return { data, error };
  };

  const getCities = async (state) => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("state_name", state);
    if (error) throw error;

    return data;
  };

  /*const getUserStatus = async (userId) => {
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
  };*/

  const getStatuses = async () => {
    const { data, error } = await supabase.from("status").select("*");
    if (error) throw error;

    return data;
  };

  const getGenders = async () => {
    const { data, error } = await supabase.from("genders").select("*");
    if (error) throw error;
    return data;
  };

  const getGenderFromId = async (id) =>
  {
    if (!id)
    {
      return null;
    }
    const { data, error } = await supabase
      .from("genders")
      .select("name")
      .eq("id", id)
      .single();

    if (error || !data?.name)
    {
      console.error("Failed to get gender name:", error?.message);
      return null;
    }

    return data.name;
  };


  const getLookingForId = async (name) => {
    const { data, error } = await supabase
      .from("looking_for")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      console.error("Error fetching looking for ID:", error);
      return null;
    }

    return data.id;
  };

  const getAvatarDecorationFromId = async (id) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_decoration_url")
      .eq("user_id", id)
      .maybeSingle();

    if (error)
    {
      console.error("Error fetching avatar decoration:", error);
    }

    return data.avatar_decoration_url;
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

    if (updateError) {
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

    return { data, error };
  };

  const getInterests = async () => {
    const { data, error } = await supabase.from("looking_for").select("*");

    if (error) {
      console.error("Error fetching looking for options:", error);
    }

    return { data, error };
  };

  const getInterestsIds = async (userId) => {
    const { data, error } = await supabase
      .from("user_looking_for")
      .select("looking_for_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user interests ids:", error);
    }

    return { data, error };
  };

  const getDescriptions = async () => {
    const { data, error } = await supabase.from("descriptions").select("*");

    if (error) {
      console.error("Error fetching descriptions:", error);
    }

    return { data, error };
  };

  const getInterestsIcons = async (lookingForIds) => {
    const { data, error } = await supabase
      .from("looking_for")
      .select("id, name, icon, tooltip, color")
      .in("id", lookingForIds);

    if (error) {
      console.error("Error fetching interests icons:", error);
    }

    return { data, error };
  };

  const getUsersFromIds = async (
    userIds = [],
    genderId,
    minAge,
    maxAge,
    userId
  ) => {
    if (!userIds.length) return [];

    const { data, error } = await supabase.rpc(
      "fetch_filtered_profiles_by_ids",
      {
        user_ids: userIds,
        logged_in_user_id: userId,
        gender_filter: genderId,
        min_age: minAge,
        max_age: maxAge,
      }
    );

    if (error) {
      console.error("Error fetching online profiles:", error.message);
      return [];
    }

    // console.log("Fetched users from IDs:", data);
    return { data, error };
  };

  const getUserFromName = async (displayName) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("displayname", displayName)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  };

  const getUserProfileFromId = async (userId) => {

    if (!userId)
    {
      console.error("No userId provided to getUserProfileFromId. This is normal if there is no user autheniticated");
      return { data: null, error: new Error("Missing userId") };
    }
    
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
      )
      .eq("user_id", userId)
      .maybeSingle();

    return { data, error };
  };

  const getUserProfileFunctionFromId = async (userId) => {
    const { data, error } = await supabase.rpc("get_user_profile", {
      p_user_id: userId,
    });

    if (error) {
      console.error(
        "Error fetching user profile with RPC:",
        supabaseError.message
      );
    }

    return data;
  };

  const getUserProfileFromDisplayName = async (displayName) => {
    const { data, error } = await supabase.rpc("get_user_profile_by_displayname", {
      p_displayname: displayName,
    })

    if (error) {
      console.error(
        "Error fetching user profile with RPC:",
        error
      )
    }

    return data;
  };

  const getUserProfilePhoto = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

    return { data, error };
  };

  const getRegisteredUsersIds = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("username", "");

    return { data, error };
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

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getRecentMales = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_recent_males", {
      profile_limit: profileLimit,
    });

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getAiProfiles = async (userId, genderId, minAge, maxAge) => {
    const { data, error } = await supabase.rpc("fetch_ai_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
      is_ai_filter: true,
    });

    if (error) {
      console.error("Error fetching ai profiles:", error);
    }

    return { data, error };
  };

  const getActiveChats = async (userId, genderId, minAge, maxAge) =>
  {
    const { data, error } = await supabase.rpc("fetch_filtered_active_chats", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
    });

    if (error)
    {
      console.error("Error fetching active chats:", error);
    }

    return data;
  };

  const getOfflineProfiles = async (userId, genderId, minAge, maxAge) => {
    const { data, error } = await supabase.rpc("fetch_offline_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
      is_ai_filter: false,
    });

    if (error) {
      console.error("Error fetching offline profiles:", error);
    }

    return { data, error };
  };

  const getOnlineProfiles = async (userId, genderId, minAge, maxAge) => {
    const { data, error } = await supabase.rpc("fetch_online_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
    });

    if (error) {
      console.error("Error fetching online profiles:", error);
    }

    return { data, error };
  };

  /*const getOnlineUserCount = async () => {
    const { count, error: supabaseError } = await supabase
      .from("presence")
      .select("*", { count: "exact", head: true })
      .eq("status", "online");

    if (supabaseError) throw supabaseError;

    return count;
  };*/

  const getMostPopularProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_most_popular_profiles", {
      profile_limit: profileLimit,
    });
    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getRecentProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_recent_profiles", {
      profile_limit: profileLimit,
    });

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getMostPopularAiProfiles = async (profileLimit) => {
    const { data, error } = await supabase.rpc("get_most_popular_ai_profiles", {
      profile_limit: profileLimit,
    });
    if (error) {
      console.error("Error fetching popular ai profiles:", error);
    }

    return data;
  };

  const getBlockedProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_blocked_profiles", {
      blocker_id: userId,
    });

    if (error) {
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

    if (error) {
      console.error("Error fetching favorite profiles:", error);
    }

    return data;
  };


  const getUserUpvotedProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_upvoted_profiles", {
      upvoter_id: userId,
    });

    if (error) {
      console.error("Error fetching upvoted profiles:", error);
    }

    return data;
  };

  const getAllAvatarDecorations = async () => {
    const config = useRuntimeConfig();
    const { data, error } = await supabase
      .storage
      .from('avatar-decorations')
      .list('decorations', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error)
    {
      console.error('Error loading decorations:', error.message);
      return [];
    }

    return data.map(file => ({
      name: file.name,
      url: `${config.public.SUPABASE_URL}/storage/v1/object/public/avatar-decorations/decorations/${file.name}`,
    }));
  };

  const getUserUpvotedMeProfiles = async (userId) => {
    const { data, error } = await supabase.rpc("get_users_who_upvoted_me", {
      input_user_id: userId,
    });

    if (error) {
      console.error("Error fetching upvoted me profiles:", error);
    }

    return data;
  };

  const getUserFavoritedMeProfiles = async(userId) => {
    const { data, error } = await supabase.rpc("get_users_who_favorited_me", {
      input_user_id: userId,
    })

    if (error) {
      console.error("Error fetching favorited me profiles: ", error);
    }

    return data;
  };

  const getAllArticlesWithTags = async () =>
  {
    const { data, error } = await supabase
      .from("articles")
      .select(`
      id,
      title,
      slug,
      content,
      is_published,
      created_at,
      category:category_id(name),
      article_tags(tag:tag_id(name))
    `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error)
    {
      console.error("Error fetching articles:", error.message);
      return [];
    }

    // Flatten tags and category
    return data.map(article => ({
      ...article,
      category_name: article.category?.name ?? "Uncategorized",
      tags: article.article_tags?.map(t => t.tag.name) ?? []
    }));
  };


  const getArticleBySlug = async (slug) =>
  {
    const { data, error } = await supabase
      .from("articles")
      .select(`
      id,
      title,
      slug,
      content,
      created_at,
      is_published,
      category:category_id ( id, name, slug ),
      tags:article_tags (
        tag:tag_id ( id, name, slug )
      )
    `)
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error)
    {
      console.error("Error fetching article:", error);
      return null;
    }

    // Flatten tag data
    if (data.tags)
    {
      data.tags = data.tags.map((tag) => tag.tag);
    }

    return data;
  };

  const getArticlesByTagSlug = async (slug) =>
  {
    const { data, error } = await supabase.rpc("get_articles_by_tag_slug", {
      tag_slug: slug,
    });

    if (error)
    {
      console.error("Error fetching articles by tag slug:", error);
      return [];
    }

    return data;
  };

  const getTagsByArticle = async (articleSlug) =>
  {
    const { data, error } = await supabase
      .from("articles")
      .select("tags(name, slug)")
      .eq("slug", articleSlug)
      .single();

    if (error)
    {
      console.error("Error fetching tags for article:", error);
      return [];
    }

    return data?.tags || [];
  };

  const getArticlesbyCategorySlug = async (slug) => {
    const { data, error } = await supabase.rpc("get_articles_by_category_slug", {
      cat_slug: slug,
    });

    if (error)
    {
      console.error("Error fetching articles by category slug:", error);
      return [];
    }

    return data;
  }




  /*------------------*/
  /* Update functions */
  /*------------------*/

  const updateUsername = async (username, userId) => {
    console.log("Updating username:", username, userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username, // Update the email/username
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateProvider = async (provider, userId) => {
    console.log("Updating provider:", provider, userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        provider: provider, // Update the email/username
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating status:", error);
    }
  };

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

    if (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateGender = async (genderID, userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ gender_id: genderID })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating gender in Supabase:", error);
    }
  };

  const updateTagline = async (tagline, userId) => {
    // console.log("Updating tagline:", tagline);
    // console.log("User ID:", userId);

    const { data, error } = await supabase
      .from("profiles")
      .update({ tagline })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating tagline:", error);
    }
  };

  const updateProfilePhoto = async (avatarUrl, userId) => {
    const status = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", userId);

    if (status && status.status !== 204) {
      console.error("Error deleting chat:", error);
    }

    return status;
  };

  const updateSiteURL = async (siteUrl, userId) => {
    // console.log("Updating url:", siteUrl);
    // console.log("User ID:", userId);
    const { error } = await supabase
      .from("profiles")
      .update({ site_url: siteUrl })
      .eq("user_id", userId);

    if (error) throw error;
  };

  const updateInterests = async (interestsArray, userId) => {
    for (const interest of interestsArray) {
      const id = await getLookingForId(interest.trim());
      const { data, error } = await supabase
        .from("user_looking_for")
        .insert({ user_id: userId, looking_for_id: id });

      if (error) {
        console.error("Error inserting user looking for:", error);
      }
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

  const updateMessagesAsRead = async (receiverUserId, senderUserId) => {
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

    if (updateInteractionError) {
      console.error(
        "Error updating interaction count:",
        updateInteractionError
      );
    }
  };

  const updatePresence = async (userId, status) => {
    const { error } = await supabase
      .from("presence")
      .upsert({ user_id: userId, status });

    console.log("Updating presence:", userId, status);
    /*if (error) {
      console.error("Error updating presence:", error);
    }*/
  };

  const updateAvatarDecoration = async (userId, avatarDecUrl) =>{
    console.log("in db",userId, avatarDecUrl);
    const { error } = await supabase 
    .from("profiles")
    .update({ avatar_decoration_url: avatarDecUrl })
    .eq("user_id", userId);


    if (error && error.status !== 204)
    {
      console.error("Error deleting chat:", error);
    }
  }
  
  /*------------------*/
  /* Insert functions */
  /*------------------*/

  const insertProfile = async (
    genderId,
    statusId,
    age,
    countryId,
    stateId,
    cityId,
    username,
    avatarUrl,
    userId,
    provider,
    displayname,
    ip,
    siteUrl,
    bio
  ) => {
    const { error } = await supabase
      .from("profiles")
      .insert([
        {
          gender_id: genderId,
          status_id: statusId,
          age: age,
          country_id: countryId,
          state_id: stateId,
          city_id: cityId,
          username: username,
          avatar_url: avatarUrl,
          user_id: userId,
          provider: provider,
          displayname: displayname,
          ip: ip,
          site_url: siteUrl,
          bio: bio,
        },
      ])
      .single();

    if (error) {
      console.error("Error inserting profile:", error);
    }
    return error;
  };

  const insertMessage = async (receiverId, senderId, message) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: message,
      })
      .select("*");

    if (error) {
      console.error("Error sending message:", error);
    }
    return data;
  };

  const insertFeedback = async (feedback, userId) => {
    const { error } = await supabase
      .from("feedback")
      .insert({ feedback_text: feedback });

    if (error) {
      console.error("Error inserting feedback:", error);
    }
  };

  const insertBlockedUser = async (userId, blockedUserId) => {
    const { error } = await supabase.from("blocked_users").insert({
      user_id: userId,
      blocked_user_id: blockedUserId,
    });

    if (error) {
      console.error("Error blocking user:", error);
    } else {
      console.log("User blocked");
    }

    return error;
  };

  const insertInteractionCount = async (senderUserId, interactionCount) => {
    const { insertError } = await supabase.from("user_ai_interactions").insert({
      user_id: senderUserId,
      interaction_count: interactionCount,
    });
    return insertError;
  };

  const insertFavorite = async (userId, favoriteUserId) => {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, favorite_user_id: favoriteUserId });

    if (error) {
      console.error("Error inserting favorite:", error);
    }

    return error;
  };

  const insertUserInterest = async (userId, interestId) => {
    const { error } = await supabase.from("user_looking_for").insert({
      user_id: userId,
      looking_for_id: interestId,
    });

    if (error) {
      console.error("Error inserting user interest:", error);
    }

    return error;
  };

  const insertUserDescription = async (userId, descriptionId) => {
    const { error } = await supabase.from("user_descriptions").insert({
      user_id: userId,
      descriptions_id: descriptionId,
    });

    if (error) {
      console.error("Error inserting description:", error);
    }

    return error;
  };

  /*------------------*/
  /* Delete functions */
  /*------------------*/

  const deleteChatWithUser = async (userId, userToDeleteId) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(receiver_id.eq.${userToDeleteId},sender_id.eq.${userId}),and(receiver_id.eq.${userId},sender_id.eq.${userToDeleteId})`
      );

    if (error && error.status !== 204) {
      console.error("Error deleting chat:", error);
    }

    return error;
  };

  const deleteFavorite = async (userId, favoriteUserId) => {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);

    if (error && error.status !== 204) {
      console.error("Error deleting favorite:", error);
    }

    return error;
  };

  const deleteUserInterest = async (userId, interestId) => {
    const error = await supabase.from("user_looking_for").delete().match({
      user_id: userId,
      looking_for_id: interestId,
    });

    if (error && error.status !== 204) {
      console.error("Error deleting user interest:", error);
    }

    return error;
  };

  const unblockUser = async (userId, blockedUserId) => {
    const error = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId)
      .eq("blocked_user_id", blockedUserId);

    if (error && error.status !== 204) {
      console.error("Error unblocking user:", error);
    }

    return error;
  };

const deleteUpvoteFromUser = async (userId, upvotedProfileId) => {
const { data, error } = await supabase
  .from("votes")
  .delete({ returning: "representation" }) // THIS is key!
  .eq("user_id", userId)
  .eq("profile_id", upvotedProfileId);

  console.log("Deleted rows:", data);

  if (error && error.status !== 204) {
    console.error("Error deleting upvote:", error.message);
  }

  return { data, error };
};

  /*-----------------*/
  /* Other Functions */
  /*-----------------*/

  const checkDisplayNameExists = async (displayName) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("displayname", { head: false })
      .eq("displayname", displayName)
      .limit(1)
      .maybeSingle();

    console.log("Checking displayname:", data);

    if (error && error.code !== "PGRST116") {
      console.error("Error checking displayname:", error);
    }

    return { data, error };
  };

  const hasInterests = async (userId) => {
    const { data, error } = await supabase
      .from("user_looking_for")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user interests:", error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    return true;
  };

  const hasEmail = async (userId) => {
    const { data, error } = await authGetUser();

    if (error || !data?.user) {
      console.error("❌ Could not fetch user:", error?.message);
      return false;
    }

    const user = data.user;
    const hasEmailLinked = !!user.email && user.email_confirmed_at !== null;

    return hasEmailLinked;
  };

  const upvoteUserProfile = async (targetUserId, voterUserId) => {
    const { error } = await supabase.rpc("upvote_profile", {
      target_user_id: targetUserId,
      voter_user_id: voterUserId,
    });

    if (error) {
      console.error("Error upvoting profile:", error);
    }
    return error;
  };

  const downvoteUserProfile = async (targetUserId, voterUserId) => {
    const { error } = await supabase.rpc("downvote_profile", {
      target_user_id: targetUserId,
      voter_user_id: voterUserId,
    });

    if (error) {
      console.error("Error downvoting profile:", error);
    }

    return error;
  };

  const uploadProfilePhoto = async (filePath, file) => {
    const error = await supabase.storage
      .from("profile-images")
      .upload(filePath, file, { upsert: true });

    return error;
  };

  const checkInactivityForAllUsers = async () => {
    console.log("checking inactivity for ALL users");

    // Get all online users
    const { data: onlineUsers, error } = await supabase
      .from("presence")
      .select("user_id, last_active")
      .eq("status", "online");

    if (error) {
      console.error("Error fetching online users:", error);
      return;
    }

    const now = new Date();

    for (const user of onlineUsers) {
      const lastActiveDate = new Date(user.last_active);
      lastActiveDate.setHours(lastActiveDate.getHours() + 1);
      const timeDifference = (now - lastActiveDate) / 1000; // Convert to seconds

      //console.log("now", now);
      //console.log("lastactive", lastActiveDate);
      //console.log("timedfference", timeDifference)
      //console.log("checkinactivityallusers");
      //30 minutes
      if (timeDifference > 1800) {
        await updatePresence(user.user_id, "offline");
      }
    }
  };

  const trackPresence = async (userId) => {
    // not sure about this...
    window.addEventListener(
      "beforeunload",
      async () => await updatePresence(userId, "offline")
    );

    inactivityCheckInterval = setInterval(
      async () => await checkInactivityForAllUsers(),
      1800000 // 30 minutes
    );
  };

  const stopTracking = async () => {
    if (inactivityCheckInterval) {
      clearInterval(inactivityCheckInterval);
    }
  };

  /*----------------*/
  /* Auth functions */
  /*----------------*/
  /*Get*/
  const authGetUser = async () => {
    //console.log("Getting user");
    const { data, error } = await supabase.auth.getUser();
    // console.log("User data:", data);
    return { data, error };
  };

  const authRefreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Error refreshing session:", error);
    }

    return { data, error };
  };

  /*Update*/
  const authUpdateProfile = async (deleteMe, deleteRequestedAt) => {
    //console.log("Updating user metadata");
    const { data, error } = await supabase.auth.updateUser({
      data: { delete_me: deleteMe, delete_requested_at: deleteRequestedAt },
    });

    if (error) {
      console.error("Error updating user metadata:", error);
    } else {
      console.log("User marked for deletion:", data);
      deleteDialog.value = false;
    }
  };

  /*Others*/
  const authSignOut = async () => {
    console.log("auth Signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    return { error };
  };

  const signInWithOtp = async (email) => {
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
    const { data, error } = await supabase.auth.signInAnonymously();

    return { data, error };
  };

  const signInWithOAuth = async (provider, redirectTo) => {
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo, // Redirect after OAuth
      },
    });
  };

  const linkIdentity = async ({ provider, email, redirectTo }) => {
    console.log("Linking identity with provider:", provider);
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        ...(email && { email }), // Only include email if it's defined
        redirectTo,
      },
    });

    return { data, error };
  };

  const updateUserEmail = async (mappedEmail) => {
    const { data, error } = await supabase.auth.updateUser(
      {
        email: mappedEmail,
      },
      {
        redirectTo: `${window.location.origin}/loginemail`,
      }
    );

    if (error) {
      console.error("Error updating email:", error);
    }

    return { data, error };
  };

  const authMarkUserAsAnonymous = async () => {
    //console.log("Marking user as anonymous");
    await supabase.auth.updateUser({
      user_metadata: { isAnonymous: true },
    });
  };

  return {
    getCountryByIsoCode,
    getCountries,
    getStateByCodeAndCountry,
    getStatesFromCountryId,
    getStatesFromCountryName,
    getCityByNameAndState,
    getCitiesFromCountryId,
    getCities,
    //getUserStatus,
    getStatuses,
    getGenders,
    getGenderFromId,
    getLookingForId,
    getAvatarDecorationFromId,
    getMessagesBetweenUsers,
    getAIInteractionCount,
    getCurrentAIInteractionCount,
    getInterests,
    getInterestsIds,
    getInterestsIcons,
    getDescriptions,
    getUsersFromIds,
    getUserFromName,
    getUserProfileFromId,
    getUserProfileFunctionFromId,
    getUserProfileFromDisplayName,
    getUserProfilePhoto,
    getRegisteredUsersIds,
    getAllUsersIdsWithoutAvatar,
    getRecentFemales,
    getRecentMales,
    getAiProfiles,
    getActiveChats,
    getOfflineProfiles,
    getOnlineProfiles,
    //getOnlineUserCount,
    getMostPopularProfiles,
    getRecentProfiles,
    getMostPopularAiProfiles,
    getBlockedProfiles,
    getUserBlockedProfiles,
    getCountUserFavorites,
    getUserFavoriteProfiles,
    getUserUpvotedProfiles,
    getAllAvatarDecorations,
    getUserUpvotedMeProfiles,
    getUserFavoritedMeProfiles,
    getAllArticlesWithTags,
    getArticleBySlug,
    getArticlesByTagSlug,
    getTagsByArticle,
    getArticlesbyCategorySlug,

    updateUsername,
    updateProvider,
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
    updatePresence,
    updateAvatarDecoration,

    insertProfile,
    insertMessage,
    insertFeedback,
    insertBlockedUser,
    insertInteractionCount,
    insertFavorite,
    insertUserInterest,
    insertUserDescription,

    deleteChatWithUser,
    deleteFavorite,
    deleteUserInterest,
    unblockUser,
    deleteUpvoteFromUser,

    checkDisplayNameExists,
    hasInterests,
    hasEmail,
    upvoteUserProfile,
    downvoteUserProfile,
    uploadProfilePhoto,
    trackPresence,
    stopTracking,
    checkInactivityForAllUsers,

    authGetUser,
    authRefreshSession,
    authUpdateProfile,
    authSignOut,
    signInWithOtp,
    signInAnonymously,
    signInWithOAuth,
    linkIdentity,
    updateUserEmail,
    authMarkUserAsAnonymous,
  };
};
