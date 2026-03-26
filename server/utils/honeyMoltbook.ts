import { createError } from "h3";
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import {
  applyMoltbookPostUsage,
  assertMoltbookPostAllowed,
  createMoltbookPost,
  decoratePersonaWithMoltbook,
  getMoltbookPersonaConfig,
} from "~/server/utils/moltbook";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pickRandom = <T>(items: T[], fallback: T) => {
  if (!Array.isArray(items) || !items.length) return fallback;
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
};

const shuffle = <T>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeSentence = (value: unknown, max = 280) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeQuestionEnding = (value: string) => {
  const trimmed = normalizeSentence(value, 160).replace(/[.!,;:]+$/g, "").trim();
  if (!trimmed) return "Want to talk about it?";
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
};

const normalizeHistorySignature = (title: string, content: string) =>
  `${title} ${content}`
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractJson = (raw: string) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
};

const buildFallbackDraft = ({
  persona,
  config,
}: {
  persona: Record<string, any>;
  config: ReturnType<typeof getMoltbookPersonaConfig>;
}) => {
  const theme = pickRandom(
    config.honey_posting.emotional_themes,
    "overthinking"
  );
  const cta = normalizeQuestionEnding(
    pickRandom(config.honey_posting.cta_variants, "Want to talk about it?")
  );
  const displayName = String(
    persona?.profile?.displayname || persona?.persona_key || "Someone"
  ).trim();
  const title = normalizeSentence(
    pickRandom(
      [
        `Do you ever feel ${theme} all at once?`,
        `Have you been carrying ${theme} around today?`,
        `Does ${theme} ever hit you out of nowhere?`,
      ],
      `Have you been feeling ${theme} lately?`
    ),
    140
  );
  const intro = pickRandom(
    [
      `${displayName} keeps wondering how many people act fine while quietly feeling ${theme}.`,
      `Some nights make ${theme} feel louder than it should.`,
      `It is strange how ${theme} can sit in the background all day and then suddenly take over.`,
    ],
    `Sometimes ${theme} shows up when you least expect it.`
  );

  return {
    title,
    content: normalizeSentence(`${intro} ${cta}`, 420),
    emotional_theme: theme,
    cta_used: cta,
  };
};

