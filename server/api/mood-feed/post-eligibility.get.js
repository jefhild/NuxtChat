import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { getMoodFeedPostCooldown } from "~/server/utils/moodFeedGuards";

export default defineEventHandler(async (event) => {
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch (err) {
    const message = err?.cause?.statusMessage || err?.message || "";
    if (!message.includes("Auth session missing")) {
      throw err;
    }
  }
  if (!user?.id) {
    return {
      canPost: true,
      cooldownHours: 24,
      lastEntryAt: null,
      nextAllowedAt: null,
      remainingMs: 0,
    };
  }

  const supabase = await getServiceRoleClient(event);
  const query = getQuery(event) || {};
  const promptKey = String(query.promptKey || query.prompt_key || "").trim() || null;
  return getMoodFeedPostCooldown({
    supabase,
    userId: user.id,
    cooldownHours: 24,
    promptKey,
  });
});
