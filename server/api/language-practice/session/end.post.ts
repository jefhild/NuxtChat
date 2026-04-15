import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";

const normalizePartnerId = (value: unknown) => {
  const id = String(value || "").trim();
  return id || null;
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const partnerUserId = normalizePartnerId(
    body?.partner_user_id ?? body?.partnerUserId
  );

  if (!partnerUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "partner_user_id is required",
    });
  }

  if (partnerUserId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A language practice session requires another participant.",
    });
  }

  const supabase = await getServiceRoleClient(event);
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("language_practice_sessions")
    .select("id")
    .eq("status", "active")
    .or(
      `and(learner_user_id.eq.${user.id},partner_user_id.eq.${partnerUserId}),and(learner_user_id.eq.${partnerUserId},partner_user_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: existingError.message });
  }

  if (!existing?.id) {
    return { ended_count: 0 };
  }

  const { error } = await supabase
    .from("language_practice_sessions")
    .update({
      status: "ended",
      ended_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    ended_count: 1,
  };
});
