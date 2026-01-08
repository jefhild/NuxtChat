import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, readBody } from "h3";

const MAX_WEBP_BYTES = 50 * 1024;
const AVATAR_SIZE = 256;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/;

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
  const body = await readBody(event);
  const { userId, dataUrl } = body || {};

  if (!userId || !dataUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing userId or dataUrl",
    });
  }

  const match = String(dataUrl).match(DATA_URL_REGEX);
  if (!match) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported image format",
    });
  }

  const base64 = match[2];
  const inputBuffer = Buffer.from(base64, "base64");

  if (inputBuffer.length > MAX_INPUT_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: "Image exceeds 2MB",
    });
  }

  const webpBuffer = await compressToWebp(inputBuffer);

  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );
  const filePath = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("profile-images")
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
    .from("profile-images")
    .getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve public URL",
    });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", userId);

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile avatar",
    });
  }

  return { success: true, avatarUrl: publicUrl };
});
