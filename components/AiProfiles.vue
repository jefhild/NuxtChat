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
                <div class="text-subtitle-1 font-weight-medium">
                  {{ profile.name }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ profile.tagline }}
                </div>
              </div>
              <v-chip
                v-if="profile.region"
                size="x-small"
                label
                variant="tonal"
                color="secondary"
              >
                {{ profile.region }}
              </v-chip>
            </div>

            <v-chip
              v-if="profile.bias"
              size="small"
              color="primary"
              variant="tonal"
              class="mb-3 font-weight-medium"
            >
              {{ profile.bias }}
            </v-chip>

            <p class="text-body-2 text-medium-emphasis">
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

const defaultSection = "AI Voices";
const defaultDescription =
  "Active newsroom personas grouped by category so you can see who shapes each rewrite.";

const translateFirst = (paths, fallback) => {
  for (const key of paths) {
    if (te(key)) return t(key);
  }
  return fallback;
};
const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoryCopy = (slug) => {
  const basePaths = [
    `pages.about.page.aiProfiles.categories.${slug}`,
    `pages.about.aiProfiles.categories.${slug}`,
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

  const description = translateFirst(
    basePaths.map((p) => `${p}.description`).concat(
      defaultPaths.map((p) => `${p}.description`)
    ),
    defaultDescription
  );

  const orderKey = basePaths.map((p) => `${p}.order`).find((k) => te(k));
  const order = orderKey ? Number(t(orderKey)) : 99;

  return { section, description, order };
};

const personaCopy = {
  "civic-sentinel": {
    bias: "Center-left - institutionalist",
    angle:
      "Prioritizes rule-of-law, coalition building, and social protections when weighing geopolitical moves.",
    region: "US/EU",
    categorySlug: "world-politics",
  },
  "liberty-ledger": {
    bias: "Center-right - free-market",
    angle:
      "Scrutinizes government spending, champions decentralization, and spotlights individual liberties.",
    region: "US",
    categorySlug: "world-politics",
  },
  "market-maven": {
    bias: "Pro-growth - investor-forward",
    angle:
      "Frames stories around innovation, capital flows, and how policy shifts ripple through markets.",
    region: "Global",
    categorySlug: "business-economy",
  },
  "workers-wire": {
    bias: "Pro-labor - social safety nets",
    angle:
      "Centers wages, workplace power, and the human impact of corporate or policy decisions.",
    region: "US/EU",
    categorySlug: "business-economy",
  },
  futureproof: {
    bias: "Pro-innovation - venture mindset",
    angle:
      "Highlights breakthroughs, founder narratives, and how technology can accelerate productivity.",
    region: "Global",
    categorySlug: "science-technology",
  },
  "safety-net": {
    bias: "Precautionary - regulation-minded",
    angle:
      "Surfaces governance gaps, safety guardrails, and the social cost of unchecked tech.",
    region: "Global",
    categorySlug: "science-technology",
  },
  "cultural-currents": {
    bias: "Inclusive - reform-first",
    angle:
      "Explores representation, power dynamics, and the social movements pushing change.",
    region: "US",
    categorySlug: "society-identity",
  },
  "tradition-keeper": {
    bias: "Conservative - institution-first",
    angle:
      "Looks for continuity, community stability, and the tradeoffs that come with rapid shifts.",
    region: "US",
    categorySlug: "society-identity",
  },
  "maga-dude": {
    bias: "Center-right - free-market",
    angle:
      "Scrutinizes government spending, champions decentralization, and spotlights individual liberties.",
    region: "US",
    categorySlug: "world-politics",
  },
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
    const fallback =
      personaCopy[persona.persona_key] || personaCopy[profile.slug] || {};

    const categorySlug =
      fallback.categorySlug ||
      slugify(persona?.category?.slug || persona?.category?.name || "");

    return {
      id: persona.id,
      name: localized.displayname || profile.displayname || persona.persona_key,
      role: persona.role || "Contributor",
      bias: persona.bias || fallback.bias || "",
      angle:
        persona.angle ||
        persona.summary ||
        localized.tagline ||
        localized.bio ||
        fallback.angle ||
        "",
      region: persona.region || persona.locale || fallback.region || "",
      slug: profile.slug || null,
      genderPath: profile.gender_id ? getGenderPath(profile.gender_id) : null,
      genderId: profile.gender_id || null,
      avatarUrl: profile.avatar_url || null,
      categoryTitle:
        persona?.category?.name || fallback.categoryTitle || "AI Voices",
      categorySlug: categorySlug || fallback.categorySlug || "ai-voices",
      tagline:
        localized.tagline || localized.bio || persona.role || "Contributor",
    };
  });
});

const categoryBlocks = computed(() => {
  const grouped = new Map();

  personas.value.forEach((profile) => {
    const slug = profile.categorySlug || "ai-voices";
    const copy = categoryCopy(slug);
    const title = profile.categoryTitle || "AI Voices";

    if (!grouped.has(slug)) {
      grouped.set(slug, {
        slug,
        section: copy.section || defaultSection,
        title,
        description: copy.description || defaultDescription,
        order: copy.order || 99,
        profiles: [],
      });
    }

    grouped.get(slug).profiles.push(profile);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.slug === "ai-voices" && b.slug !== "ai-voices") return 1;
    if (b.slug === "ai-voices" && a.slug !== "ai-voices") return -1;
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
  height: 100%;
  padding: 18px;
  transition: transform 120ms ease, box-shadow 120ms ease;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.9),
    rgba(245, 248, 255, 0.85)
  );
}

.ai-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(33, 33, 33, 0.12);
}

.avatar-img {
  object-fit: cover;
}

.category:last-of-type .v-divider {
  display: none;
}
</style>
