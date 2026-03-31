<template>
  <v-container fluid class="match-page-shell">

    <!-- Header -->
    <div class="match-header text-center mb-6">
      <v-chip color="primary" variant="tonal" class="mb-3">
        {{ $t("pages.match.kicker") }}
      </v-chip>
      <h1 class="text-h4 font-weight-bold mb-2">{{ $t("pages.match.title") }}</h1>
      <p class="text-body-1 text-medium-emphasis">{{ $t("pages.match.subtitle") }}</p>
    </div>

    <!-- Mood chips -->
    <div class="match-chips-wrap mb-6">
      <MatchMoodChipsBar :selected-key="activePreset?.key ?? null" @select="onPresetSelect" />
    </div>

    <!-- Active mood banner (when preset is set) -->
    <v-alert
      v-if="activePreset"
      type="info"
      variant="tonal"
      closable
      class="mb-6"
      @click:close="clearPreset"
    >
      <span>
        {{ $t("pages.match.moodSet", { mood: $t(activePreset.labelKey) }) }}
        <template v-if="!isAuthenticated">
          &mdash;
          <a href="#" @click.prevent="goSignIn">{{ $t("pages.match.signInToSave") }}</a>
        </template>
      </span>
    </v-alert>

    <!-- Loading skeleton -->
    <div v-if="loading || publicLoading" class="match-grid mt-4">
      <v-skeleton-loader
        v-for="n in 6"
        :key="`sk-${n}`"
        type="card"
        class="match-skeleton"
      />
    </div>

    <!-- No candidates empty state (only for authenticated with real data) -->
    <div
      v-else-if="isAuthenticated && !hasAnyCandidates"
      class="text-center mt-10"
    >
      <v-icon size="64" color="surface-variant" class="mb-3">mdi-account-search-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis">{{ $t("pages.match.empty") }}</p>
    </div>

    <template v-else>
      <!-- Online section (authenticated users only) -->
      <section v-if="onlineCandidates.length" class="mb-8">
        <div class="d-flex align-center gap-2 mb-3">
          <span class="dot dot-online" />
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.match.sections.online") }} ({{ onlineCandidates.length }})
          </h2>
        </div>
        <div class="match-grid">
          <MatchCandidateCard
            v-for="c in onlineCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="true"
            :is-ai="false"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>

      <!-- Offline / recently connected section -->
      <section v-if="offlineCandidates.length" class="mb-8">
        <div class="d-flex align-center gap-2 mb-3">
          <span class="dot dot-offline" />
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.match.sections.offline") }} ({{ offlineCandidates.length }})
          </h2>
        </div>
        <div class="match-grid">
          <MatchCandidateCard
            v-for="c in offlineCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="false"
            :is-ai="false"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>

      <!-- AI section (authenticated: scored | unauthenticated: public personas) -->
      <section v-if="displayAiCandidates.length" class="mb-8">
        <div class="d-flex align-center gap-2 mb-3">
          <v-icon size="18" color="secondary">mdi-robot-outline</v-icon>
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.match.sections.ai") }} ({{ displayAiCandidates.length }})
          </h2>
        </div>
        <div class="match-grid">
          <MatchCandidateCard
            v-for="c in displayAiCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="true"
            :is-ai="true"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>
    </template>

    <!-- Onboarding dialog (unauthenticated users who click a card) -->
    <v-dialog v-model="onboardingDialogOpen" max-width="480">
      <v-card>
        <v-card-title class="pt-5 px-5">
          {{ $t("pages.match.onboardingDialog.title") }}
        </v-card-title>
        <v-card-text class="text-body-2 px-5">
          {{ $t("pages.match.onboardingDialog.body") }}
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="onboardingDialogOpen = false">
            {{ $t("pages.match.onboardingDialog.cancel") }}
          </v-btn>
          <v-btn color="primary" variant="flat" @click="goToOnboarding">
            {{ $t("pages.match.onboardingDialog.start") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Profile viewer (all auth states) -->
    <ProfileDialog
      v-model="profileDialogOpen"
      :user-id="profileDialogUserId"
    />

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useLocalePath } from "#imports";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useMatchCandidates, bustMatchCache } from "@/composables/useMatchCandidates";
import { getPreset } from "@/constants/moodPresets";

const { t } = useI18n();
const route = useRoute();
const localPath = useLocalePath();
const auth = useAuthStore();

const { data: matchData, loading, fetchCandidates } = useMatchCandidates();

const activePreset = ref(null);
const onboardingDialogOpen = ref(false);
const settingMood = ref(false);

// Profile dialog — works for all auth states
const profileDialogOpen = ref(false);
const profileDialogUserId = ref(null);

function openProfileDialog(candidate) {
  profileDialogUserId.value = candidate.user_id;
  profileDialogOpen.value = true;
}

// Public data for unauthenticated visitors
const publicPersonas = ref([]);
const publicOnline = ref([]);
const publicOffline = ref([]);
const publicLoading = ref(false);

const isAuthenticated = computed(() =>
  auth.authStatus !== "unauthenticated"
);

