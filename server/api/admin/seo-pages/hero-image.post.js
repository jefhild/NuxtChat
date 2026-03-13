import sharp from "sharp";
import { randomUUID } from "crypto";
import { readBody } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  buildSeoHeroImageUrl,
  SEO_PAGE_IMAGE_BUCKET,
  SEO_PAGE_IMAGE_FOLDER,
} from "~/server/utils/seoPages";

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_WEBP_BYTES = 450 * 1024;
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

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const dataUrl = body.dataUrl;
    const pageType = slugify(body.pageType || "page");
    const slug = slugify(body.slug || "untitled");

    if (!dataUrl) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Missing dataUrl" } };
    }

    const match = String(dataUrl).match(DATA_URL_REGEX);
    if (!match) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Unsupported image format" } };
    }

    const inputBuffer = Buffer.from(match[2], "base64");
    if (inputBuffer.length > MAX_INPUT_BYTES) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Image exceeds 5MB" } };
    }

    const config = useRuntimeConfig(event);
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const webpBuffer = await compressToWebp(inputBuffer);
    const filePath = `${SEO_PAGE_IMAGE_FOLDER}/${pageType}/${slug}-${randomUUID()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(SEO_PAGE_IMAGE_BUCKET)
      .upload(filePath, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      setResponseStatus(event, 500);
      return { error: { stage: "upload", message: uploadError.message } };
    }

    return {
      success: true,
      storagePath: filePath,
      publicUrl: buildSeoHeroImageUrl(config.public.SUPABASE_BUCKET, filePath),
    };
  } catch (err) {
    console.error("[admin/seo-pages.hero-image] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
