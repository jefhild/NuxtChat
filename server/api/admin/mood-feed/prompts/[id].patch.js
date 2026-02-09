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

    const promptId = String(event.context?.params?.id || "").trim();
    if (!promptId) {
      setResponseStatus(event, 400);
      return { error: "id required" };
    }

    const body = (await readBody(event)) || {};
    const promptKey = String(body.prompt_key || "").trim();
    const promptText = String(body.prompt_text || "").trim();
    const isActive =
      typeof body.is_active === "boolean" ? body.is_active : null;
    const locale = normalizeLocale(body.locale || "en") || "en";
    const translateAll =
      typeof body.translate_all === "boolean" ? body.translate_all : false;

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.prompts.update"
    );
    if (adminError) return adminError;

    if (promptKey || typeof isActive === "boolean") {
      const update = {
        updated_at: new Date().toISOString(),
      };
      if (promptKey) update.prompt_key = promptKey;
      if (typeof isActive === "boolean") update.is_active = isActive;

      const { error: updateErr } = await supa
        .from("mood_feed_prompts")
        .update(update)
        .eq("id", promptId);

      if (updateErr) {
        console.error("[admin/mood-feed.prompts] update error:", updateErr);
        setResponseStatus(event, 500);
        return { error: { stage: "update", message: updateErr.message } };
      }
    }

    if (promptText) {
      const { error: upsertErr } = await supa
        .from("mood_feed_prompt_translations")
        .upsert(
          {
            prompt_id: promptId,
            locale,
            prompt_text: promptText,
            source_locale: locale,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "prompt_id,locale" }
        );

      if (upsertErr) {
        console.error(
          "[admin/mood-feed.prompts] translation upsert error:",
          upsertErr
        );
        // Non-fatal: keep prompt but skip translation upsert
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
                prompt_id: promptId,
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

    return { ok: true };
  } catch (err) {
    console.error("[admin/mood-feed.prompts] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
