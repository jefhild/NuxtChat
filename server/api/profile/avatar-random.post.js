import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, readBody } from "h3";

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

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { userId, genderId } = body || {};

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "Missing userId" });
  }

  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  let resolvedGenderId = genderId;
  if (resolvedGenderId === null || resolvedGenderId === undefined) {
    const { data, error } = await supabase
      .from("profiles")
      .select("gender_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to resolve gender",
      });
    }
    resolvedGenderId = data?.gender_id ?? null;
  }

  const folder = resolveGenderFolder(resolvedGenderId);
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(folder, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

  if (listError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load avatar library",
    });
  }

  const eligible = (files || []).filter((file) => file?.name);
  if (!eligible.length) {
    throw createError({
      statusCode: 404,
      statusMessage: "No avatars available for this category",
    });
  }

  const selection = eligible[Math.floor(Math.random() * eligible.length)];
  const filePath = `${folder}/${selection.name}`;
  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
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
