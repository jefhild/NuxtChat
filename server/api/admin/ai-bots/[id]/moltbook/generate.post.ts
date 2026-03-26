import { createError, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { decoratePersonaWithMoltbook } from "~/server/utils/moltbook";
import { generateHoneyMoltbookDraft } from "~/server/utils/honeyMoltbook";

export default defineEventHandler(async (event) => {
  try {
    const personaId = String(event.context.params?.id || "").trim();
    if (!personaId) {
      throw createError({ statusCode: 400, statusMessage: "Missing persona id" });
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const { data: persona, error } = await supabase
      .from("ai_personas")
      .select("id, persona_key, model, temperature, honey_enabled, honey_system_prompt_template, honey_response_style_template, metadata, profile:profiles!ai_personas_profile_user_id_fkey(displayname, tagline)")
      .eq("id", personaId)
      .single();

    if (error) throw error;
    if (!persona?.persona_key) {
      throw createError({
        statusCode: 404,
        statusMessage: "AI bot not found",
      });
    }

    const draft = await generateHoneyMoltbookDraft({ event, persona });

    return {
      success: true,
      data: {
        draft,
        persona: decoratePersonaWithMoltbook({ persona, event }),
      },
    };
  } catch (error: any) {
    console.error("[admin/ai-bots][moltbook] generate error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error:
        error?.statusMessage || error?.message || "Unable to generate Moltbook draft",
    };
  }
});
