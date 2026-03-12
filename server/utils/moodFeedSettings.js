import { getServiceRoleClient } from "~/server/utils/aiBots";

export const DEFAULT_MOOD_FEED_TONE = "funny";

export const DEFAULT_MOOD_FEED_REFINE_PROMPT = [
  "Rewrite the user's response into a concise, direct, interesting mood-feed post.",
  "Preserve the core meaning and target; do not soften or change intent.",
  "Avoid cutesy metaphors, puns, or playful framing unless the tone explicitly calls for it.",
  "It must clearly answer the prompt but should not repeat the user's words.",
  "Aim for 8-22 words. One or two short sentences max. Plain text only.",
  "Sound human and natural. Avoid AI-ish phrasing, formulaic patterns, or over-clever slogans.",
  "Prefer simple, specific, conversational wording over abstract or ornate phrasing.",
  "Avoid quotes, hashtags, emojis, and punctuation spam.",
  "If tone is 'serious', be blunt, plain, and literal (no jokes or whimsy).",
  "Language: {{locale}}.",
  "Tone: {{tone}}.",
].join("\n");

const SETTINGS_SELECT = "id, default_tone, refine_prompt_template, updated_at";
const LEGACY_SETTINGS_SELECT = "id, default_tone, updated_at";

export const fillMoodFeedRefinePromptTemplate = ({
  template,
  locale,
  tone,
}) =>
  String(template || DEFAULT_MOOD_FEED_REFINE_PROMPT)
    .replaceAll("{{locale}}", String(locale || "en"))
    .replaceAll("{{tone}}", String(tone || DEFAULT_MOOD_FEED_TONE));

export const loadMoodFeedSettings = async (event) => {
  const supabase = await getServiceRoleClient(event);

  let { data, error } = await supabase
    .from("mood_feed_settings")
    .select(SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();

  if (error && String(error?.message || "").includes("refine_prompt_template")) {
    const legacy = await supabase
      .from("mood_feed_settings")
      .select(LEGACY_SETTINGS_SELECT)
      .eq("id", 1)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) throw error;

  return {
    id: data?.id || 1,
    default_tone:
      String(data?.default_tone || "").trim().toLowerCase() ||
      DEFAULT_MOOD_FEED_TONE,
    refine_prompt_template:
      String(data?.refine_prompt_template || "").trim() ||
      DEFAULT_MOOD_FEED_REFINE_PROMPT,
    updated_at: data?.updated_at || null,
  };
};
