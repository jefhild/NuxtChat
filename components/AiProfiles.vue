<template>
  <div class="ai-profiles">
    <!-- <v-card class="mb-6" variant="tonal">
      <v-card-title class="text-h5 font-weight-medium">
        {{ titleText }}
      </v-card-title>
      <v-card-subtitle class="text-body-2">
        {{ subtitleText }}
      </v-card-subtitle>
    </v-card> -->

    <v-skeleton-loader
      v-if="isLoading"
      type="heading, list-item-two-line, list-item-two-line"
      class="mb-6"
    />

    <div
      v-else
      v-for="category in categoryBlocks"
      :key="category.title"
      class="mb-10 category"
    >
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-overline text-medium-emphasis">
            {{ category.section }}
          </div>
          <h3 class="text-h5 font-weight-semibold mb-1">
            {{ category.title }}
          </h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ category.description }}
          </p>
        </div>
      </div>

      <v-row dense>
        <v-col
          v-for="profile in category.profiles"
          :key="profile.id || profile.name"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <!-- {{ profile }} -->
          <v-card class="ai-card" elevation="2" rounded="xl" variant="outlined">
            <div class="d-flex align-center mb-3">
              <v-avatar size="56" class="mr-3" rounded="lg">
                <NuxtImg
                  :src="avatarSource(profile)"
                  width="56"
                  height="56"
                  class="rounded-lg avatar-img"
                  :alt="`${profile.name} avatar`"
                  v-if="avatarSource(profile)"
                />
                <span v-else class="text-white text-subtitle-1">
                  {{ initials(profile.name) }}
                </span>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-medium ai-card-name">
                  {{ profile.name }}
                </div>
                <div class="text-caption ai-card-tagline">
                  {{ profile.tagline }}
                </div>
              </div>
              <v-chip
                v-if="profile.region"
                size="x-small"
                label
                variant="flat"
                class="ai-card-region"
              >
                {{ profile.region }}
              </v-chip>
            </div>

            <v-chip
              v-if="profile.bias"
              size="small"
              variant="flat"
              class="mb-3 font-weight-medium ai-card-bias"
            >
              {{ profile.bias }}
            </v-chip>

            <p class="text-body-2 ai-card-angle">
              {{ profile.angle }}
            </p>

            <div
              v-if="profile.slug && profile.genderPath"
              class="mt-4 d-flex align-center"
            >
              <NuxtLink
                :to="
                  localPath(`/profiles/${profile.genderPath}/${profile.slug}`)
                "
                class="text-decoration-none"
              >
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  class="pl-0"
                  prepend-icon="mdi-open-in-new"
                >
                  {{ viewProfileLabel }}
                </v-btn>
              </NuxtLink>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="mt-8" />
    </div>

    <v-alert
      v-if="!isLoading && !categoryBlocks.length"
      type="info"
      variant="tonal"
    >
      {{
        $t(
          "pages.about.page.ai-profiles-empty",
          "AI personas will appear here soon."
        )
      }}
    </v-alert>
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

const titleText = computed(() =>
  translateFirst(
    ["pages.about.page.aiProfiles.title", "pages.about.aiProfiles.title"],
    "Meet the AI newsroom"
  )
);

const subtitleText = computed(() =>
  translateFirst(
    ["pages.about.page.aiProfiles.subtitle", "pages.about.aiProfiles.subtitle"],
    "Each category uses a couple of distinct voices so you can see who is shaping the coverage and what lens they bring."
  )
);

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

.ai-card {
  --ai-card-bg: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 0.96),
    rgba(var(--v-theme-primary), 0.08)
  );
  --ai-card-border: rgba(var(--v-theme-on-surface), 0.2);
  --ai-card-name: rgba(var(--v-theme-on-surface), 0.96);
  --ai-card-muted: rgba(var(--v-theme-on-surface), 0.72);
  --ai-card-region-bg: rgba(var(--v-theme-secondary), 0.2);
  --ai-card-region-text: rgba(var(--v-theme-secondary), 0.98);
  --ai-card-bias-bg: rgba(var(--v-theme-primary), 0.2);
  --ai-card-bias-text: rgba(var(--v-theme-primary), 0.98);

  height: 100%;
  padding: 18px;
  transition: transform 120ms ease, box-shadow 120ms ease;
  background: var(--ai-card-bg);
  border-color: var(--ai-card-border) !important;
}

.ai-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(33, 33, 33, 0.12);
}

.ai-card-name {
  color: var(--ai-card-name);
}

.ai-card-tagline,
.ai-card-angle {
  color: var(--ai-card-muted);
}

.ai-card-region {
  background: var(--ai-card-region-bg) !important;
  color: var(--ai-card-region-text) !important;
}

.ai-card-bias {
  background: var(--ai-card-bias-bg) !important;
  color: var(--ai-card-bias-text) !important;
}

.avatar-img {
  object-fit: cover;
}

.category:last-of-type .v-divider {
  display: none;
}
</style>
