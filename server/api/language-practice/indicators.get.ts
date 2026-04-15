import { defineEventHandler, createError, getQuery } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";

const normalizeUserIds = (value: unknown) => {
  const rawValues = Array.isArray(value) ? value : [value];
  const ids = rawValues
    .flatMap((entry) => String(entry || "").split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const query = getQuery(event);
  const requestedUserIds = normalizeUserIds(query.userIds ?? query.user_ids).filter(
    (id) => id !== user.id
  );

  if (!requestedUserIds.length) {
    return {
      session_user_ids: [],
    };
  }

  const supabase = await getServiceRoleClient(event);

  const [
    { data: learnerRows, error: learnerError },
    { data: partnerRows, error: partnerError },
  ] = await Promise.all([
    supabase
      .from("language_practice_sessions")
      .select("partner_user_id")
      .eq("status", "active")
      .eq("learner_user_id", user.id)
      .in("partner_user_id", requestedUserIds),
    supabase
      .from("language_practice_sessions")
      .select("learner_user_id")
      .eq("status", "active")
      .eq("partner_user_id", user.id)
      .in("learner_user_id", requestedUserIds),
  ]);

  if (learnerError) {
    throw createError({ statusCode: 500, statusMessage: learnerError.message });
  }

  if (partnerError) {
    throw createError({ statusCode: 500, statusMessage: partnerError.message });
  }

  const sessionUserIds = Array.from(
    new Set([
      ...(learnerRows || []).map((row) => row.partner_user_id).filter(Boolean),
      ...(partnerRows || []).map((row) => row.learner_user_id).filter(Boolean),
    ])
  );

  return {
    session_user_ids: sessionUserIds,
  };
});
