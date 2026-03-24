export const buildSeoPagePath = (pageType: unknown, slug: unknown) => {
  const normalizedType = String(pageType || "").trim().toLowerCase();
  const normalizedSlug = String(slug || "").trim().toLowerCase();

  if (!normalizedSlug) return "/";
  if (normalizedType === "landing") return `/${normalizedSlug}`;
  if (normalizedType === "guide") return `/guides/${normalizedSlug}`;
  if (normalizedType === "topic") return `/topics/${normalizedSlug}`;
  return `/compare/${normalizedSlug}`;
};
