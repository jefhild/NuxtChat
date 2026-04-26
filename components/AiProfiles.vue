<template>
  <div class="ai-profiles">
    <LoadingContainer v-if="isLoading" />

    <div
      v-else
      v-for="category in categoryBlocks"
      :key="category.title"
      class="category"
    >
      <div class="category__header">
        <div class="category__section">
          {{ category.section }}
        </div>
        <h3 class="category__title">
          {{ category.title }}
        </h3>
        <p class="category__description">
          {{ category.description }}
        </p>
      </div>

      <div class="category__grid">
        <article
          v-for="profile in category.profiles"
          :key="profile.id || profile.name"
          class="ai-card"
        >
          <div class="ai-card__top">
            <div class="ai-card__identity">
              <div class="ai-card__avatar-shell">
                <NuxtImg
                  v-if="avatarSource(profile)"
                  :src="avatarSource(profile)"
                  width="56"
                  height="56"
                  class="ai-card__avatar"
                  :alt="`${profile.name} avatar`"
                />
                <div v-else class="ai-card__avatar ai-card__avatar--fallback">
                  {{ initials(profile.name) }}
                </div>
              </div>

              <div class="ai-card__identity-copy">
                <div class="ai-card__name">
                  {{ profile.name }}
                </div>
                <div class="ai-card__tagline">
                  {{ profile.tagline }}
                </div>
              </div>
            </div>

            <span v-if="profile.region" class="ai-card__badge ai-card__badge--region">
              {{ profile.region }}
            </span>
          </div>

          <span v-if="profile.bias" class="ai-card__badge ai-card__badge--bias">
            {{ profile.bias }}
          </span>

          <p class="ai-card__angle">
            {{ profile.angle }}
          </p>

          <div v-if="profile.slug && profile.genderPath" class="ai-card__footer">
            <NuxtLink
              :to="localPath(`/profiles/${profile.genderPath}/${profile.slug}`)"
              class="ai-card__link"
            >
              <i class="mdi mdi-open-in-new ai-card__link-icon" aria-hidden="true" />
              {{ viewProfileLabel }}
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>

    <div v-if="!isLoading && !categoryBlocks.length" class="ai-profiles__empty" role="status">
      {{
        $t(
          "pages.about.page.ai-profiles-empty",
          "AI personas will appear here soon."
        )
      }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { getAvatar, getGenderPath } from "@/composables/useUserUtils";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const { t, te, locale } = useI18n();
const localPath = useLocalePath();

const defaultSection = "Mood";
const defaultDescription =
  "Chat companions matched to how you're feeling right now.";

const translateFirst = (paths, fallback) => {
  for (const key of paths) {
    if (te(key)) return t(key);
  }
  return fallback;
};

const categoryCopy = (slug) => {
  const basePaths = [
    `pages.about.page.aiProfiles.moodGroups.${slug}`,
    `pages.about.aiProfiles.moodGroups.${slug}`,
  ];
  const defaultPaths = [
    "pages.about.page.aiProfiles.default",
    "pages.about.aiProfiles.default",
  ];

  const section = translateFirst(
    basePaths.map((p) => `${p}.section`).concat(
      defaultPaths.map((p) => `${p}.section`)
    ),
    defaultSection
  );

  const title = translateFirst(
    basePaths.map((p) => `${p}.title`),
    slug
  );

  const description = translateFirst(
    basePaths.map((p) => `${p}.description`).concat(
      defaultPaths.map((p) => `${p}.description`)
    ),
    defaultDescription
  );

  const orderKey = basePaths.map((p) => `${p}.order`).find((k) => te(k));
  const order = orderKey ? Number(t(orderKey)) : 99;

  return { section, title, description, order };
};

const {
  data: personaResponse,
  pending,
  error,
} = await useFetch("/api/ai-personas", {
  default: () => ({ success: true, data: [] }),
});

const personas = computed(() => {
  const payload = personaResponse.value?.data || [];
  return payload.map((persona) => {
    const profile = persona.profile || {};
    const localized = resolveProfileLocalization({
      profile,
      readerLocale: locale?.value,
    });

    return {
      id: persona.id,
      name: localized.displayname || profile.displayname || persona.persona_key,
      role: persona.role || "Contributor",
      bias: persona.bias || "",
      angle:
        localized.angle ||
        persona.angle ||
        persona.summary ||
        localized.tagline ||
        localized.bio ||
        "",
      region: persona.region || persona.locale || "",
      slug: profile.slug || null,
      genderPath: profile.gender_id ? getGenderPath(profile.gender_id) : null,
      genderId: profile.gender_id || null,
      avatarUrl: profile.avatar_url || null,
      moodGroup: persona.mood_group || "other",
      tagline:
        localized.tagline || localized.bio || persona.role || "Contributor",
    };
  });
});

const categoryBlocks = computed(() => {
  const grouped = new Map();

  personas.value.forEach((profile) => {
    const slug = profile.moodGroup || "other";
    const copy = categoryCopy(slug);

    if (!grouped.has(slug)) {
      grouped.set(slug, {
        slug,
        section: copy.section || defaultSection,
        title: copy.title || slug,
        description: copy.description || defaultDescription,
        order: copy.order || 99,
        profiles: [],
      });
    }

    grouped.get(slug).profiles.push(profile);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.slug === "other" && b.slug !== "other") return 1;
    if (b.slug === "other" && a.slug !== "other") return -1;
    if (a.order === b.order) return a.title.localeCompare(b.title);
    return a.order - b.order;
  });
});

