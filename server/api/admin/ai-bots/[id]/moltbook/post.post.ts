import { createError, readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  applyMoltbookPostUsage,
  assertMoltbookPostAllowed,
  createMoltbookPost,
  decoratePersonaWithMoltbook,
  getMoltbookPersonaConfig,
} from "~/server/utils/moltbook";

export default defineEventHandler(async (event) => {
  try {
    const personaId = String(event.context.params?.id || "").trim();
    if (!personaId) {
      throw createError({ statusCode: 400, statusMessage: "Missing persona id" });
    }

    const body = ((await readBody(event)) || {}) as {
      submolt_name?: string;
      title?: string;
      content?: string;
      url?: string;
      type?: "text" | "link" | "image";
    };

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const { data: persona, error } = await supabase
      .from("ai_personas")
      .select("id, persona_key, metadata, profile:profiles!ai_personas_profile_user_id_fkey(displayname)")
      .eq("id", personaId)
      .single();

    if (error) throw error;
    if (!persona?.persona_key) {
      throw createError({
        statusCode: 404,
        statusMessage: "AI bot not found",
      });
    }

    const runtimeConfig = useRuntimeConfig(event);
    const moltbookConfig = getMoltbookPersonaConfig({
      metadata: persona.metadata,
      personaKey: persona.persona_key,
      config: runtimeConfig,
    });

    assertMoltbookPostAllowed(moltbookConfig);

    const submoltName =
      String(body.submolt_name || "").trim() || moltbookConfig.default_submolt;
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const url = String(body.url || "").trim();
    const type = (String(body.type || "text").trim() || "text") as
      | "text"
      | "link"
      | "image";

    if (!submoltName) {
      throw createError({
        statusCode: 400,
        statusMessage: "submolt_name is required",
      });
    }
    if (!title) {
      throw createError({
        statusCode: 400,
        statusMessage: "title is required",
      });
    }
    if (type === "link" && !url) {
      throw createError({
        statusCode: 400,
        statusMessage: "url is required for link posts",
      });
    }

    const moltbookResponse = await createMoltbookPost({
      event,
      personaKey: persona.persona_key,
      agentName: moltbookConfig.agent_name,
      payload: {
        submolt_name: submoltName,
        title,
        content: content || null,
        url: url || null,
        type,
      },
    });

    const postId = String(
      moltbookResponse?.post?.id ||
        moltbookResponse?.data?.id ||
        moltbookResponse?.data?.post_id ||
        ""
    ).trim();

    const updatedMetadata = applyMoltbookPostUsage({
      metadata: persona.metadata,
      personaKey: persona.persona_key,
      config: runtimeConfig,
      postId,
    });

    const { error: updateError } = await supabase
      .from("ai_personas")
      .update({ metadata: updatedMetadata })
      .eq("id", personaId);

    if (updateError) throw updateError;

    return {
      success: true,
      data: {
        persona: decoratePersonaWithMoltbook({
          persona: {
            ...persona,
            metadata: updatedMetadata,
          },
          event,
        }),
        moltbook: moltbookResponse,
      },
    };
  } catch (error: any) {
    console.error("[admin/ai-bots][moltbook] post error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error:
        error?.statusMessage || error?.message || "Unable to create Moltbook post",
      ...(error?.data ? { details: error.data } : {}),
    };
  }
});
