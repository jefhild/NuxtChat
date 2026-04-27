import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

const EMPTY_RESULT = {
  upvotedProfiles: [],
  upvotedMeProfiles: [],
};

function normalizeProfileRow(profile, countryById) {
  if (!profile?.id || !profile?.user_id) return null;

  const country = countryById.get(profile.country_id) || {};

  return {
    profile_id: profile.id,
    displayname: profile.displayname || "",
    avatar_url: profile.avatar_url || null,
    gender_id: profile.gender_id ?? null,
    user_id: profile.user_id,
    upvotes_count: Number(profile.upvotes_count ?? 0),
    country: country.name || "",
    country_emoji: country.emoji || "",
    age: profile.age ?? null,
  };
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profileRow, error: profileError } = await supa
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: profileError.message });
  }

  if (!profileRow?.id) {
    return EMPTY_RESULT;
  }

  const [outgoingVotesResult, incomingVotesResult] = await Promise.all([
    supa
      .from("votes")
      .select(`
        profile_id,
        created_at,
        profile:profiles!fk_profile(
          id,
          user_id,
          displayname,
          avatar_url,
          gender_id,
          upvotes_count,
          age,
          country_id
        )
      `)
      .eq("user_id", user.id)
      .eq("vote_type", "upvote")
      .order("created_at", { ascending: false }),
    supa
      .from("votes")
      .select("user_id, created_at")
      .eq("profile_id", profileRow.id)
      .eq("vote_type", "upvote")
      .order("created_at", { ascending: false }),
  ]);

  if (outgoingVotesResult.error) {
    throw createError({
      statusCode: 500,
      statusMessage: outgoingVotesResult.error.message,
    });
  }

  if (incomingVotesResult.error) {
    throw createError({
      statusCode: 500,
      statusMessage: incomingVotesResult.error.message,
    });
  }

  const outgoingProfilesRaw = (outgoingVotesResult.data || [])
    .map((row) => row.profile)
    .filter(Boolean);

  const incomingUserIds = [
    ...new Set(
      (incomingVotesResult.data || []).map((row) => row.user_id).filter(Boolean)
    ),
  ];

  let incomingProfilesRaw = [];
  if (incomingUserIds.length) {
    const { data, error } = await supa
      .from("profiles")
      .select("id, user_id, displayname, avatar_url, gender_id, upvotes_count, age, country_id")
      .in("user_id", incomingUserIds);

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }

    incomingProfilesRaw = data || [];
  }

  const countryIds = [
    ...new Set(
      [...outgoingProfilesRaw, ...incomingProfilesRaw]
        .map((profile) => profile?.country_id)
        .filter(Boolean)
    ),
  ];

  const countryById = new Map();
  if (countryIds.length) {
    const { data: countries, error: countriesError } = await supa
      .from("countries")
      .select("id, name, emoji")
      .in("id", countryIds);

    if (countriesError) {
      throw createError({
        statusCode: 500,
        statusMessage: countriesError.message,
      });
    }

    for (const country of countries || []) {
      countryById.set(country.id, country);
    }
  }

  const upvotedProfiles = outgoingProfilesRaw
    .map((profile) => normalizeProfileRow(profile, countryById))
    .filter(Boolean);

  const incomingProfileByUserId = new Map(
    incomingProfilesRaw.map((profile) => [
      profile.user_id,
      normalizeProfileRow(profile, countryById),
    ])
  );

  const upvotedMeProfiles = (incomingVotesResult.data || [])
    .map((vote) => incomingProfileByUserId.get(vote.user_id))
    .filter(Boolean);

  return {
    upvotedProfiles,
    upvotedMeProfiles,
  };
});
