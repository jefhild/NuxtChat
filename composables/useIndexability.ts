const NUMERIC_HANDLE_RE = /^\d+$/;

export function shouldIndexTaxonomyPage(articleCount: number, minimumCount = 3) {
  return Number(articleCount || 0) >= minimumCount;
}

type IndexableProfile = {
  is_private?: boolean;
  displayname?: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  slug?: string;
};

export function shouldIndexProfile(
  profile: IndexableProfile | null | undefined,
  options?: { minBioLength?: number }
) {
  if (!profile || profile.is_private) return false;

  const minBioLength = Number(options?.minBioLength || 80);
  const displayname = String(profile.displayname || "").trim();
  const bio = String(profile.bio || "").trim();
  const tagline = String(profile.tagline || "").trim();
  const avatarUrl = String(profile.avatar_url || "").trim();
  const slug = String(profile.slug || "").trim().toLowerCase();

  if (!displayname) return false;
  if (!avatarUrl) return false;
  if (NUMERIC_HANDLE_RE.test(displayname) || NUMERIC_HANDLE_RE.test(slug)) return false;
  if (bio.length < minBioLength && tagline.length < 24) return false;

  return true;
}
