import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import { translateText, normalizeLocale } from "@/server/utils/translate";

const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
const TRANSLATE_TIMEOUT_MS = 4000;

const translateWithTimeout = async ({
  text,
  targetLocale,
  sourceLocaleHint,
  config,
}) => {
  return Promise.race([
    translateText({ text, targetLocale, sourceLocaleHint, config }),
    new Promise((resolve) =>
      setTimeout(() => resolve({ ok: false, translatedText: null }), TRANSLATE_TIMEOUT_MS)
    ),
  ]);
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

    const body = (await readBody(event)) || {};
    const promptKey = String(body.prompt_key || "").trim();
    const promptText = String(body.prompt_text || "").trim();
    const isActive =
      typeof body.is_active === "boolean" ? body.is_active : true;
    const locale = normalizeLocale(body.locale || "en") || "en";
    const translateAll =
      typeof body.translate_all === "boolean" ? body.translate_all : true;

    if (!promptKey) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "prompt_key required" } };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.prompts.create"
    );
    if (adminError) return adminError;

    const { data: prompt, error: promptErr } = await supa
      .from("mood_feed_prompts")
      .insert({ prompt_key: promptKey, is_active: isActive })
      .select("id, prompt_key")
      .single();

    if (promptErr) {
      console.error("[admin/mood-feed.prompts] insert error:", promptErr);
      if (promptErr.code === "23505") {
        setResponseStatus(event, 409);
        return {
          error: { stage: "insert", message: "prompt_key already exists" },
        };
      }
      setResponseStatus(event, 500);
      return { error: { stage: "insert", message: promptErr.message } };
    }

    if (promptText) {
      const { error: transErr } = await supa
        .from("mood_feed_prompt_translations")
        .insert({
          prompt_id: prompt.id,
          locale,
          prompt_text: promptText,
          source_locale: locale,
          updated_at: new Date().toISOString(),
        });

      if (transErr) {
        console.error(
          "[admin/mood-feed.prompts] translation insert error:",
          transErr
        );
        // Non-fatal: keep prompt but skip translation insert
      }

      if (translateAll) {
        const cfg = useRuntimeConfig(event);
        const targets = SUPPORTED_LOCALES.filter((l) => l !== locale);
        const results = await Promise.allSettled(
          targets.map((targetLocale) =>
            translateWithTimeout({
              text: promptText,
              targetLocale,
              sourceLocaleHint: locale,
              config: cfg,
            }).then((translated) => ({ targetLocale, translated }))
          )
        );

        for (const res of results) {
          if (res.status !== "fulfilled") continue;
          const { targetLocale, translated } = res.value || {};
          if (!translated?.translatedText || !targetLocale) continue;
          try {
            await supa.from("mood_feed_prompt_translations").upsert(
              {
                prompt_id: prompt.id,
                locale: targetLocale,
                prompt_text: translated.translatedText,
                source_locale: locale,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "prompt_id,locale" }
            );
          } catch (translateErr) {
            console.error(
              "[admin/mood-feed.prompts] auto-translate error:",
              translateErr
            );
          }
        }
      }
    }

    return { ok: true, id: prompt.id };
  } catch (err) {
    console.error("[admin/mood-feed.prompts] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
