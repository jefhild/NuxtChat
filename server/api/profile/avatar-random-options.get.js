import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getQuery } from "h3";

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

const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {};
  const genderId = Number(query.genderId ?? query.gender_id ?? 3);
  const limit = Math.min(Math.max(Number(query.limit || 200), 1), 200);

  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  const folder = resolveGenderFolder(genderId);
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(folder, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

  if (listError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load avatar options",
    });
  }

  const valid = (files || []).filter((file) => file?.name);
  if (!valid.length) {
    return { avatars: [], selectedAvatar: "", folder };
  }

  const randomized = shuffle(valid).slice(0, limit);
  const avatars = randomized
    .map((file) => {
      const filePath = `${folder}/${file.name}`;
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      return data?.publicUrl || "";
    })
    .filter(Boolean);

  const selectedAvatar = avatars[Math.floor(Math.random() * avatars.length)] || "";
  return { avatars, selectedAvatar, folder };
});
