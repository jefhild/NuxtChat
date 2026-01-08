import OpenAI from "openai";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, readBody } from "h3";

const MAX_WEBP_BYTES = 50 * 1024;
const AVATAR_SIZE = 256;

const buildPrompt = ({ displayname, gender, age, bio }) => {
  const bioText = String(bio || "").trim();
  const bioSnippet = bioText ? bioText.slice(0, 200) : "";
  const ageText = age ? `, age ${age}` : "";
  return [
    "Create a friendly illustrated avatar headshot.",
    "Simple, clean vector-like cartoon style.",
    "Centered face and shoulders, soft lighting, neutral background.",
    "No text, no logos, no watermarks.",
    `Person: ${displayname || "User"} (${gender || "Other"}${ageText}).`,
    bioSnippet ? `Bio cues: ${bioSnippet}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

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
  const { userId, displayname, gender, age, bio } = body || {};

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Missing userId" });
  }

  const config = useRuntimeConfig();
  const apiKey = config.openaiApiKey || config.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: "Missing OpenAI key" });
  }

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt({ displayname, gender, age, bio });

  const image = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
  });

  const first = image?.data?.[0];
  let rawBuffer;

  if (first?.b64_json) {
    rawBuffer = Buffer.from(first.b64_json, "base64");
  } else if (first?.url) {
    const response = await fetch(first.url);
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Failed to fetch generated image",
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    rawBuffer = Buffer.from(arrayBuffer);
  } else {
    throw createError({
      statusCode: 502,
      statusMessage: "Image generation failed",
    });
  }
  const webpBuffer = await compressToWebp(rawBuffer);

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
