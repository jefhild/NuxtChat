import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import {
  BOT_CAPABILITIES,
  executeBotCapability,
} from "@/server/utils/botPlatform";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const actorPersona = String(body?.actorPersona || "").trim();
  if (!actorPersona) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing actor persona",
    });
  }

  const result = await executeBotCapability({
    event,
    actorPersona,
    capability: BOT_CAPABILITIES.SET_LIVE_MOOD_STATE,
    actorUserId: user.id,
    targetUserId: user.id,
    payload: {
      emotion: body?.emotion,
      intent: body?.intent,
      energy: body?.energy,
      privacy: body?.privacy,
      timeHorizon: body?.timeHorizon,
      freeTextRaw: body?.freeTextRaw,
      freeTextRefined: body?.freeTextRefined,
      sourceType: body?.sourceType || "mixed",
      confidence: body?.confidence,
      expiresAt: body?.expiresAt,
    },
  });

  return {
    ok: true,
    state: result,
  };
});
