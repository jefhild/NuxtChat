import sharp from "sharp";
import { randomUUID } from "crypto";
import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const AVATAR_BUCKET = "profile-avatars";
const MAX_WEBP_BYTES = 70 * 1024;
const AVATAR_SIZE = 256;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/;
const GENDER_FOLDERS = {
  1: "male",
  2: "female",
  3: "other",
};

const encodeWebp = async (inputBuffer, quality) => {
  return sharp(inputBuffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
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

const resolveFolder = (genderId) => {
  const id = Number(genderId);
  return GENDER_FOLDERS[id] || "other";
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (meErr) {
      console.error("[admin/profile-avatars.upload] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const body = (await readBody(event)) || {};
    const genderId = body.genderId;
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
      return { error: { stage: "body", message: "Image exceeds 2MB" } };
    }

    const webpBuffer = await compressToWebp(inputBuffer);
    const folder = resolveFolder(genderId);
    const filePath = `${folder}/${randomUUID()}.webp`;

    const { error: uploadError } = await supa.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[admin/profile-avatars.upload] upload error:", uploadError);
      setResponseStatus(event, 500);
      return { error: { stage: "upload", message: uploadError.message } };
    }

    const { data: publicData } = supa.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    return { success: true, avatarUrl: publicData?.publicUrl || "" };
  } catch (err) {
    console.error("[admin/profile-avatars.upload] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
