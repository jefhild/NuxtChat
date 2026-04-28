export function buildFaqTopicPath(groupSlug: string, topicSlug: string) {
  const group = String(groupSlug || "").trim().toLowerCase();
  const topic = String(topicSlug || "").trim().toLowerCase();
  if (!group || !topic) return "/faq";
  return `/faq/${group}/${topic}`;
}