const initials = (name) =>
  (name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isLoading = computed(
  () => pending.value && !personaResponse.value?.data?.length
);

const avatarSource = (profile) =>
  getAvatar(profile.avatarUrl, profile.genderId || undefined);

const viewProfileLabel = computed(() =>
  te("common.view-profile") ? t("common.view-profile") : "View profile"
);

if (error.value) {
  console.error("[AiProfiles] Failed to load personas:", error.value);
}
</script>

<style scoped>
.ai-profiles {
  margin-top: 8px;
}

.category {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgb(var(--color-border) / 0.65);
}

.category:last-of-type {
  border-bottom: 0;
  padding-bottom: 0;
}

.category__header {
  margin-bottom: 1rem;
}

.category__section {
  margin-bottom: 0.2rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-foreground) / 0.58);
}

.category__title {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 650;
  line-height: 1.3;
  color: rgb(var(--color-foreground));
}

.category__description {
  margin: 0;
  max-width: 60rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.68);
}

.category__grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

.ai-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  height: 100%;
  padding: 1.125rem;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 1rem;
  background:
    linear-gradient(
      145deg,
      rgb(var(--color-surface) / 0.96),
      rgb(var(--color-primary) / 0.08)
    );
  box-shadow: 0 10px 24px rgb(var(--color-shadow) / 0.08);
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.ai-card:hover {
  transform: translateY(-3px);
  border-color: rgb(var(--color-primary) / 0.3);
  box-shadow: 0 16px 30px rgb(var(--color-shadow) / 0.14);
}

.ai-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.ai-card__identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.ai-card__avatar-shell {
  flex: 0 0 auto;
}

.ai-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 0.875rem;
  object-fit: cover;
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
  font-size: 1rem;
  font-weight: 700;
}

.ai-card__avatar--fallback {
  border: 1px solid rgb(var(--color-primary) / 0.18);
}

.ai-card__identity-copy {
  min-width: 0;
}

.ai-card__name {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.ai-card__tagline {
  margin-top: 0.15rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgb(var(--color-foreground) / 0.66);
}

.ai-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  padding: 0.28rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.ai-card__badge--region {
  background: rgb(var(--color-secondary) / 0.18);
  color: rgb(var(--color-secondary));
}

.ai-card__badge--bias {
  background: rgb(var(--color-primary) / 0.14);
  color: rgb(var(--color-primary));
}

.ai-card__angle {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.76);
}

.ai-card__footer {
  margin-top: auto;
}

.ai-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgb(var(--color-primary));
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.ai-card__link:hover {
  text-decoration: underline;
}

.ai-card__link-icon {
  font-size: 0.95rem;
}

.ai-profiles__empty {
  padding: 1rem 1.1rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 16px;
  background: rgb(var(--color-primary) / 0.06);
  color: rgb(var(--color-foreground) / 0.78);
}

@media (min-width: 640px) {
  .category__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .category__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .category__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
