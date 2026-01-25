import sharp from "sharp";
import { randomUUID } from "crypto";
import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const PHOTO_BUCKET = "profile-image-library";
const PHOTO_FOLDER = "library";
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_WEBP_BYTES = 400 * 1024;
const MAX_DIMENSION = 1600;
const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/;

const encodeWebp = async (inputBuffer, quality) => {
  return sharp(inputBuffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
};

const compressToWebp = async (inputBuffer) => {
  let quality = 75;
  let output = await encodeWebp(inputBuffer, quality);
  while (output.length > MAX_WEBP_BYTES && quality > 40) {
    quality -= 10;
    output = await encodeWebp(inputBuffer, quality);
  }
  return output;
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    if (user.is_anonymous) {
      setResponseStatus(event, 403);
      return { error: "Registered users only" };
    }

    const body = (await readBody(event)) || {};
    const dataUrl = body.dataUrl;

    if (!dataUrl) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Missing dataUrl" } };
    }

    const match = String(dataUrl).match(DATA_URL_REGEX);
    if (!match) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Unsupported image format" } };
    }

    const base64 = match[2];
    const inputBuffer = Buffer.from(base64, "base64");

    if (inputBuffer.length > MAX_INPUT_BYTES) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Image exceeds 5MB" } };
    }

    const webpBuffer = await compressToWebp(inputBuffer);

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const filePath = `${user.id}/${PHOTO_FOLDER}/${randomUUID()}.webp`;
    const { error: uploadError } = await supa.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[profile/photos.post] upload error:", uploadError);
      setResponseStatus(event, 500);
      return { error: { stage: "upload", message: uploadError.message } };
    }

    const { data, error: insertError } = await supa
      .from("profile_photos")
      .insert({
        user_id: user.id,
        storage_path: filePath,
        public_url: "",
        status: "pending",
      })
      .select("id, public_url, status, created_at")
      .single();

    if (insertError) {
      console.error("[profile/photos.post] insert error:", insertError);
      setResponseStatus(event, 500);
      return { error: { stage: "insert", message: insertError.message } };
    }

    let signedUrl = "";
    const { data: signedData, error: signedError } = await supa.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(filePath, 60 * 60);
    if (signedError) {
      console.warn("[profile/photos.post] signed url error:", signedError);
    } else {
      signedUrl = signedData?.signedUrl || "";
    }

    return { photo: { ...data, url: signedUrl } };
  } catch (err) {
    console.error("[profile/photos.post] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
