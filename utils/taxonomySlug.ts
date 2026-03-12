const TAXONOMY_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const slugifyTaxonomyName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeTaxonomySlug = (value = "") => {
  const slug = slugifyTaxonomyName(value);
  return TAXONOMY_SLUG_RE.test(slug) ? slug : "";
};

export const buildTaxonomyPath = (basePath = "", slug = "") => {
  const normalizedSlug = normalizeTaxonomySlug(slug);
  if (!normalizedSlug) return String(basePath || "");
  return `${String(basePath || "").replace(/\/+$/, "")}/${normalizedSlug}`;
};
