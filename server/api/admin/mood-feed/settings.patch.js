import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import {
  DEFAULT_MOOD_FEED_REFINE_PROMPT,
  DEFAULT_MOOD_FEED_TONE,
} from "~/server/utils/moodFeedSettings";

const fetchAdminClient = (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  return getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );
};

const ensureAdmin = async (supa, userId, event, label) => {
  const { data: me, error: meErr } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (meErr) {
    console.error(`[admin/${label}] admin check error:`, meErr);
    setResponseStatus(event, 500);
    return { error: { stage: "admin_check", message: meErr.message } };
  }

  if (!me?.is_admin) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  return null;
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const defaultTone =
      String(body.default_tone || "").trim().toLowerCase() ||
      DEFAULT_MOOD_FEED_TONE;
    const refinePromptTemplate =
      String(body.refine_prompt_template || "").trim() ||
      DEFAULT_MOOD_FEED_REFINE_PROMPT;

    if (!defaultTone) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "default_tone required" } };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.settings.update"
    );
    if (adminError) return adminError;

    const payload = {
      id: 1,
      default_tone: defaultTone,
      refine_prompt_template: refinePromptTemplate,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supa
      .from("mood_feed_settings")
      .upsert(payload, { onConflict: "id" })
      .select("id, default_tone, refine_prompt_template, updated_at")
      .maybeSingle();

    if (error && String(error?.message || "").includes("refine_prompt_template")) {
      const legacy = await supa
        .from("mood_feed_settings")
        .upsert(
          {
            id: 1,
            default_tone: defaultTone,
            updated_at: payload.updated_at,
          },
          { onConflict: "id" }
        )
        .select("id, default_tone, updated_at")
        .maybeSingle();
      data = legacy.data;
      error = legacy.error;
    }

    if (error) {
      console.error("[admin/mood-feed.settings] update error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "update", message: error.message } };
    }

    return {
      item: {
        id: data?.id || 1,
        default_tone: data?.default_tone || defaultTone,
        refine_prompt_template:
          data?.refine_prompt_template || refinePromptTemplate,
        updated_at: data?.updated_at || payload.updated_at,
      },
    };
  } catch (err) {
    console.error("[admin/mood-feed.settings] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
