// server/api/profile/ensure.post.js
import { defineEventHandler, getRequestHeader } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

const slugify = (s) =>
  String(s || "user")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/_+/g, "-");

const pickIdentity = (user) => {
  const provider = user?.app_metadata?.provider || null;
  const identity = Array.isArray(user?.identities)
    ? user.identities.find((i) => i.provider === provider)
    : null;
  return { provider, idData: (identity && identity.identity_data) || {} };
};

const extractDisplayAvatar = (user, idData) => {
  const displayname =
    idData.name ||
    idData.full_name ||
    [idData.given_name, idData.family_name].filter(Boolean).join(" ") ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "User");

  const avatar_url =
    idData.picture ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  return { displayname, avatar_url };
};

export default defineEventHandler(async (event) => {
  // 1️⃣ Authenticate user from Supabase cookie/session
  const user = await serverSupabaseUser(event);
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2️⃣ Scoped Supabase client (uses user's JWT; respects RLS)
  const client = await serverSupabaseClient(event);

  // 3️⃣ Check if profile already exists
  const { data: existing, error: selErr } = await client
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr && selErr.code !== "PGRST116") throw selErr;
  if (existing) return { ok: true, created: false };

  // 4️⃣ Gather metadata for new profile
  const { provider, idData } = pickIdentity(user);
  const { displayname, avatar_url } = extractDisplayAvatar(user, idData);

  const ip =
    getRequestHeader(event, "cf-connecting-ip") ||
    getRequestHeader(event, "x-real-ip") ||
    (getRequestHeader(event, "x-forwarded-for") || "").split(",")[0].trim() ||
    null;

  const baseSlug = slugify(displayname);

  const payload = {
    user_id: user.id,
    provider,
    displayname,
    slug: baseSlug,
    avatar_url,
    username: null,
    gender_id: null,
    status_id: null,
    age: null,
    country_id: null,
    state_id: null,
    city_id: null,
    site_url: null,
    bio: null,
    ip,
  };

  // 5️⃣ Insert (idempotent, safe with unique index on user_id)
  const { data: ins, error: upErr } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "user_id", ignoreDuplicates: false })
    .select("user_id")
    .maybeSingle();

  if (upErr) throw upErr;
  if (!ins?.user_id)
    return new Response("Failed to create profile", { status: 500 });

  // 6️⃣ Optional defaults (non-fatal)
  const defaultFavoriteId = "7d20548d-8a9d-4190-bce5-90c8d74c4a56";
  try {
    await client
      .from("favorites")
      .insert({ user_id: ins.user_id, favorite_id: defaultFavoriteId });
    await client.from("profile_upvotes").insert({
      subject_user_id: defaultFavoriteId,
      voter_user_id: ins.user_id,
    });
  } catch (e) {
    console.warn("Defaults failed:", e);
  }

  return { ok: true, created: true };
});
