import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {};
  const locale = normalizeLocale(query.locale || "en");
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);
  const offset = Math.max(Number(query.offset || 0), 0);
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {
    user = null;
  }

  const supabase = await getServiceRoleClient(event);

  const { data: entries, error } = await supabase
    .from("mood_feed_entries")
    .select(
      [
        "id",
        "user_id",
        "prompt_key",
        "prompt_text",
        "original_text",
        "refined_text",
        "source_locale",
        "status",
        "created_at",
        "profiles (user_id, displayname, gender_id, avatar_url, profile_translations (locale, displayname, bio, tagline, source_locale))",
      ].join(",")
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const entryIds = (entries || []).map((e) => e.id).filter(Boolean);
  if (!entryIds.length) {
    return { items: [] };
  }

  const promptKeys = Array.from(
    new Set((entries || []).map((e) => e.prompt_key).filter(Boolean))
  );

  const promptTranslations = promptKeys.length
    ? await supabase
        .from("mood_feed_prompts")
        .select(
          [
            "id",
            "prompt_key",
            "mood_feed_prompt_translations (locale, prompt_text, source_locale)",
          ].join(",")
        )
        .in("prompt_key", promptKeys)
    : { data: [] };
  if (promptTranslations?.error) {
    throw createError({
      statusCode: 500,
      statusMessage: promptTranslations.error.message,
    });
  }

  const [translationsRes, scoresRes, replyCountsRes, myVotesRes, repliesRes] =
    await Promise.all([
      supabase
        .from("mood_feed_entry_translations")
        .select("entry_id, locale, refined_text, source_locale")
        .in("entry_id", entryIds),
      supabase
        .from("mood_feed_entry_scores")
        .select("entry_id, score, upvotes, downvotes")
        .in("entry_id", entryIds),
      supabase
        .from("mood_feed_reply_counts")
        .select("entry_id, reply_count")
        .in("entry_id", entryIds),
      user?.id
        ? supabase
            .from("votes_unified")
            .select("target_id, value")
            .eq("target_type", "mood_feed_entry")
            .eq("user_id", user.id)
            .in("target_id", entryIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("mood_feed_replies")
        .select(
          [
            "id",
            "entry_id",
            "reply_to_id",
            "user_id",
            "content",
            "source_locale",
            "created_at",
            "profiles (user_id, displayname, gender_id, avatar_url, profile_translations (locale, displayname, bio, tagline, source_locale))",
          ].join(",")
        )
        .in("entry_id", entryIds)
        .order("created_at", { ascending: true }),
    ]);

  const translationByEntry = new Map();
  for (const row of translationsRes.data || []) {
    if (!row?.entry_id) continue;
    if (!translationByEntry.has(row.entry_id)) {
      translationByEntry.set(row.entry_id, []);
    }
    translationByEntry.get(row.entry_id).push(row);
  }

  const scoreMap = new Map(
    (scoresRes.data || []).map((row) => [row.entry_id, row])
  );
  const replyCountMap = new Map(
    (replyCountsRes.data || []).map((row) => [row.entry_id, row.reply_count])
  );
  const myVoteMap = new Map(
    (myVotesRes.data || []).map((row) => [row.target_id, row.value])
  );

  const repliesByEntry = new Map();
  const replyIds = [];
  for (const r of repliesRes.data || []) {
    if (!r?.entry_id) continue;
    if (!repliesByEntry.has(r.entry_id)) repliesByEntry.set(r.entry_id, []);
    repliesByEntry.get(r.entry_id).push(r);
    replyIds.push(r.id);
  }

  const [replyTranslationsRes, replyScoresRes, myReplyVotesRes] =
    replyIds.length
      ? await Promise.all([
          supabase
            .from("mood_feed_reply_translations")
            .select("reply_id, locale, content, source_locale")
            .in("reply_id", replyIds),
          supabase
            .from("mood_feed_reply_scores")
            .select("reply_id, score, upvotes, downvotes")
            .in("reply_id", replyIds),
          user?.id
            ? supabase
                .from("votes_unified")
                .select("target_id, value")
                .eq("target_type", "mood_feed_reply")
                .eq("user_id", user.id)
                .in("target_id", replyIds)
            : Promise.resolve({ data: [] }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const replyTranslationMap = new Map();
  for (const row of replyTranslationsRes.data || []) {
    if (!row?.reply_id) continue;
    if (!replyTranslationMap.has(row.reply_id)) {
      replyTranslationMap.set(row.reply_id, []);
    }
    replyTranslationMap.get(row.reply_id).push(row);
  }

  const replyScoreMap = new Map(
    (replyScoresRes.data || []).map((row) => [row.reply_id, row])
  );
  const myReplyVoteMap = new Map(
    (myReplyVotesRes.data || []).map((row) => [row.target_id, row.value])
  );

  const pickTranslation = (entry) => {
    const rows = translationByEntry.get(entry.id) || [];
    if (!rows.length) {
      return {
        text: entry.refined_text || "",
        locale: entry.source_locale || "en",
      };
    }
    const exact = rows.find((r) => r.locale === locale);
    if (exact) return { text: exact.refined_text, locale: exact.locale };
    const fallback = rows.find((r) => r.locale === entry.source_locale);
    if (fallback) return { text: fallback.refined_text, locale: fallback.locale };
    return {
      text: entry.refined_text || rows[0]?.refined_text || "",
      locale: entry.source_locale || rows[0]?.locale || "en",
    };
  };

  const pickReplyTranslation = (reply) => {
    const rows = replyTranslationMap.get(reply.id) || [];
    if (!rows.length) {
      return {
        text: reply.content || "",
        locale: reply.source_locale || "en",
      };
    }
    const exact = rows.find((r) => r.locale === locale);
    if (exact) return { text: exact.content, locale: exact.locale };
    const fallback = rows.find((r) => r.locale === reply.source_locale);
    if (fallback) return { text: fallback.content, locale: fallback.locale };
    return {
      text: reply.content || rows[0]?.content || "",
      locale: reply.source_locale || rows[0]?.locale || "en",
    };
  };

  const promptTextMap = new Map();
  for (const prompt of promptTranslations.data || []) {
    const rows = prompt.mood_feed_prompt_translations || [];
    if (!rows.length) {
      promptTextMap.set(prompt.prompt_key, prompt.prompt_key);
      continue;
    }
    const exact = rows.find((r) => r.locale === locale);
    if (exact) {
      promptTextMap.set(prompt.prompt_key, exact.prompt_text);
      continue;
    }
    const fallback = rows.find((r) => r.locale === "en");
    if (fallback) {
      promptTextMap.set(prompt.prompt_key, fallback.prompt_text);
      continue;
    }
    promptTextMap.set(prompt.prompt_key, rows[0]?.prompt_text || "");
  }

  const items = entries.map((entry) => {
    const translation = pickTranslation(entry);
    const score = scoreMap.get(entry.id) || {};
    const repliesRaw = repliesByEntry.get(entry.id) || [];
    const replies = repliesRaw.map((reply) => {
      const replyTranslation = pickReplyTranslation(reply);
      const replyScore = replyScoreMap.get(reply.id) || {};
      return {
        id: reply.id,
        entryId: reply.entry_id,
        replyToId: reply.reply_to_id,
        userId: reply.user_id,
        createdAt: reply.created_at || null,
        displayText: replyTranslation.text,
        displayLocale: replyTranslation.locale,
        sourceLocale: reply.source_locale || null,
        profile: reply.profiles || null,
        score: replyScore.score ?? 0,
        upvotes: replyScore.upvotes ?? 0,
        downvotes: replyScore.downvotes ?? 0,
        userVote: myReplyVoteMap.get(reply.id) ?? 0,
      };
    });
    return {
      id: entry.id,
      userId: entry.user_id,
      promptKey: entry.prompt_key || null,
      promptText: entry.prompt_text || null,
      originalText: entry.original_text || null,
      createdAt: entry.created_at || null,
      displayText: translation.text,
      displayLocale: translation.locale,
      sourceLocale: entry.source_locale || null,
      profile: entry.profiles || null,
      score: score.score ?? 0,
      upvotes: score.upvotes ?? 0,
      downvotes: score.downvotes ?? 0,
      replyCount: replyCountMap.get(entry.id) ?? 0,
      userVote: myVoteMap.get(entry.id) ?? 0,
      replies,
    };
  });

  const groups = new Map();
  for (const entry of items) {
    const groupKey = entry.promptKey || "freeform";
    if (!groups.has(groupKey)) {
      const promptText =
        entry.promptKey && promptTextMap.get(entry.promptKey)
          ? promptTextMap.get(entry.promptKey)
          : entry.promptText || "Mood Feed";
      groups.set(groupKey, {
        id: groupKey,
        promptKey: entry.promptKey || null,
        promptText,
        entries: [],
      });
    }
    groups.get(groupKey).entries.push(entry);
  }

  const groupedItems = Array.from(groups.values()).map((group) => {
    const sortedEntries = (group.entries || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return {
      ...group,
      entries: sortedEntries,
      latestCreatedAt: sortedEntries[0]?.createdAt || null,
    };
  });

  groupedItems.sort((a, b) => {
    return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
  });

  return { items: groupedItems };
});
