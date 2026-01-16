// server/api/profile/ensure.post.js
import { defineEventHandler, getRequestHeader } from "h3";
import { createClient } from "@supabase/supabase-js";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

const slugify = (s) =>
  String(s || "user")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/_+/g, "-");

const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
const DEFAULT_LOCALE = "en";
const AVATAR_BUCKET = "profile-avatars";
const GENDER_FOLDERS = {
  1: "male",
  2: "female",
  3: "other",
};

const resolveGenderFolder = (genderId) => {
  const id = Number(genderId);
  return GENDER_FOLDERS[id] || "other";
};

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const normalizeLocale = (locale) => {
  if (!locale) return null;
  const primary = String(locale).trim().toLowerCase().split("-")[0];
  return primary || null;
};

const pickPreferredLocale = (cookieHeader, acceptLanguageHeader) => {
  const cookieLocale = normalizeLocale(
    getCookieValue(cookieHeader, "i18n_redirected")
  );
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  if (acceptLanguageHeader) {
    const first = acceptLanguageHeader.split(",")[0];
    const normalized = normalizeLocale(first);
    if (normalized && SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_LOCALE;
};

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

const pickRandomAvatarUrl = async (genderId, config) => {
  const supabaseUrl = config.public?.SUPABASE_URL;
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const folder = resolveGenderFolder(genderId);
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(folder, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

  if (listError) return null;

  const eligible = (files || []).filter((file) => file?.name);
  if (!eligible.length) return null;

  const selection = eligible[Math.floor(Math.random() * eligible.length)];
  const filePath = `${folder}/${selection.name}`;
  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return publicData?.publicUrl || null;
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
    console.log("Picked identity:", { provider, idData });

  const { displayname, avatar_url } = extractDisplayAvatar(user, idData);

  const ip =
    getRequestHeader(event, "cf-connecting-ip") ||
    getRequestHeader(event, "x-real-ip") ||
    (getRequestHeader(event, "x-forwarded-for") || "").split(",")[0].trim() ||
    null;

  const cookieHeader = getRequestHeader(event, "cookie");
  const acceptLanguage = getRequestHeader(event, "accept-language");
  const preferred_locale = pickPreferredLocale(cookieHeader, acceptLanguage);

  const baseSlug = slugify(displayname);

  const config = useRuntimeConfig();
  const genderId = null;
  const avatarGenderId = genderId ?? 3;
  const defaultAvatarUrl = avatar_url
    ? null
    : await pickRandomAvatarUrl(avatarGenderId, config);

  const payload = {
    user_id: user.id,
    provider,
    displayname,
    slug: baseSlug,
    avatar_url: avatar_url || defaultAvatarUrl,
    username: null,
    gender_id: genderId,
    status_id: null,
    age: null,
    country_id: null,
    state_id: null,
    city_id: null,
    site_url: null,
    bio: null,
    ip,
    preferred_locale,
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
  const defaultLookingForId = 1;
  try {
    await client
      .from("favorites")
      .insert({ user_id: ins.user_id, favorite_id: defaultFavoriteId });
    await client.from("profile_upvotes").insert({
      subject_user_id: defaultFavoriteId,
      voter_user_id: ins.user_id,
    });
    await client
      .from("user_looking_for")
      .insert({ user_id: ins.user_id, looking_for_id: defaultLookingForId });
  } catch (e) {
    console.warn("Defaults failed:", e);
  }

  return { ok: true, created: true };
});
