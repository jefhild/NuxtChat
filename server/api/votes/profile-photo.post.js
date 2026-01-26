import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { photoId, value } = (await readBody(event)) || {};
  if (!photoId)
    throw createError({ statusCode: 400, statusMessage: "photoId required" });
  if (value !== 1)
    throw createError({ statusCode: 400, statusMessage: "value must be 1" });

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: existing, error: selErr } = await supa
    .from("votes_unified")
    .select("value")
    .eq("target_type", "profile_photo")
    .eq("target_id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (selErr)
    throw createError({ statusCode: 500, statusMessage: selErr.message });

  let mutErr = null;
  if (existing?.value === value) {
    const { error } = await supa
      .from("votes_unified")
      .delete()
      .eq("target_type", "profile_photo")
      .eq("target_id", photoId)
      .eq("user_id", user.id);
    mutErr = error;
  } else if (existing) {
    const { error } = await supa
      .from("votes_unified")
      .update({ value })
      .eq("target_type", "profile_photo")
      .eq("target_id", photoId)
      .eq("user_id", user.id);
    mutErr = error;
  } else {
    const { error } = await supa
      .from("votes_unified")
      .insert([
        {
          target_type: "profile_photo",
          target_id: photoId,
          user_id: user.id,
          value,
        },
      ]);
    mutErr = error;
  }
  if (mutErr)
    throw createError({ statusCode: 500, statusMessage: mutErr.message });

  const [{ count }, { data: my }] = await Promise.all([
    supa
      .from("votes_unified")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "profile_photo")
      .eq("target_id", photoId)
      .eq("value", 1),
    supa
      .from("votes_unified")
      .select("value")
      .eq("target_type", "profile_photo")
      .eq("target_id", photoId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    photoId,
    upvotes: Number(count || 0),
    userVote: my?.value ?? 0,
  };
});
