import { getOpenAIClient } from "@/server/utils/openaiGateway";

export const moderateMoodFeedText = async ({ event, text }) => {
  const cleaned = String(text || "").trim();
  if (!cleaned) return { allowed: true, flagged: false };

  const config = useRuntimeConfig(event);
  const { client: openai, apiKey } = getOpenAIClient({
    runtimeConfig: config,
  });
  if (!apiKey || !openai) return { allowed: true, flagged: false };

  try {
    const resp = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: cleaned,
    });
    const result = resp?.results?.[0] || {};
    const flagged = !!result.flagged;
    return {
      allowed: !flagged,
      flagged,
      categories: result.categories || null,
      scores: result.category_scores || null,
    };
  } catch (err) {
    console.warn("[mood-feed.moderation] fallback:", err?.message || err);
    return { allowed: true, flagged: false };
  }
};
