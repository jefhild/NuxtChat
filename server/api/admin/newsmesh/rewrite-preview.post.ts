import { getServiceRoleClient } from "~/server/utils/aiBots";
import { buildUserPrompt } from "~/server/utils/newsmeshRewrite";

const MAX_BATCH = 5;

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleIds = Array.isArray(body.articleIds)
      ? body.articleIds.filter((id: unknown) => typeof id === "string")
      : [];
    const extraInstructions = String(body.instructions || "").trim();

    if (!articleIds.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Select at least one article." };
    }

    if (articleIds.length > MAX_BATCH) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: `You can rewrite up to ${MAX_BATCH} articles at a time.`,
      };
    }

    const supabase = await getServiceRoleClient(event);

    const { data: articles, error: articlesError } = await supabase
      .from("newsmesh_union_view")
      .select(
        `
        stream,
        id,
        article_id,
        title,
        description,
        link,
        link_hash,
        media_url,
        published_date,
        source,
        category,
        topics,
        people,
        first_seen_at,
        last_seen_at,
        seen_count,
        status
      `
      )
      .in("id", articleIds);

    if (articlesError) throw articlesError;

    if (!articles?.length) {
      setResponseStatus(event, 404);
      return { success: false, error: "No articles found for selection." };
    }

    const articleMap = new Map(
      articles.map((article) => [article.id, article] as const)
    );

    const results: Array<{
      articleId: string;
      stream: string;
      prompt: string;
      sourceText: string | null;
      original: {
        title: string | null;
        description: string | null;
        link: string | null;
        source: string | null;
        published_date: string | null;
      };
    }> = [];

    for (const articleId of articleIds) {
      const article = articleMap.get(articleId);
      if (!article) continue;

      const { prompt, sourceText } = await buildUserPrompt({
        article,
        extraInstructions: extraInstructions || undefined,
      });

      results.push({
        articleId: article.id,
        stream: article.stream,
        prompt,
        sourceText,
        original: {
          title: article.title,
          description: article.description,
          link: article.link,
          source: article.source,
          published_date: article.published_date,
        },
      });
    }

    return { success: true, data: results };
  } catch (error) {
    const err = error as any;
    console.error("[admin/newsmesh] rewrite preview error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage ||
        err?.message ||
        "Unable to build rewrite prompts. Try again later.",
    };
  }
});