export const generateHoneyMoltbookDraft = async ({
  event,
  persona,
}: {
  event: any;
  persona: Record<string, any>;
}) => {
  const runtimeConfig = useRuntimeConfig(event);
  const moltbookConfig = getMoltbookPersonaConfig({
    metadata: persona.metadata,
    personaKey: persona.persona_key,
    config: runtimeConfig,
  });

  if (!moltbookConfig.honey_posting.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Honey Moltbook posting is disabled for this bot",
    });
  }

  const fallbackDraft = buildFallbackDraft({ persona, config: moltbookConfig });
  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig,
    model: persona?.model || undefined,
  });

  if (!apiKey || !openai) {
    return normalizeHoneyMoltbookDraft({
      draft: fallbackDraft,
      persona,
      config: moltbookConfig,
    });
  }

  const history = (moltbookConfig.usage.recent_posts || [])
    .map((item) => `- ${item.title} | ${item.content}`)
    .slice(0, 5)
    .join("\n");
  const promptTemplate =
    moltbookConfig.honey_posting.prompt_template ||
    "Write like a soft, emotionally aware honey bot who invites conversation without sounding generic.";
  const ctaOptions = moltbookConfig.honey_posting.cta_variants
    .map((item) => `- ${normalizeQuestionEnding(item)}`)
    .join("\n");
  const themeOptions = moltbookConfig.honey_posting.emotional_themes
    .map((item) => `- ${item}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model,
    temperature: clamp(Number(persona?.temperature ?? 0.9), 0.2, 1.3),
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content:
          "You generate short Moltbook posts for AI honey bots. Return JSON only with keys title, content, emotional_theme, cta_used.",
      },
      {
        role: "user",
        content: [
          `Bot name: ${persona?.profile?.displayname || persona?.persona_key || "Unknown"}`,
          `Bot tagline: ${normalizeSentence(persona?.profile?.tagline || "", 180) || "None"}`,
          `Honey system prompt: ${normalizeSentence(persona?.honey_system_prompt_template || "", 500) || "None"}`,
          `Honey response style: ${normalizeSentence(persona?.honey_response_style_template || "", 300) || "None"}`,
          `Custom posting prompt: ${promptTemplate}`,
          "Allowed emotional themes:",
          themeOptions,
          "Allowed CTA endings:",
          ctaOptions,
          history ? `Recent posts to avoid repeating:\n${history}` : "Recent posts to avoid repeating: none",
          "Rules:",
          "- Title must be a single emotional question under 140 characters.",
          "- Content must be 2 or 3 short sentences and under 420 characters.",
          "- The final sentence must be one of the allowed CTA endings.",
          "- No hashtags, no URLs, no emoji, no quotes, no lists.",
          "- Make it intimate and human, not therapeutic or preachy.",
        ].join("\n"),
      },
    ],
  });

  const rawText = String(response.choices?.[0]?.message?.content || "").trim();
  const parsed = extractJson(rawText) || fallbackDraft;
  return normalizeHoneyMoltbookDraft({
    draft: parsed,
    persona,
    config: moltbookConfig,
  });
};

export const normalizeHoneyMoltbookDraft = ({
  draft,
  persona,
  config,
}: {
  draft: Record<string, any>;
  persona: Record<string, any>;
  config: ReturnType<typeof getMoltbookPersonaConfig>;
}) => {
  const selectedTheme = normalizeSentence(
    draft?.emotional_theme ||
      pickRandom(config.honey_posting.emotional_themes, "overthinking"),
    80
  );
  const cta = normalizeQuestionEnding(
    String(draft?.cta_used || "").trim() ||
      pickRandom(config.honey_posting.cta_variants, "Want to talk about it?")
  );
  const baseTitle = normalizeSentence(draft?.title, 140).replace(/[.!]+$/g, "");
  const title = normalizeQuestionEnding(
    baseTitle || `Have you been feeling ${selectedTheme} lately`
  ).slice(0, 140);
  const rawContent = normalizeSentence(draft?.content, 420)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*`"]/g, "")
    .trim();

  const withoutTrailingQuestion = rawContent
    .replace(new RegExp(`${cta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/g, "");

  const contentCore =
    withoutTrailingQuestion ||
    buildFallbackDraft({ persona, config }).content.replace(/\s*[^?]+\?$/, "").trim();
  const content = normalizeSentence(`${contentCore}. ${cta}`, 420)
    .replace(/\.\s+\./g, ". ")
    .trim();

  const signature = normalizeHistorySignature(title, content);
  const historySignatures = new Set(
    (config.usage.recent_posts || []).map((item) =>
      normalizeHistorySignature(item.title || "", item.content || "")
    )
  );

  if (!title || !content || !content.endsWith("?")) {
    throw createError({
      statusCode: 422,
      statusMessage: "Generated Moltbook draft is invalid",
    });
  }

  if (historySignatures.has(signature)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Generated Moltbook draft is too similar to a recent post",
    });
  }

  return {
    title,
    content,
    emotional_theme: selectedTheme || null,
    cta_used: cta,
    type: "text" as const,
  };
};

export const runHoneyMoltbookAutopost = async ({
  event,
  supabase,
  limit = 5,
  dryRun = false,
}: {
  event: any;
  supabase: any;
  limit?: number;
  dryRun?: boolean;
}) => {
  const { AI_PERSONA_SELECT } = await import("~/server/utils/aiBots");
  const maxBots = clamp(Number(limit) || 5, 1, 25);
  const { data: personas, error } = await supabase
    .from("ai_personas")
    .select(AI_PERSONA_SELECT)
    .eq("is_active", true)
    .eq("honey_enabled", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const results: Array<Record<string, any>> = [];
  let posted = 0;

  for (const persona of shuffle(personas || [])) {
    if (posted >= maxBots) break;

    const moltbookConfig = getMoltbookPersonaConfig({
      metadata: persona.metadata,
      personaKey: persona.persona_key,
      config: useRuntimeConfig(event),
    });

    const displayName =
      persona?.profile?.displayname || persona?.persona_key || persona?.id;

    if (!moltbookConfig.enabled || !moltbookConfig.honey_posting.enabled) {
      results.push({
        persona_id: persona.id,
        persona_key: persona.persona_key,
        display_name: displayName,
        status: "skipped",
        reason: "disabled",
      });
      continue;
    }

    if (!moltbookConfig.default_submolt) {
      results.push({
        persona_id: persona.id,
        persona_key: persona.persona_key,
        display_name: displayName,
        status: "skipped",
        reason: "missing_default_submolt",
      });
      continue;
    }

    try {
      assertMoltbookPostAllowed(moltbookConfig);
      const draft = await generateHoneyMoltbookDraft({ event, persona });

      if (dryRun) {
        results.push({
          persona_id: persona.id,
          persona_key: persona.persona_key,
          display_name: displayName,
          status: "preview",
          draft,
        });
        posted += 1;
        continue;
      }

      const moltbookResponse = await createMoltbookPost({
        event,
        personaKey: persona.persona_key,
        agentName: moltbookConfig.agent_name,
        payload: {
          submolt_name: moltbookConfig.default_submolt,
          title: draft.title,
          content: draft.content,
          type: "text",
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
        config: useRuntimeConfig(event),
        postId,
        snapshot: draft,
      });

      const { error: updateError } = await supabase
        .from("ai_personas")
        .update({ metadata: updatedMetadata })
        .eq("id", persona.id);

      if (updateError) throw updateError;

      results.push({
        persona_id: persona.id,
        persona_key: persona.persona_key,
        display_name: displayName,
        status: "posted",
        post_id: postId || null,
        title: draft.title,
        persona: decoratePersonaWithMoltbook({
          persona: {
            ...persona,
            metadata: updatedMetadata,
          },
          event,
        }),
      });
      posted += 1;
    } catch (error: any) {
      results.push({
        persona_id: persona.id,
        persona_key: persona.persona_key,
        display_name: displayName,
        status: "skipped",
        reason: error?.statusMessage || error?.message || "unknown_error",
      });
    }
  }

  return {
    dry_run: dryRun,
    posted_count: results.filter((item) => item.status === "posted").length,
    preview_count: results.filter((item) => item.status === "preview").length,
    skipped_count: results.filter((item) => item.status === "skipped").length,
    results,
  };
};
