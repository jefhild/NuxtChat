import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { getOpenAIClient } from "~/server/utils/openaiGateway";
import { slugifySeoPage } from "~/server/utils/seoPages";
import { buildSeoPagePath } from "~/utils/seoPagePaths";

const PAGE_TYPE_LABELS: Record<string, string> = {
  landing: "landing page (root URL, e.g. /free-anonymous-chat-rooms)",
  guide: "guide page (URL prefix /guides/, e.g. /guides/how-to-chat-anonymously)",
  topic: "topic page (URL prefix /topics/, e.g. /topics/anonymous-chat)",
  compare: "compare page (URL prefix /compare/, e.g. /compare/omegle-vs-imchatty)",
};

const STYLE_GUIDE = `
Writing style rules (follow these strictly):
- Voice: clear, direct, grounded. Not promotional. No "we are thrilled" or hype language.
- Sentences: short-to-medium. Paragraph breaks every 2-4 sentences.
- Body uses ## H2 markdown headers to divide sections. No H1. No H3.
- Body length: 500-800 words.
- Highlights: 4 short punchy phrases (no punctuation at end), each under 10 words.
- subtitle: one plain sentence describing the page purpose, under 20 words.
- heroBody: 2-3 sentences that expand on the heroTitle, direct and grounded.
- metaTitle: under 60 chars, format "Keyword Phrase | ImChatty".
- metaDescription: 140-160 chars, no hype, describes what the page is about.
- ctaLabel: short imperative phrase, default "Start chatting".
- ctaHref: always "/chat".
- relatedLinks: 3-5 links to existing pages from the provided list.
- faqSuggestions: 3-5 Q&A pairs, plain conversational answers, 2-4 sentences each.
`.trim();

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const body = (await readBody(event)) || {};
    const slug = slugifySeoPage(body.slug);
    const pageType = String(body.pageType || "landing").toLowerCase() as "landing" | "guide" | "topic" | "compare";
    const rationale = String(body.rationale || "").trim();
    const targetQueries: string[] = Array.isArray(body.targetQueries) ? body.targetQueries : [];

    if (!slug) {
      setResponseStatus(event, 400);
      return { success: false, error: "slug is required" };
    }

    // Fetch existing published English pages for related links context
    const { data: existingPages } = await supabase
      .from("seo_pages")
      .select("slug, page_type, title")
      .eq("locale", "en")
      .eq("is_published", true)
      .order("slug");

    const existingPageList = ((existingPages ?? []) as { slug: string; page_type: string; title: string }[])
      .filter((p) => p.slug !== slug)
      .map((p) => ({
        title: p.title,
        href: buildSeoPagePath(p.page_type, p.slug),
      }));

    const config = useRuntimeConfig(event);
    const { client, model } = getOpenAIClient({ runtimeConfig: config });
    if (!client) {
      setResponseStatus(event, 503);
      return { success: false, error: "OpenAI is not configured." };
    }

    const pageUrl = buildSeoPagePath(pageType, slug);
    const pageTypeLabel = PAGE_TYPE_LABELS[pageType] ?? pageType;
    const humanTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const prompt = `You are an SEO content writer for ImChatty (imchatty.com), an anonymous text-based chat platform.

${STYLE_GUIDE}

## Page to generate
- URL: ${pageUrl}
- Suggested title: ${humanTitle}
- Page type: ${pageTypeLabel}
- SEO rationale: ${rationale || "Users search for this topic but no dedicated page exists yet."}
- Target search queries: ${targetQueries.length ? targetQueries.join(", ") : "none provided"}

## Existing published pages (use only these for relatedLinks — pick 3-5 that are most relevant):
${existingPageList.map((p) => `- "${p.title}" → ${p.href}`).join("\n") || "None available yet."}

## Your task
Return a single valid JSON object (no markdown, no explanation) with this exact shape:

{
  "pageType": "${pageType}",
  "locale": "en",
  "slug": "${slug}",
  "title": "...",
  "subtitle": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "heroTitle": "...",
  "heroBody": "...",
  "highlights": ["...", "...", "...", "..."],
  "body": "## Section heading\\n\\nParagraph...\\n\\n## Another section\\n\\nParagraph...",
  "ctaLabel": "Start chatting",
  "ctaHref": "/chat",
  "relatedLinks": [
    { "label": "...", "href": "..." }
  ],
  "faqSuggestions": [
    { "question": "...", "answer": "..." }
  ]
}`;

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2500,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const generated = JSON.parse(cleaned);

    return { success: true, page: generated };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    console.error("[admin/seo-pages/generate] error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Failed to generate page content.",
    };
  }
});
