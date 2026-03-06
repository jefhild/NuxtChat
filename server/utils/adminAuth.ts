import { createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";

export const ensureAdmin = async (event: any, supabase: any) => {
  const user = await serverSupabaseUser(event).catch(() => null);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { data: me, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  if (!me?.is_admin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  return user;
};
