import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

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

    const locale = normalizeLocale(getQuery(event)?.locale || "en");

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.prompts"
    );
    if (adminError) return adminError;

    const { data, error } = await supa
      .from("mood_feed_prompts")
      .select(
        `
        id,
        prompt_key,
        is_active,
        created_at,
        updated_at,
        mood_feed_prompt_translations (locale, prompt_text, source_locale, updated_at)
      `
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[admin/mood-feed.prompts] load error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "load", message: error.message } };
    }

    const items = (data || []).map((prompt) => {
      const rows = prompt.mood_feed_prompt_translations || [];
      const exact = rows.find((r) => r.locale === locale);
      const fallback = rows.find((r) => r.locale === "en");
      const selected = exact || fallback || rows[0] || null;
      return {
        id: prompt.id,
        prompt_key: prompt.prompt_key,
        is_active: prompt.is_active,
        created_at: prompt.created_at,
        updated_at: prompt.updated_at,
        prompt_text: selected?.prompt_text || "",
      };
    });

    return { items };
  } catch (err) {
    console.error("[admin/mood-feed.prompts] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
