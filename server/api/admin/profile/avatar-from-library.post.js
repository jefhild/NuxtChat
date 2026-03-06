import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";

const LIBRARY_BUCKET = "profile-image-library";
const AVATAR_BUCKET = "profile-images";
const MAX_WEBP_BYTES = 50 * 1024;
const AVATAR_SIZE = 256;

const encodeWebp = async (inputBuffer, quality) => {
  return sharp(inputBuffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality, effort: 4 })
    .toBuffer();
};

const compressToWebp = async (inputBuffer) => {
  let quality = 70;
  let output = await encodeWebp(inputBuffer, quality);
  while (output.length > MAX_WEBP_BYTES && quality > 40) {
    quality -= 10;
    output = await encodeWebp(inputBuffer, quality);
  }
  return output;
};

export default defineEventHandler(async (event) => {
  const authUser = await serverSupabaseUser(event);
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const photoId = String(body?.photoId || "");
  const userId = String(body?.userId || "");
  if (!photoId) {
    throw createError({ statusCode: 400, statusMessage: "Missing photoId" });
  }
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Missing userId" });
  }

  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (meErr) {
    throw createError({ statusCode: 500, statusMessage: meErr.message });
  }
  if (!me?.is_admin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const { data: photo, error: photoError } = await supabase
    .from("profile_photos")
    .select("id, user_id, storage_path")
    .eq("id", photoId)
    .eq("user_id", userId)
    .single();

  if (photoError || !photo?.storage_path) {
    throw createError({ statusCode: 404, statusMessage: "Photo not found" });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(photo.storage_path, 60);
  if (signedError || !signedData?.signedUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load library photo",
    });
  }

  const imageResponse = await fetch(signedData.signedUrl);
  if (!imageResponse.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to read library photo",
    });
  }

  const sourceBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const webpBuffer = await compressToWebp(sourceBuffer);

  const filePath = `${userId}/avatar.webp`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to upload avatar",
    });
  }

  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);
  const avatarUrl = publicData?.publicUrl || "";
  if (!avatarUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve avatar URL",
    });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId);

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile avatar",
    });
  }

  return { success: true, avatarUrl };
});
