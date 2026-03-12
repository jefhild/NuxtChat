import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import {
  DEFAULT_MOOD_FEED_REFINE_PROMPT,
  DEFAULT_MOOD_FEED_TONE,
  loadMoodFeedSettings,
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

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.settings"
    );
    if (adminError) return adminError;

    let data = null;
    try {
      data = await loadMoodFeedSettings(event);
    } catch (error) {
      console.error("[admin/mood-feed.settings] load error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "load", message: error.message } };
    }

    if (!data?.updated_at) {
      const seedPayload = {
        id: 1,
        default_tone: DEFAULT_MOOD_FEED_TONE,
        refine_prompt_template: DEFAULT_MOOD_FEED_REFINE_PROMPT,
      };

      let seeded = null;
      let seedErr = null;

      const seededWithPrompt = await supa
        .from("mood_feed_settings")
        .insert(seedPayload)
        .select("id, default_tone, refine_prompt_template, updated_at")
        .maybeSingle();
      seeded = seededWithPrompt.data;
      seedErr = seededWithPrompt.error;

      if (
        seedErr &&
        String(seedErr?.message || "").includes("refine_prompt_template")
      ) {
        const legacySeed = await supa
          .from("mood_feed_settings")
          .insert({
            id: 1,
            default_tone: DEFAULT_MOOD_FEED_TONE,
          })
          .select("id, default_tone, updated_at")
          .maybeSingle();
        seeded = legacySeed.data;
        seedErr = legacySeed.error;
      }

      if (seedErr) {
        console.error("[admin/mood-feed.settings] seed error:", seedErr);
        setResponseStatus(event, 500);
        return { error: { stage: "seed", message: seedErr.message } };
      }

      data = {
        id: seeded?.id || 1,
        default_tone:
          seeded?.default_tone || DEFAULT_MOOD_FEED_TONE,
        refine_prompt_template:
          seeded?.refine_prompt_template || DEFAULT_MOOD_FEED_REFINE_PROMPT,
        updated_at: seeded?.updated_at || null,
      };
    }

    return { item: data };
  } catch (err) {
    console.error("[admin/mood-feed.settings] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
