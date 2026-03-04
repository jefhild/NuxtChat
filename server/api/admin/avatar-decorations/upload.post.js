import { randomUUID } from "crypto";
import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const DECORATIONS_BUCKET = "avatar-decorations";
const DECORATIONS_FOLDER = "decorations";
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const DATA_URL_REGEX = /^data:(image\/(?:png|apng|jpeg|jpg|webp|gif));base64,(.+)$/;

const EXT_BY_MIME = {
  "image/png": "png",
  "image/apng": "apng",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const fallbackLabelFromFilename = (name) =>
  String(name || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();

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
      console.error(
        "[admin/avatar-decorations.upload] admin check error:",
        meErr
      );
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const body = (await readBody(event)) || {};
    const dataUrl = body.dataUrl;
    const requestedDisplayName = String(body.displayName || "").trim().slice(0, 80);

    if (!dataUrl) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Missing dataUrl" } };
    }

    const match = String(dataUrl).match(DATA_URL_REGEX);
    if (!match) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Unsupported image format" } };
    }

    const mimeType = String(match[1] || "").toLowerCase();
    const ext = EXT_BY_MIME[mimeType];
    if (!ext) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Unsupported image format" } };
    }

    const inputBuffer = Buffer.from(match[2], "base64");

    if (inputBuffer.length > MAX_INPUT_BYTES) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "Image exceeds 2MB" } };
    }

    // Preserve original file format so animated GIF/APNG remain animated.
    const filePath = `${DECORATIONS_FOLDER}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supa.storage
      .from(DECORATIONS_BUCKET)
      .upload(filePath, inputBuffer, {
        contentType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error(
        "[admin/avatar-decorations.upload] upload error:",
        uploadError
      );
      setResponseStatus(event, 500);
      return { error: { stage: "upload", message: uploadError.message } };
    }

    const { data: publicData } = supa.storage
      .from(DECORATIONS_BUCKET)
      .getPublicUrl(filePath);

    const storageName = String(filePath.split("/").pop() || "");
    const displayName = requestedDisplayName || fallbackLabelFromFilename(storageName);
    if (storageName) {
      const { error: metadataError } = await supa
        .from("avatar_decorations")
        .upsert(
          {
            storage_name: storageName,
            display_name: displayName,
            is_active: true,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "storage_name" }
        );

      if (metadataError) {
        // Keep upload successful even if metadata table is missing/unavailable.
        console.warn(
          "[admin/avatar-decorations.upload] metadata upsert warning:",
          metadataError
        );
      }
    }

    return { success: true, decorationUrl: publicData?.publicUrl || "" };
  } catch (err) {
    console.error("[admin/avatar-decorations.upload] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
