import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getQuery } from "h3";

const LIBRARY_BUCKET = "profile-image-library";
const AVATAR_BUCKET = "profile-images";
const SIGNED_LIBRARY_MARKER = "/storage/v1/object/sign/profile-image-library/";
const PUBLIC_LIBRARY_MARKER = "/storage/v1/object/public/profile-image-library/";
const SIGNED_AVATAR_MARKER = "/storage/v1/object/sign/profile-images/";
const PUBLIC_AVATAR_MARKER = "/storage/v1/object/public/profile-images/";

const extractPathFromMarker = (avatarUrl, marker) => {
  const raw = String(avatarUrl || "").trim();
  if (!raw) return "";
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) return "";

  const tail = raw.slice(markerIndex + marker.length);
  const [pathPart] = tail.split("?");
  if (!pathPart) return "";

  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {};
  const userId = String(query.userId || query.user_id || "").trim();
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Missing userId" });
  }

  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load profile avatar",
    });
  }

  const avatarUrl = String(profile?.avatar_url || "").trim();
  if (!avatarUrl) {
    return { avatarUrl: "", resolvedFrom: "empty" };
  }

  const libraryPath =
    extractPathFromMarker(avatarUrl, SIGNED_LIBRARY_MARKER) ||
    extractPathFromMarker(avatarUrl, PUBLIC_LIBRARY_MARKER);
  if (libraryPath) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(LIBRARY_BUCKET)
      .createSignedUrl(libraryPath, 60 * 60);
    if (signedError || !signedData?.signedUrl) {
      return { avatarUrl: "", resolvedFrom: "broken_library_url" };
    }
    return { avatarUrl: signedData.signedUrl, resolvedFrom: "library_signed" };
  }

  const profileAvatarPath =
    extractPathFromMarker(avatarUrl, SIGNED_AVATAR_MARKER) ||
    extractPathFromMarker(avatarUrl, PUBLIC_AVATAR_MARKER);
  if (profileAvatarPath) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profileAvatarPath, 60 * 60);
    if (!signedError && signedData?.signedUrl) {
      return { avatarUrl: signedData.signedUrl, resolvedFrom: "avatar_signed" };
    }
  }

  return { avatarUrl, resolvedFrom: "profile" };
});
