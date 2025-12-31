import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

export const useDb = () => {
  /*---------------*/
  /* Get functions */
  /*---------------*/

  const getClient = () => useSupabaseClient();

  // 👇 Accept `event` explicitly so it works server-side
  // Build a server client from explicit params (no Nuxt APIs here)
  const getServerClientFrom = (url, serviceKey) => {
    if (!url || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  };

  const getConfig = () => {
    // tolerate being called very early; return minimal shape if no app
    try {
      // will throw if no active nuxt instance
      return useRuntimeConfig();
    } catch {
      return { public: {} };
    }
  };

  let inactivityCheckInterval = null;
  let _messagesChan = null;
  let _messagesFor = null; // if you track which user it's wired for
  let _messagesInflight = null;

  const getCountryByIsoCode = async (isoCode) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .eq("iso2", isoCode)
      .single();

    return { data, error };
  };

  const getCountries = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.from("countries").select("*");
    if (error) throw error;

    return data;
  };

  const getStateByCodeAndCountry = async (regionCode, countryId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("state_code", regionCode)
      .eq("country_id", countryId)
      .single();

    return { data, error };
  };

  const getStatesFromCountryId = async (countryId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_id", countryId);
    if (error) throw error;
    return data;
  };

  const getStatesFromCountryName = async (country) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_name", country);

    if (error) throw error;
    return data;
  };

  const getCitiesFromCountryId = async (countryId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("country_id", countryId)
      .limit(1);

    return data;
  };

  const getCityByNameAndState = async (cityName, stateId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("name", cityName)
      .eq("state_id", stateId)
      .single();

    return data;
  };

  const getCities = async (state) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("state_name", state);
    if (error) throw error;

    return data;
  };

  const getCitiesFromStateId = async (stateId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("state_id", stateId)
      .order("name");

    if (error) throw error;

    return data;
  };

  const getStatuses = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.from("status").select("*");
    if (error) throw error;

    return data;
  };

  const getGenders = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.from("genders").select("*");
    if (error) throw error;
    return data;
  };

  const getGenderFromId = async (id) => {
    const supabase = getClient();
    if (!id) {
      return null;
    }
    const { data, error } = await supabase
      .from("genders")
      .select("name")
      .eq("id", id)
      .single();

    if (error || !data?.name) {
      console.error("Failed to get gender name:", error?.message);
      return null;
    }

    return data.name;
  };

  const getLookingForId = async (name) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("looking_for")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      console.error("Error fetching looking for ID:", error);
      return null;
    }

    return data?.id;
  };

  const getAvatarDecorationFromId = async (id) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_decoration_url")
      .eq("user_id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching avatar decoration:", error);
    }

    return data.avatar_decoration_url;
  };

  const getMessageById = async (id) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, sender_id")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching message by ID:", error);
    }

    return { data, error };
  };

  const getMessagesBetweenUsers = async (
    senderUserId,
    receiverUserId,
    before = null,
    limit = 20
  ) => {
    const supabase = getClient();

    let query = supabase
      .from("messages")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read,
        file_url,
        file_type,
        file_name,
        reply_to_message_id,
        reply_to:reply_to_message_id ( id, content, sender_id ),
        profiles!messages_sender_id_fkey(displayname)
      `
      )
      .or(
        `and(sender_id.eq.${senderUserId},receiver_id.eq.${receiverUserId}),and(sender_id.eq.${receiverUserId},receiver_id.eq.${senderUserId})`
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  };

  const getMessagesOfAUserWithUser = async (
    senderUserId,
    receiverUserId,
    before = null,
    limit = 20
  ) => {
    const supabase = getClient();
    let query = supabase
      .from("messages")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read,
        file_url,
        file_type,
        file_name,
        reply_to_message_id,
        reply_to:reply_to_message_id ( id, content, sender_id ),
        profiles!messages_sender_id_fkey(displayname)
      `
      )
      .eq("sender_id", senderUserId)
      .eq("receiver_id", receiverUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    // console.log("getMessagesOfAUserWithUser", data, error);
    if (error) throw error;
    return data;
  };

  const recordAIInteraction = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("user_ai_interactions")
      .select("interaction_count")
      .eq("user_id", userId)
      .maybeSingle();

    let count = data?.interaction_count || 0;

    if (data) {
      await supabase
        .from("user_ai_interactions")
        .update({ interaction_count: count + 1 })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_ai_interactions")
        .insert({ user_id: userId, interaction_count: 1 });
    }

    return count + 1;
  };

  const getAIInteractionCount = async (senderUserId) => {
    const supabase = getClient();
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
    const supabase = getClient();
    const { data, error } = await supabase
      .from("user_ai_interactions")
      .select("interaction_count")
      .eq("user_id", senderUserId)
      .single();

    return { data, error };
  };

  const getInterests = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.from("looking_for").select("*");

    if (error) {
      console.error("Error fetching looking for options:", error);
    }

    return { data, error };
  };

  const getInterestsIds = async (userId) => {
    const supabase = getClient();

    if (!userId || userId === "undefined") {
      console.warn("[getInterestsIds] Invalid userId:", userId);
      return [];
    }

    const { data, error } = await supabase
      .from("user_looking_for")
      .select("looking_for_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user interests ids:", error);
      return [];
    }

    return data;
  };

  const getDescriptions = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.from("descriptions").select("*");

    if (error) {
      console.error("Error fetching descriptions:", error);
    }

    return { data, error };
  };

  const getInterestsIcons = async (lookingForIds) => {
    const supabase = getClient();
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
    is_anonymous,
    interests,
    country_id,
    status_id,
    userId
  ) => {
    const supabase = getClient();

    if (!userIds.length) return { data: [], error: null };

    const { data, error } = await supabase.rpc(
      "fetch_filtered_profiles_by_ids",
      {
        user_ids: userIds,
        logged_in_user_id: userId || null, // ensure it's null-safe
        gender_filter: genderId,
        min_age: minAge,
        max_age: maxAge,
        is_anonymous,
        looking_for_ids: interests,
        p_country_id: country_id,
        p_status_id: status_id,
      }
    );

    if (error) {
      console.error("Error fetching online profiles:", error.message);
      return { data: [], error };
    }

    return { data, error: null };
  };

  const getUserDisplayNameFromId = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("displayname")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching display name:", error);
    }

    return data?.displayname;
  };

  const getUserFromName = async (displayName) => {
    const supabase = getClient();

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
    const supabase = getClient();

    if (!userId) {
      console.error(
        "No userId provided to getUserProfileFromId. This is normal if there is no user autheniticated"
      );
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
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_user_profile_1", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user profile with RPC:", error.message);
      return null;
    }

    return data;
  };

  const getUserProfileFromDisplayName = async (displayName) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc(
      "get_user_profile_by_displayname",
      {
        p_displayname: displayName,
      }
    );

    if (error) {
      console.error("Error fetching user profile with RPC:", error);
    }

    return data;
  };

  const getUserProfileFromSlug = async (slug) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_user_profile_by_slug", {
      p_slug: slug,
    });

    if (error) {
      console.error("Error fetching user profile with RPC slug:", error);
    }

    return data;
  };

  const getUserProfilePhoto = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

    return { data, error };
  };

  const getRegisteredUsersIds = async () => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("username", "");

    return { data, error };
  };

  const getAllUsersIdsWithoutAvatar = async () => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("avatar_url", "");

    return { data, error };
  };

  const getAllProfiles = async (withAI) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_all_profiles_1", {
      // pass through boolean or null (no filter)
      p_is_ai: typeof withAI === "boolean" ? withAI : null,
    });

    if (error) {
      console.error("[useDB.getAllProfiles] RPC error:", error);
      return { data: null, error };
    }
    if (!Array.isArray(data)) {
      console.error("[useDB.getAllProfiles] Unexpected payload:", data);
      return { data: [], error: null };
    }
    return { data, error: null };
  };

  const getAdminProfiles = async (withAI) => {
    try {
      const response = await $fetch("/api/admin/profiles", {
        query: {
          is_ai: typeof withAI === "boolean" ? String(withAI) : undefined,
        },
      });
      const items = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
        ? response
        : [];
      return { data: items, error: null };
    } catch (error) {
      const detail =
        error?.data?.error?.message ||
        error?.data?.error ||
        error?.message ||
        error;
      console.error("[useDB.getAdminProfiles] error:", detail);
      return { data: [], error };
    }
  };

  const getUserActivitySummary = async (
    userId,
    { threadSampleLimit = 200, voteSampleLimit = 200 } = {}
  ) => {
    const supabase = getClient();
    if (!userId) {
      return { data: null, error: new Error("userId required") };
    }

    const [
      { count: chatCount, error: chatCountError },
      { count: discussionCount, error: discussionCountError },
      { data: chatLast, error: chatLastError },
      { data: discussionRows, error: discussionRowsError },
    ] = await Promise.all([
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId),
      supabase
        .from("messages_v2")
        .select("id", { count: "exact", head: true })
        .eq("sender_user_id", userId),
      supabase
        .from("messages")
        .select("created_at")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("messages_v2")
        .select("id, thread_id, created_at")
        .eq("sender_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(threadSampleLimit),
    ]);

    if (
      chatCountError ||
      discussionCountError ||
      chatLastError ||
      discussionRowsError
    ) {
      const error =
        chatCountError ||
        discussionCountError ||
        chatLastError ||
        discussionRowsError;
      console.error("[useDB.getUserActivitySummary] error:", error);
      return { data: null, error };
    }

    const threadCounts = new Map();
    const messageIds = [];
    const threadIds = new Set();

    (discussionRows || []).forEach((row) => {
      if (row?.thread_id) {
        threadCounts.set(
          row.thread_id,
          (threadCounts.get(row.thread_id) || 0) + 1
        );
        threadIds.add(row.thread_id);
      }
      if (row?.id) messageIds.push(row.id);
    });

    let threads = [];
    if (threadIds.size) {
      const { data: threadRows, error: threadsError } = await supabase
        .from("threads")
        .select("id, title, slug")
        .in("id", Array.from(threadIds));
      if (threadsError) {
        console.error("[useDB.getUserActivitySummary] threads error:", threadsError);
      } else {
        threads = (threadRows || []).map((thread) => ({
          id: thread.id,
          title: thread.title,
          slug: thread.slug,
          messageCount: threadCounts.get(thread.id) || 0,
        }));
        threads.sort((a, b) => b.messageCount - a.messageCount);
      }
    }

    let discussionUpvotes = 0;
    let discussionDownvotes = 0;
    const voteIds = messageIds.slice(0, voteSampleLimit);
    if (voteIds.length) {
      const { data: scoreRows, error: scoreError } = await supabase
        .from("message_scores")
        .select("message_id, upvotes, downvotes")
        .in("message_id", voteIds);
      if (scoreError) {
        console.error(
          "[useDB.getUserActivitySummary] message_scores error:",
          scoreError
        );
      } else {
        (scoreRows || []).forEach((row) => {
          discussionUpvotes += Number(row.upvotes || 0);
          discussionDownvotes += Number(row.downvotes || 0);
        });
      }
    }

    return {
      data: {
        chatCount: chatCount || 0,
        discussionCount: discussionCount || 0,
        chatLastAt: chatLast?.created_at || null,
        discussionLastAt: discussionRows?.[0]?.created_at || null,
        discussionThreads: threads,
        discussionSampleSize: discussionRows?.length || 0,
        discussionUpvotes,
        discussionDownvotes,
        voteSampleSize: voteIds.length,
      },
      error: null,
    };
  };

  const getRecentFemales = async (profileLimit) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_recent_females", {
      profile_limit: profileLimit,
    });

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getRecentMales = async (profileLimit) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_recent_males", {
      profile_limit: profileLimit,
    });

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getAiProfiles = async (userId, genderId, minAge, maxAge) => {
    const supabase = getClient();
    if (!userId) {
      console.warn("User ID is null — skipping AI profile fetch.");
      return { data: [], error: null };
    }
    const { data, error } = await supabase.rpc("fetch_ai_profiles", {
      logged_in_user_id: userId,
      gender_filter: genderId,
      min_age: minAge,
      max_age: maxAge,
      is_ai_filter: true,
    });

    // console.log("Fetched AI profiles:", data, userId, genderId, minAge, maxAge); // Debug log

    if (error) {
      console.error("Error fetching ai profiles:", error);
    }

    return { data, error };
  };

  const getActiveChats = async (
    userId,
    genderId = null,
    minAge = 18,
    maxAge = 99,
    is_anonymous = null,
    interests = null,
    country_id = null,
    status_id = null
  ) => {
    const supabase = getClient();

    const { data, error } = await supabase.rpc("fetch_filtered_active_chats", {
      logged_in_user_id: userId ?? null,
      gender_filter: genderId ?? null,
      min_age: minAge ?? 18,
      max_age: maxAge ?? 99,
      is_anonymous: is_anonymous ?? null,
      looking_for_ids: interests ?? null,
      p_country_id: country_id ?? null,
      p_status_id: status_id ?? null,
    });

    if (error) {
      console.error("Error fetching active chats:", error);
      return { data: null, error };
    }

    return { data, error: null };
  };

  const getOfflineProfiles = async (userId, genderId, minAge, maxAge) => {
    const supabase = getClient();

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
    const supabase = getClient();

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

  const getMostPopularProfiles = async (profileLimit) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_most_popular_profiles", {
      profile_limit: profileLimit,
    });
    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getRecentProfiles = async (profileLimit) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_recent_profiles", {
      profile_limit: profileLimit,
    });

    if (error) {
      console.error("Error fetching popular profiles:", error);
    }

    return data;
  };

  const getMostPopularAiProfiles = async (profileLimit) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_most_popular_ai_profiles", {
      profile_limit: profileLimit,
    });
    if (error) {
      console.error("Error fetching popular ai profiles:", error);
    }

    return data;
  };

  const getBlockedProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_blocked_profiles", {
      blocker_id: userId,
    });

    if (error) {
      console.error("Error fetching blocked profiles:", error);
    }

    return data;
  };

  const getUserBlockedProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", userId);

    if (error) throw error;

    return data;
  };

  const getCountUserFavorites = async (userId, favoriteUserId) => {
    const supabase = getClient();
    const { count } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);

    return count;
  };

  const getUserFavoriteProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_favorite_profiles", {
      current_user_id: userId,
    });

    if (error) {
      console.error("Error fetching favorite profiles:", error);
    }

    return data;
  };

  const getUserUpvotedProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_upvoted_profiles", {
      upvoter_id: userId,
    });

    if (error) {
      console.error("Error fetching upvoted profiles:", error);
    }

    return data;
  };

  const getAllAvatarDecorations = async () => {
    // const config = useRuntimeConfig();

    const config = getConfig();
    const supabase = getClient();
    const { data, error } = await supabase.storage
      .from("avatar-decorations")
      .list("decorations", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error("Error loading decorations:", error.message);
      return [];
    }

    return data.map((file) => ({
      name: file.name,
      url: `${config.public.SUPABASE_URL}/storage/v1/object/public/avatar-decorations/decorations/${file.name}`,
    }));
  };

  const getUserUpvotedMeProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_users_who_upvoted_me", {
      input_user_id: userId,
    });

    if (error) {
      console.error("Error fetching upvoted me profiles:", error);
    }

    return data;
  };

  const getUserFavoritedMeProfiles = async (userId) => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("get_users_who_favorited_me", {
      input_user_id: userId,
    });

    if (error) {
      console.error("Error fetching favorited me profiles: ", error);
    }

    return data;
  };

  const getAllTags = async () => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error.message);
      return [];
    }

    return data;
  };

  const getAllCategories = async () => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error.message);
      return [];
    }

    return data;
  };

  const getAllPeople = async () => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("people")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching people:", error.message);
      return [];
    }

    return data;
  };

  const normalizeArticleTags = (articleTags) =>
    (articleTags || [])
      .map(({ tag }) =>
        tag
          ? {
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
            }
          : null
      )
      .filter(Boolean);

  const getAllArticlesWithTags = async () => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
      id,
      title,
      type,
      slug,
      content,
      image_path,
      photo_credits_url,
      photo_credits_html,
      is_published,
      created_at,
      category:category_id ( id, name, slug ),
      article_tags(tag:tag_id(id, name, slug))
    `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error.message);
      return [];
    }

    // Flatten tags and category
    return data.map((article) => ({
      ...article,
      category_name: article.category?.name ?? "Uncategorized",
      tags: normalizeArticleTags(article.article_tags),
    }));
  };

 
  const getAllPublishedArticlesWithTags = async (limit = 50) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
      id,
      title,
      type,
      slug,
      content,
      image_path,
      photo_credits_url,
      photo_credits_html,
      is_published,
      created_at,
      category:category_id ( id, name, slug ),
      article_tags(tag:tag_id(id, name, slug)),
      threads(slug)
    `
      )
      .eq("is_published", true)
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error.message);
      return [];
    }

    return data.map((article) => ({
      ...article,
      category_name: article.category?.name ?? "Uncategorized",
      tags: normalizeArticleTags(article.article_tags),
      threadSlug:
        Array.isArray(article.threads) && article.threads.length > 0
          ? article.threads[0].slug // use first slug if multiple threads
          : null,
    }));
  };

  const getPublishedArticlesPage = async ({ limit = 12, offset = 0 } = {}) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
      id,
      title,
      type,
      slug,
      content,
      image_path,
      photo_credits_url,
      photo_credits_html,
      is_published,
      created_at,
      category:category_id ( id, name, slug ),
      article_tags(tag:tag_id(id, name, slug)),
      threads(slug)
    `
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching articles:", error.message);
      return [];
    }

    return data.map((article) => ({
      ...article,
      category_name: article.category?.name ?? "Uncategorized",
      tags: normalizeArticleTags(article.article_tags),
      threadSlug:
        Array.isArray(article.threads) && article.threads.length > 0
          ? article.threads[0].slug
          : null,
    }));
  };
 
 
  const getArticleBySlug = async (slug) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .select(
        `
      id,
      title,
      slug,
      content,
      newsmesh_id,
      newsmesh_meta,
      rewrite_meta,
      persona_key,
      persona_id,
      persona_display_name,
      persona_avatar_url,
      image_path,
      photo_credits_url,
      photo_credits_html,
      created_at,
      is_published,
      category:category_id ( id, name, slug ),
      tags:article_tags (
        tag:tag_id ( id, name, slug )
      ),
      people:article_people (
        person:person_id ( id, name, slug )
      )
    `
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error) {
      console.error("Error fetching article:", error);
      return null;
    }

    // Flatten tag data
    if (data.tags) {
      data.tags = data.tags.map((tag) => tag.tag);
    }

    if (data.people) {
      data.people = data.people.map((entry) => entry.person);
    }

    return data;
  };

  // New: returns slug when available (preferred), otherwise falls back to id.
  const getThreadKeyByArticleId = async (articleId) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("threads")
      .select("slug, id")
      .eq("kind", "article")
      .eq("article_id", articleId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching thread key:", error);
      return null;
    }
    return data?.slug || data?.id || null;
  };

  // (Optional) Keep a shim for old callers during migration.
  const getThreadIdByArticleId = async (articleId) => {
    const key = await getThreadKeyByArticleId(articleId);
    return key; // may be slug or id depending on data
  };

  const getCountArticleByTag = async (tagId) => {
    const supabase = getClient();

    const { error, count } = await supabase
      .from("article_tags")
      .select("*", { count: "exact", head: true })
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error fetching article count for tag:", error.message);
      return 0;
    }

    return count || 0;
  };

  const getCountArticleByCategory = async (categoryId) => {
    const supabase = getClient();

    const { count, error } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .eq("is_published", true); // Optional: only count published articles

    if (error) {
      console.error("Error fetching article count by category:", error);
      return 0;
    }

    return count || 0;
  };

  const getArticlesByTagSlug = async (slug) => {
    const supabase = getClient();

    const { data, error } = await supabase.rpc("get_articles_by_tag_slug1", {
      tag_slug: slug,
    });

    if (error) {
      console.error("Error fetching articles by tag slug:", error);
      return [];
    }

    return data;
  };

  const getArticlesByPersonSlug = async (slug) => {
    const supabase = getClient();

    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (personError) {
      console.error("Error fetching person:", personError);
      return { person: null, articles: [] };
    }

    if (!person) {
      return { person: null, articles: [] };
    }

    const selectColumns = `
        id,
        title,
        slug,
        content,
        image_path,
        photo_credits_url,
        photo_credits_html,
        created_at,
        is_published,
        category:category_id ( id, name, slug ),
        threads(slug),
        article_people!inner(person_id)
      `;

    const { data, error } = await supabase
      .from("articles")
      .select(selectColumns)
      .eq("article_people.person_id", person.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    let baseArticles =
      data?.map((article) => ({
        ...article,
        category_name: article.category?.name ?? "Uncategorized",
        thread_slug:
          Array.isArray(article.threads) && article.threads.length > 0
            ? article.threads[0].slug
            : null,
      })) || [];

    if (error) {
      console.error("Error fetching articles by person slug:", error);
      baseArticles = [];
    }

    if (!baseArticles.length) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("articles")
        .select(
          `
            id,
            title,
            slug,
            content,
            image_path,
            photo_credits_url,
            photo_credits_html,
            created_at,
            is_published,
            category:category_id ( id, name, slug ),
            threads(slug)
          `
        )
        .contains("newsmesh_meta", { people: [person.name] })
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!fallbackError) {
        baseArticles =
          fallbackData?.map((article) => ({
            ...article,
            category_name: article.category?.name ?? "Uncategorized",
            thread_slug:
              Array.isArray(article.threads) && article.threads.length > 0
                ? article.threads[0].slug
                : null,
          })) || [];
      } else {
        console.error(
          "Fallback fetch error for articles by person slug:",
          fallbackError
        );
      }
    }

    return { person, articles: baseArticles };
  };

  const getTagsByArticle = async (articleSlug) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .select("tags(name, slug)")
      .eq("slug", articleSlug)
      .single();

    if (error) {
      console.error("Error fetching tags for article:", error);
      return [];
    }

    return data?.tags || [];
  };

  const getArticlesbyCategorySlug = async (slug) => {
    const supabase = getClient();

    const { data, error } = await supabase.rpc(
      "get_articles_by_category_slug1",
      {
        cat_slug: slug,
      }
    );

    if (error) {
      console.error("Error fetching articles by category slug:", error);
      return [];
    }

    return data;
  };

  const getArticlesByType = async (type) => {
    const supabase = getClient();

    if (type != "guide" && type != "blog") {
      console.error("Invalid article type:", type);
      return null;
    }

    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, title, slug, content, image_path, photo_credits_url, created_at, is_published,  category:category_id (name)"
      )
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles by type:", error);
    }

    return data;
  };

  const getAllReports = async () => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        *, 
        report_messages:report_messages (
          message:messages (*)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
    }

    return data;
  };

  const getUserSlugFromId = async (userId) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("slug")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user slug:", error);
    }

    return data?.slug;
  };

  const getChatFilePublicUrl = async (fileName) => {
    const supabase = getClient();

    const { data } = supabase.storage
      .from("chat-files")
      .getPublicUrl(`messages/${fileName}`);

    return data.publicUrl;
  };

  /*------------------*/
  /* Update functions */
  /*------------------*/

  const updateUsername = async (username, userId) => {
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio,
      })
      .eq("user_id", userId);

    if (error) throw error;
  };

  const updateStatus = async (userId, status) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("presence")
      .upsert({ user_id: userId, status: status ? "online" : "offline" });

    if (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateGender = async (genderID, userId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("profiles")
      .update({ gender_id: genderID })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating gender in Supabase:", error);
    }
  };

  const updateTagline = async (tagline, userId) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({ tagline })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating tagline:", error);
    }
  };

  const updateProfilePhoto = async (avatarUrl, userId) => {
    const supabase = getClient();

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
    const supabase = getClient();

    const { error } = await supabase
      .from("profiles")
      .update({ site_url: siteUrl })
      .eq("user_id", userId);

    if (error) throw error;
  };

  const updateInterests = async (interestsArray, userId) => {
    const supabase = getClient();

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

  const updateMessage = async (messageId, newContent) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("messages")
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      console.error("Error updating message:", error);
      throw error;
    }

    return data;
  };

  async function updateUserProfileAfterLinking({ user_id, email, provider }) {
    const supabase = getClient();

    return supabase
      .from("profiles")
      .update({
        email,
        provider,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select()
      .single();
  }

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
    const supabase = getClient();

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

  async function upsertProfileWithJoins(payload) {
    const supabase = getClient();

    return supabase.rpc("upsert_profile_with_joins", {
      p_user_id: payload.user_id,
      p_displayname: payload.displayname,
      p_age: payload.age,
      p_gender_id: payload.gender_id,
      p_status_id: payload.status_id ?? null,
      p_avatar_url: payload.avatar_url ?? null,
      p_country_id: payload.country_id ?? null,
      p_state_id: payload.state_id ?? null,
      p_city_id: payload.city_id ?? null,
      p_bio: payload.bio ?? null,
      p_interests: Array.isArray(payload.interests) ? payload.interests : [],
      p_descriptions: Array.isArray(payload.descriptions)
        ? payload.descriptions
        : [],
      p_slug: payload.slug ?? null,
      p_provider: payload.provider ?? "anonymous",
    });
  }

  const updateMessagesAsRead = async (receiverUserId, senderUserId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", receiverUserId)
      .eq("sender_id", senderUserId)
      .eq("read", false); // Ensures only unread messages are affected

    if (error) throw error;
  };

  const updateAIInteractionCount = async (senderUserId, interactionCount) => {
    const supabase = getClient();

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

  const updateAvatarDecoration = async (userId, avatarDecUrl) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_decoration_url: avatarDecUrl })
      .eq("user_id", userId);

    if (error && error.status !== 204) {
      console.error("Error updating decoration:", error);
    }
  };

  const updateCategory = async (slug, data) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("categories")
      .update(data)
      .eq("slug", slug);

    if (error && error.status !== 204) {
      console.error("Error udpating category:", error);
    }
  };

  const updateTag = async (slug, data) => {
    const supabase = getClient();

    const { error } = await supabase.from("tags").update(data).eq("slug", slug);

    if (error && error.status !== 204) {
      console.error("Error udpating tag:", error);
    }
  };

  const updateArticle = async (id, payload) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error updating article:", error);
    }

    return { data, error };
  };

  const updateArticleCategory = async (articleId, categoryId) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .update({ category_id: categoryId })
      .eq("id", articleId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error updating article category:", error);
    }

    return { data, error };
  };

  const updateArticleTags = async (articleId, tagIds) => {
    const supabase = getClient();

    await supabase.from("article_tags").delete().eq("article_id", articleId);

    // Re-insert tag associations
    const insertData = tagIds.map((tag_id) => ({
      article_id: articleId,
      tag_id,
    }));
    const { error } = await supabase.from("article_tags").insert(insertData);

    if (error) {
      console.error("Error updating article tags:", error);
    }
  };

  const updateLastActive = async (userId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("profiles")
      .update({ last_active: new Date() })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating last active:", error);
    }
  };

  const updateSoundSetting = async (userId, enabled) => {
    const supabase = getClient();

    return await supabase
      .from("profiles")
      .update({ sound_notifications_enabled: enabled })
      .eq("user_id", userId);
  };

  const saveAvatar = async (userId, avatarUrl) => {
    const supabase = getClient();

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error saving avatar:", err.message);
      return false;
    }
  };

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
    const supabase = getClient();

    const slugUser = displayname
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace("_", "-");

    const { data, error } = await supabase
      .from("profiles")
      .insert({
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
        slug: slugUser,
        ip: ip,
        site_url: siteUrl,
        bio: bio,
      })
      .select("user_id")
      .maybeSingle();

    if (error || !data?.user_id) {
      console.error("Error inserting profile or no ID returned:", error);
      return { error };
    }

    const profileId = data.user_id;
    const defaultFavoriteId = "7d20548d-8a9d-4190-bce5-90c8d74c4a56"; // this is santa clause

    try {
      await insertFavorite(profileId, defaultFavoriteId);
      await upvoteUserProfile(defaultFavoriteId, profileId);
    } catch (e) {
      console.error("Error inserting default favorite/upvote:", e);
    }

    return { error: null };
  };

  const insertProfileFromObject = async (profile) => {
    const supabase = getClient();

    const {
      gender_id = null,
      status_id = null,
      age = null,
      country_id = null,
      state_id = null,
      city_id = null,
      username = null,
      avatar_url = null,
      user_id,
      provider = "anonymous",
      displayname,
      ip = null,
      site_url = null,
      bio = null,
    } = profile;

    if (!user_id) return { error: new Error("user_id is required") };
    if (!displayname) return { error: new Error("displayname is required") };

    // build a slug and ensure uniqueness
    const baseSlug = makeSlug(displayname);
    const slug = await ensureUniqueSlug(supabase, baseSlug);

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        gender_id,
        status_id,
        age,
        country_id,
        state_id,
        city_id,
        username,
        avatar_url,
        user_id,
        provider,
        displayname,
        slug, // ← required, now set
        ip,
        site_url,
        bio,
      })
      .select("user_id")
      .maybeSingle();

    if (error || !data?.user_id) {
      console.error("Error inserting profile or no ID returned:", error);
      return { error };
    }

    const profileId = data.user_id;
    const defaultFavoriteId = "7d20548d-8a9d-4190-bce5-90c8d74c4a56"; // Santa

    try {
      await insertFavorite(profileId, defaultFavoriteId);
      await upvoteUserProfile(defaultFavoriteId, profileId);
    } catch (e) {
      console.error("Error inserting default favorite/upvote:", e);
      // non-fatal
    }

    return { error: null };
  };

  const insertMessage = async (
    receiverId,
    senderId,
    message,
    replyToMessageId = null,
    fileUrl = null,
    fileType = null,
    fileName = null
  ) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: message,
        reply_to_message_id: replyToMessageId,
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
      })
      .select("*");

    if (error) {
      console.error("Error sending message:", error);
    } else if (senderId) {
      await updateLastActive(senderId);
    }

    return data;
  };

  const insertFeedback = async (feedback, userId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("feedback")
      .insert({ feedback_text: feedback });

    if (error) {
      console.error("Error inserting feedback:", error);
    }
  };

  const insertBlockedUser = async (userId, blockedUserId) => {
    const supabase = getClient();

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
    const supabase = getClient();

    const { insertError } = await supabase.from("user_ai_interactions").insert({
      user_id: senderUserId,
      interaction_count: interactionCount,
    });
    return insertError;
  };

  const insertFavorite = async (userId, favoriteUserId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, favorite_user_id: favoriteUserId });

    if (error) {
      console.error("Error inserting favorite:", error);
    }

    return error;
  };

  const insertUserInterest = async (userId, interestId) => {
    const supabase = getClient();

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
    const supabase = getClient();

    const { error } = await supabase.from("user_descriptions").insert({
      user_id: userId,
      descriptions_id: descriptionId,
    });

    if (error) {
      console.error("Error inserting description:", error);
    }

    return error;
  };

  const insertArticle = async (article) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: article.title,
        slug: article.slug,
        content: article.content,
        image_path: article.image_path,
        photo_credits_url: article.photo_credits_url,
        photo_credits_html: article.photo_credits_html,
        category_id: article.category_id,
        type: article.type,
        is_published: article.is_published,
        created_at: new Date(),
      })
      .select("id") // important to get the inserted id
      .single();

    console.log("Inserted article:", data);
    if (error) {
      console.error("Error inserting article:", error);
      return error;
    }

    const articleId = data.id;

    // Step 2: Insert tag relations
    const tagInserts = article.tag_ids.map((tagId) => ({
      article_id: articleId,
      tag_id: tagId,
    }));

    console.log("inserting tags:", tagInserts);

    const { error: tagInsertError } = await supabase
      .from("article_tags")
      .insert(tagInserts);

    if (tagInsertError) {
      console.error("Error linking tags to article:", tagInsertError);
      return tagInsertError;
    }

    console.log("good");

    return null; // no error
  };

  const deleteCategoryAndReassign = async (categoryId, fallbackCategoryId) => {
    const supabase = getClient();

    if (!categoryId || !fallbackCategoryId) {
      return { error: new Error("Category and fallback are required") };
    }
    if (categoryId === fallbackCategoryId) {
      return { error: new Error("Fallback category must be different") };
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update({ category_id: fallbackCategoryId })
      .eq("category_id", categoryId);

    if (updateError) {
      console.error("Error reassigning articles before delete:", updateError);
      return { error: updateError };
    }

    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (deleteError) {
      console.error("Error deleting category:", deleteError);
      return { error: deleteError };
    }

    return { error: null };
  };

  const insertCategory = async (category) => {
    const supabase = getClient();

    const { error } = await supabase.from("categories").insert({
      name: category.name,
      slug: category.slug,
    });

    if (error) {
      console.error("Error inserting category:", error);
    }
    return error;
  };

  const insertTag = async (tag) => {
    const supabase = getClient();

    const { error } = await supabase.from("tags").insert({
      name: tag.name,
      slug: tag.slug,
    });

    if (error) {
      console.error("Error inserting tag:", error);
    }
    return error;
  };

  const insertReport = async (
    currentUserId,
    reportedUserId,
    categories,
    reason,
    messages
  ) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("reports")
      .insert({
        reporter_id: currentUserId,
        reported_user_id: reportedUserId,
        categories,
        reason,
      })
      .select("id") // important to get the inserted id
      .single();

    if (error) {
      console.error("Error submitting report:", error);
      return error;
    }

    const reportId = data.id;

    // Insert messages related to the report
    for (const message of messages) {
      await insertReportMessages(reportId, message.id);
    }
  };

  const insertReportMessages = async (reportId, messageId) => {
    const supabase = getClient();

    const { error } = await supabase.from("report_messages").insert({
      report_id: reportId,
      message_id: messageId,
    });

    if (error) {
      console.error("Error inserting report message:", error);
      return error;
    }
  };

  /*------------------*/
  /* Delete functions */
  /*------------------*/

  const deleteChatWithUser = async (userId, userToDeleteId) => {
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

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

  const deleteReport = async (reportId) => {
    const supabase = getClient();

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("Error deleting report:", error);
    } else {
      console.log("Report deleted successfully");
    }
  };

  /*-----------------*/
  /* Other Functions */
  /*-----------------*/

  const checkDisplayNameExists = async (displayName) => {
    const cleaned = displayName.trim().toLowerCase();
    const supabase = getClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("displayname", { head: false })
      .ilike("displayname", cleaned) // case-insensitive match
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking displayname:", error);
    }

    return { data, error };
  };

  const hasInterests = async (userId) => {
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

    const error = await supabase.storage
      .from("profile-images")
      .upload(filePath, file, { upsert: true });

    return error;
  };

  const uploadChatFile = async (fileName, file) => {
    const supabase = getClient();

    const { data, error } = await supabase.storage
      .from("chat-files")
      .upload(`messages/${fileName}`, file);

    if (error) {
      console.error("Upload error:", error);
    }

    return error;
  };

  const uploadArticleImage = async (file, articleId) => {
    if (!file) return null;

    const extension = file?.name?.split(".").pop();
    if (!extension) {
      console.error("Could not determine file extension.");
      return null;
    }

    const supabase = getClient();

    const timestamp = Date.now();
    const suffix = articleId ? `-${articleId}` : `-${uuidv4()}`;
    const fileName = `article${suffix}-${timestamp}.${extension}`;

    console.log("Uploading image:", file.name, "articleId:", articleId);

    const { data, error } = await supabase.storage
      .from("articles")
      .upload(fileName, file);

    if (error) {
      console.error("Upload failed:", error.message);
      return null;
    }

    return data.path;
  };

  const trackPresence = async (userId) => {
    // not sure about this...
    window.addEventListener(
      "beforeunload",
      async () => await updatePresence(userId, "offline")
    );

    inactivityCheckInterval = setInterval(async () => {
      await updatePresence(userId, "online"); // touch + keep-alive
      await checkInactivityForAllUsers();
    }, 5 * 60 * 1000);
  };

  const stopTracking = async () => {
    if (inactivityCheckInterval) {
      clearInterval(inactivityCheckInterval);
    }
  };

  const markUserForDeletion = async (userId) => {
    await $fetch("/api/markUser", {
      method: "POST",
      body: {
        userId,
        deleteMe: true,
        deleteRequestedAt: new Date().toISOString(),
      },
    });
  };

  const unmarkUserForDeletion = async (userId) => {
    await $fetch("/api/markUser", {
      method: "POST",
      body: {
        userId,
        deleteMe: false,
        deleteRequestedAt: null,
      },
    });
  };

  const isNotificationsEnabled = async (userId) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("sound_notifications_enabled")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching notification settings:", error);
      return false;
    }

    return data?.sound_notifications_enabled ?? false;
  };

  const isAI = async (userId) => {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("is_ai")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error checking if user is AI:", error);
      return false;
    }

    return data?.is_ai ?? false;
  };

  /*----------------*/
  /* Auth functions */
  /*----------------*/
  /*Get*/
  const authGetUser = async () => {
    if (!import.meta.client) {
      return { data: { user: null }, error: null };
    }
    const supabase = getClient();

    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  };

  const authExchangeCodeForSession = async (code) => {
    const supabase = getClient();

    // code should be just the ?code=... value, not the full URL
    if (!code || typeof code !== "string") {
      console.error(
        "[authExchangeCodeForSession] missing or invalid code:",
        code
      );
      return { data: null, error: new Error("Missing authorization code") };
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error("[authExchangeCodeForSession] error:", error);
      return { data, error };
    } catch (err) {
      console.error("[authExchangeCodeForSession] unexpected error:", err);
      return { data: null, error: err };
    }
  };

  const authRefreshSession = async () => {
    const supabase = getClient();

    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Error refreshing session:", error);
    }

    return { data, error };
  };

  /*Update*/
  const authUpdateProfile = async (deleteMe, deleteRequestedAt) => {
    const supabase = getClient();

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
    const supabase = getClient();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    return { error };
  };

  // const signInWithOtp = async (email, { next = "/chat" } = {}) => {
  //   const supabase = getClient();
  //   const config = getConfig();

  //   const origin =
  //     typeof window !== "undefined"
  //       ? window.location.origin
  //       : config.public.SITE_URL || "https://imchatty.com";

  //   const normalizeRedirect = (value) => {
  //     if (!value) return null;
  //     if (/^https?:\/\//i.test(value)) {
  //       return value;
  //     }
  //     // allow specifying a path such as "/loginemail"
  //     const leadingSlash = value.startsWith("/") ? "" : "/";
  //     return `${origin}${leadingSlash}${value}`;
  //   };

  //   const envRedirect = normalizeRedirect(
  //     config.public.SUPABASE_REDIRECT?.trim()
  //   );
  //   const fallbackRedirect = `${origin}/callback?next=${encodeURIComponent(
  //     next
  //   )}`;
  //   const emailRedirectTo = envRedirect || fallbackRedirect;

  //   const { error } = await supabase.auth.signInWithOtp({
  //     email: email,
  //     options: {
  //       emailRedirectTo,
  //     },
  //   });
  //   if (error) throw error;
  // };


const signInWithOtp = async (
  email,
  { next = "/chat", redirectTo } = {}
) => {
  const supabase = getClient();
  const config = getConfig();

  const origin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : config.public.SITE_URL || "https://imchatty.com";

  const normalizeRedirect = (value) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const leadingSlash = value.startsWith("/") ? "" : "/";
    return `${origin}${leadingSlash}${value}`;
  };

  const envRedirect = normalizeRedirect(
    (config.public.SUPABASE_REDIRECT || "").trim()
  );
  const defaultRedirect = `${origin}/callback?next=${encodeURIComponent(next)}`;
  const emailRedirectTo =
    normalizeRedirect(redirectTo) || envRedirect || defaultRedirect;

  console.info("[auth] emailRedirectTo:", emailRedirectTo);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true, // optional
    },
  });
  if (error) throw error;
};


  
  const signInAnonymously = async () => {
    const supabase = getClient();

    const { data, error } = await supabase.auth.signInAnonymously();

    return { data, error };
  };

  const signInWithOAuth = async (provider, next = "/chat") => {
    const origin = window.location.origin;

    const redirectTo = `${origin}/callback?next=${encodeURIComponent(next)}`;
    const supabase = getClient();
    // No skipBrowserRedirect here; let the SDK navigate
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) console.error("[login] signInWithOAuth error", error);
  };

  const linkIdentity = async ({ provider, email, redirectTo }) => {
    console.log("Linking identity with provider:", provider);
    const supabase = getClient();

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
    const supabase = getClient();

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
    const supabase = getClient();

    await supabase.auth.updateUser({
      user_metadata: { isAnonymous: true },
    });
  };

  async function ensureAnonymousUser() {
    const { authGetUser, signInAnonymously, authMarkUserAsAnonymous } = useDb();

    try {
      // Check for an existing user session (registered or anonymous)
      const { data, error } = await authGetUser();

      if (error && error.message !== "Auth session missing!") {
        console.error(
          "[ensureAnonymousUser] authGetUser error:",
          error.message
        );
        throw error;
      }

      if (data?.user) {
        console.log(
          "[ensureAnonymousUser] Existing user found:",
          data.user.email || "anonymous"
        );
        return data.user;
      }

      // No user session, create anonymous user
      const { data: anonData, error: anonError } = await signInAnonymously();

      if (anonError) {
        console.error(
          "[ensureAnonymousUser] signInAnonymously failed:",
          anonError.message
        );
        throw anonError;
      }

      if (!anonData?.user) {
        throw new Error("Anonymous sign-in succeeded but no user returned.");
      }

      await authMarkUserAsAnonymous();
      console.log(
        "[ensureAnonymousUser] New anonymous user created:",
        anonData.user.id
      );
      return anonData.user;
    } catch (err) {
      console.error("[ensureAnonymousUser] Unexpected error:", err.message);
      throw err;
    }
  }

  const makeSlug = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // spaces -> hyphens
      .replace(/[^\w-]+/g, "") // strip non-word chars
      .replace(/_+/g, "-") // underscores -> hyphens
      .replace(/-+/g, "-") // collapse dup hyphens
      .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens

  const ensureUniqueSlug = async (supabase, base) => {
    const trySlugs = [base];
    // add two random fallbacks if needed
    for (let i = 0; i < 2; i++) {
      const rand = Math.random().toString(36).slice(2, 6); // 4 chars
      trySlugs.push(`${base}-${rand}`);
    }
    for (const slug of trySlugs) {
      const supabase = getClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      if (!data && !error) return slug; // slug free
    }
    // if everything somehow exists, append timestamp
    return `${base}-${Date.now().toString(36)}`;
  };

  const subscribeToMessages = async (
    me,
    { onInsert, onUpdate, onDelete } = {}
  ) => {
    const supabase = getClient();
    const meId = String(me);

    // If already wired for this user, just return the existing unsubscribe
    if (_messagesChan && _messagesFor === meId) {
      return async () => {
        const ch = _messagesChan;
        _messagesChan = null;
        _messagesFor = null;
        _messagesInflight = null;
        try {
          await ch.unsubscribe?.();
        } catch {}
        try {
          await supabase.removeChannel?.(ch);
        } catch {}
      };
    }

    // If a subscribe is already in-flight for this user, await and return its unsubscribe
    if (_messagesInflight && _messagesFor === meId) {
      return _messagesInflight;
    }

    // Clean previous if it's for a different user
    if (_messagesChan) {
      try {
        await _messagesChan.unsubscribe?.();
      } catch {}
      try {
        await supabase.removeChannel?.(_messagesChan);
      } catch {}
      _messagesChan = null;
      _messagesFor = null;
      _messagesInflight = null;
    }

    const mkChannel = (name, opts) =>
      typeof supabase.channel === "function"
        ? supabase.channel(name, opts)
        : supabase.realtime.channel(name, opts);

    const ch = mkChannel(`messages-${meId}`);

    // Handlers (keep separate INSERT/UPDATE/DELETE or switch to '*' if you prefer)
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${meId}`,
      },
      (payload) => onInsert?.(payload.new)
    );
    ch.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${meId}`,
      },
      (payload) => onUpdate?.(payload)
    );
    ch.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${meId}`,
      },
      (payload) => onDelete?.(payload.old)
    );

    // Subscribe exactly once
    if (ch.__didSubscribe) {
      // Shouldn’t happen; be graceful.
    } else {
      ch.__didSubscribe = true;
    }

    // Single-flight promise for callers
    _messagesFor = meId;
    _messagesInflight = (async () => {
      await new Promise((resolve, reject) => {
        ch.subscribe((status) => {
          // (Optional) comment this out to stop console spam
          // console.log("[rt][messages][status]", status);

          if (status === "SUBSCRIBED") resolve();
          else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
            // Let caller decide to resubscribe later; don't recurse here
            // Resolve anyway to keep API simple; your UI can observe it via onUpdate/onInsert not firing.
            resolve();
          }
        });
      });

      _messagesChan = ch;

      // Return a stable unsubscribe function
      return async () => {
        if (_messagesChan === ch) {
          _messagesChan = null;
          _messagesFor = null;
          _messagesInflight = null;
        }
        try {
          await ch.unsubscribe?.();
        } catch {}
        try {
          await supabase.removeChannel?.(ch);
        } catch {}
      };
    })();

    return _messagesInflight;
  };

  const unsubscribeMessages = async () => {
    const ch = _messagesChan;
    if (!ch) return false;

    // Clear module refs early so a new subscribe can start immediately
    _messagesChan = null;
    _messagesFor = null;

    try {
      // 1) Ask the channel to close
      await ch.unsubscribe?.();
    } catch (e) {
      console.warn("[rt] unsubscribe error (safe to ignore):", e?.message || e);
    }

    try {
      // 2) Remove it from the client's channel list (optional but tidy)
      const client = getClient();
      await client.removeChannel?.(ch);
    } catch (e) {
      console.warn(
        "[rt] removeChannel error (safe to ignore):",
        e?.message || e
      );
    }

    return true;
  };

  const fetchUnreadCounts = async (me) => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("messages")
      .select("sender_id") // just the column we need
      .eq("receiver_id", me)
      .eq("read", false);

    if (error) throw error;

    const map = {};
    for (const row of data || []) {
      const k = String(row.sender_id);
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  };

  const markThreadAsRead = async (me, peerId) => {
    const supabase = getClient();
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", me)
      .eq("sender_id", peerId)
      .eq("read", false);
  };

  return {
    getClient,
    getServerClientFrom,
    getCountryByIsoCode,
    getCountries,
    getStateByCodeAndCountry,
    getStatesFromCountryId,
    getStatesFromCountryName,
    getCityByNameAndState,
    getCitiesFromCountryId,
    getCities,
    getCitiesFromStateId,
    //getUserStatus,
    getStatuses,
    getGenders,
    getGenderFromId,
    getLookingForId,
    getAvatarDecorationFromId,
    getMessageById,
    getMessagesBetweenUsers,
    getMessagesOfAUserWithUser,
    getAIInteractionCount,
    recordAIInteraction,
    getCurrentAIInteractionCount,
    getInterests,
    getInterestsIds,
    getInterestsIcons,
    getDescriptions,
    getUsersFromIds,
    getUserDisplayNameFromId,
    getUserFromName,
    getUserProfileFromId,
    getUserProfileFunctionFromId,
    getUserProfileFromDisplayName,
    getUserProfileFromSlug,
    getUserProfilePhoto,
    getRegisteredUsersIds,
    getAllUsersIdsWithoutAvatar,
    getAllProfiles,
    getAdminProfiles,
    getUserActivitySummary,
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
    getAllTags,
    getAllCategories,
    getAllPeople,
    getAllArticlesWithTags,
    getAllPublishedArticlesWithTags,
    getPublishedArticlesPage,
    getArticleBySlug,
    getThreadIdByArticleId,
    getThreadKeyByArticleId,
    getCountArticleByTag,
    getCountArticleByCategory,
    getArticlesByTagSlug,
    getArticlesByPersonSlug,
    getTagsByArticle,
    getArticlesbyCategorySlug,
    getArticlesByType,
    getAllReports,
    getUserSlugFromId,
    getChatFilePublicUrl,

    updateUsername,
    updateUserProfileAfterLinking,
    updateProvider,
    updateBio,
    updateStatus,
    updateGender,
    updateTagline,
    updateProfilePhoto,
    updateSiteURL,
    updateInterests,
    updateProfile,
    upsertProfileWithJoins,
    updateMessage,
    updateMessagesAsRead,
    updateAIInteractionCount,
    // updatePresence,
    updateAvatarDecoration,
    updateCategory,
    updateTag,
    updateArticle,
    updateArticleCategory,
    updateArticleTags,
    updateLastActive,
    updateSoundSetting,
    saveAvatar,

    insertProfile,
    insertProfileFromObject,
    insertMessage,
    insertFeedback,
    insertBlockedUser,
    insertInteractionCount,
    insertFavorite,
    insertUserInterest,
    insertUserDescription,
    insertArticle,
    insertCategory,
    insertTag,
    deleteCategoryAndReassign,
    insertReport,

    deleteChatWithUser,
    deleteFavorite,
    deleteUserInterest,
    unblockUser,
    deleteUpvoteFromUser,
    deleteReport,

    checkDisplayNameExists,
    hasInterests,
    hasEmail,
    upvoteUserProfile,
    downvoteUserProfile,
    uploadProfilePhoto,
    uploadChatFile,
    uploadArticleImage,
    trackPresence,
    stopTracking,
    // checkInactivityForAllUsers,
    markUserForDeletion,
    unmarkUserForDeletion,
    isNotificationsEnabled,
    isAI,

    authGetUser,
    authRefreshSession,
    authExchangeCodeForSession,
    authUpdateProfile,
    authSignOut,
    signInWithOtp,
    signInAnonymously,
    signInWithOAuth,
    linkIdentity,
    updateUserEmail,
    authMarkUserAsAnonymous,
    ensureAnonymousUser,

    subscribeToMessages,
    unsubscribeMessages,
    fetchUnreadCounts,
    markThreadAsRead,
  };
};
