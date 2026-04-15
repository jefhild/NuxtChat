import { defineEventHandler, createError, getQuery } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";

const normalizePartnerId = (value: unknown) => {
  if (Array.isArray(value)) value = value[0];
  const id = String(value || "").trim();
  return id || null;
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const query = getQuery(event);
  const partnerUserId = normalizePartnerId(
    query.partnerUserId ?? query.partner_user_id ?? query.userId
  );

  if (!partnerUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "partnerUserId is required",
    });
  }

  const supabase = await getServiceRoleClient(event);
  const { data, error } = await supabase
    .from("language_practice_sessions")
    .select("*")
    .eq("status", "active")
    .or(
      `and(learner_user_id.eq.${user.id},partner_user_id.eq.${partnerUserId}),and(learner_user_id.eq.${partnerUserId},partner_user_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return { session: data || null };
});