// Sign-in: stash the current destination so callback.vue can return here after OAuth
function goSignIn() {
  const preset = activePreset.value?.key;
  const dest = preset ? `/match?preset=${preset}` : "/match";
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("postLoginNext", dest);
  }
  navigateTo(localPath("/signin"));
}

// Keep signinHref as a fallback href (for non-JS / SSR rendering)
const signinHref = computed(() => {
  const preset = activePreset.value?.key;
  const dest = preset ? `/match?preset=${preset}` : "/match";
  return localPath(`/signin?next=${encodeURIComponent(dest)}`);
});

// Candidate lists — use public data for unauthenticated visitors
const onlineCandidates = computed(() =>
  isAuthenticated.value ? (matchData.value?.online ?? []) : publicOnline.value
);
const offlineCandidates = computed(() =>
  isAuthenticated.value ? (matchData.value?.offline ?? []) : publicOffline.value
);
const aiCandidates = computed(() => matchData.value?.ai ?? []);

// Show scored AI when authenticated, or public personas when not
const displayAiCandidates = computed(() =>
  isAuthenticated.value ? aiCandidates.value : publicPersonas.value
);

const hasAnyCandidates = computed(
  () =>
    onlineCandidates.value.length +
    offlineCandidates.value.length +
    aiCandidates.value.length > 0
);

// ----------------------------------------------------------
// Preset selection
// ----------------------------------------------------------
async function onPresetSelect(preset) {
  if (activePreset.value?.key === preset.key) {
    clearPreset();
    return;
  }

  activePreset.value = preset;

  if (isAuthenticated.value) {
    await applyPresetToMoodState(preset);
    bustMatchCache();
    fetchCandidates(true);
  }
  // Unauthenticated: preset is visual-only — public personas stay fixed
}

async function applyPresetToMoodState(preset) {
  if (settingMood.value) return;
  settingMood.value = true;
  try {
    await $fetch("/api/live-mood/self-select", {
      method: "POST",
      body: {
        emotion: preset.emotion,
        intent: preset.intent,
        energy: preset.energy,
        time_horizon: preset.time_horizon,
      },
    });
  } catch {
    // Non-fatal
  } finally {
    settingMood.value = false;
  }
}

function clearPreset() {
  activePreset.value = null;
}

// ----------------------------------------------------------
// Chat initiation
// ----------------------------------------------------------
function onChatRequest(_candidate) {
  if (!isAuthenticated.value) {
    onboardingDialogOpen.value = true;
    return;
  }
  navigateTo(localPath(`/chat?userId=${_candidate.user_id}`));
}

function goToOnboarding() {
  onboardingDialogOpen.value = false;
  // /chat handles the full anonymous onboarding flow
  navigateTo(localPath("/chat"));
}

// ----------------------------------------------------------
// Public personas (unauthenticated path)
// ----------------------------------------------------------
async function loadPublicPersonas() {
  publicLoading.value = true;
  try {
    const [personasRes, candidatesRes] = await Promise.all([
      $fetch("/api/match/public-personas"),
      $fetch("/api/match/public-candidates"),
    ]);
    publicPersonas.value = personasRes?.personas ?? [];
    publicOnline.value = candidatesRes?.online ?? [];
    publicOffline.value = candidatesRes?.offline ?? [];
  } catch {
    publicPersonas.value = [];
    publicOnline.value = [];
    publicOffline.value = [];
  } finally {
    publicLoading.value = false;
  }
}

// ----------------------------------------------------------
// Lifecycle
// ----------------------------------------------------------
onMounted(async () => {
  // Always pre-load public personas so unauthenticated visitors see content
  await loadPublicPersonas();

  const queryPreset = getPreset(route.query.preset);
  if (queryPreset) {
    activePreset.value = queryPreset;
    if (isAuthenticated.value) {
      await applyPresetToMoodState(queryPreset);
      bustMatchCache();
    }
  }

  if (isAuthenticated.value) {
    fetchCandidates(true);
  }
});

// Reactively handle preset changes via browser back/forward navigation
watch(
  () => route.query.preset,
  async (newKey) => {
    const p = getPreset(newKey);
    if (p && p.key !== activePreset.value?.key) {
      await onPresetSelect(p);
    } else if (!p) {
      clearPreset();
    }
  }
);

// When auth state changes (e.g. user signs in), fetch scored candidates
watch(isAuthenticated, async (authed) => {
  if (authed) {
    if (activePreset.value) {
      await applyPresetToMoodState(activePreset.value);
      bustMatchCache();
    }
    fetchCandidates(true);
  }
});

// ----------------------------------------------------------
// SEO
// ----------------------------------------------------------
useHead({
  title: t("pages.match.seoTitle"),
  meta: [{ name: "description", content: t("pages.match.seoDescription") }],
});
</script>

<style scoped>
.match-page-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 16px 64px;
}

.match-header {
  max-width: 600px;
  margin: 0 auto;
}

.match-chips-wrap {
  display: flex;
  justify-content: center;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.match-skeleton {
  border-radius: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.dot-online {
  background: rgb(var(--v-theme-success));
}

.dot-offline {
  background: rgb(var(--v-theme-surface-variant));
}
</style>
