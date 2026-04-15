<template>
  <v-container fluid class="language-practice-page-shell">
    <div class="language-practice-header text-center mb-6">
      <v-chip color="success" variant="tonal" class="mb-3">
        {{ $t("pages.languagePractice.kicker") }}
      </v-chip>
      <h1 class="text-h4 font-weight-bold mb-2">{{ $t("pages.languagePractice.title") }}</h1>
      <p class="text-body-1 text-medium-emphasis">{{ $t("pages.languagePractice.subtitle") }}</p>
    </div>

    <section class="language-filter-panel mb-6" aria-labelledby="language-filter-heading">
      <h2 id="language-filter-heading" class="text-subtitle-1 font-weight-bold mb-3">
        {{ $t("pages.languagePractice.filtersTitle") }}
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ $t("pages.languagePractice.filtersExplanation") }}
      </p>
      <div class="language-filter-panel__controls">
        <v-select
          v-model="languageFilters.native_language_code"
          :items="languageOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          :label="$t('pages.languagePractice.nativeLanguage')"
        />
        <v-select
          v-model="languageFilters.target_language_code"
          :items="languageOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          :label="$t('pages.languagePractice.targetLanguage')"
        />
        <v-select
          v-model="languageFilters.target_language_level"
          :items="levelOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          :label="$t('pages.languagePractice.level')"
        />
        <v-select
          v-model="languageFilters.correction_preference"
          :items="correctionOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          :label="$t('pages.languagePractice.corrections')"
        />
        <v-select
          v-model="languageFilters.language_exchange_mode"
          :items="exchangeModeOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          :label="$t('pages.languagePractice.mode')"
        />
      </div>

      <div v-if="isAuthenticated" class="language-filter-panel__actions">
        <v-btn
          color="primary"
          variant="flat"
          :loading="savingPreferences"
          :disabled="savingPreferences || !hasSavableLanguageFilters"
          @click="saveCurrentFilters"
        >
          {{ $t("pages.languagePractice.saveSettings") }}
        </v-btn>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ $t("pages.languagePractice.saveHint") }}
        </p>
      </div>

      <v-alert
        v-if="saveError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ saveError }}
      </v-alert>

      <v-alert
        v-else-if="saveSuccess"
        type="success"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ saveSuccess }}
      </v-alert>

      <v-alert
        v-if="chatStartError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ chatStartError }}
      </v-alert>
    </section>

    <div v-if="isLoading" class="match-grid mt-4">
      <v-skeleton-loader
        v-for="n in 6"
        :key="`sk-${n}`"
        type="card"
        class="match-skeleton"
      />
    </div>

    <div v-else-if="!hasAnyCandidates" class="text-center mt-10">
      <v-icon size="64" color="surface-variant" class="mb-3">mdi-translate-off</v-icon>
      <p class="text-body-1 text-medium-emphasis">{{ $t("pages.languagePractice.empty") }}</p>
    </div>

    <template v-else>
      <section v-if="onlineCandidates.length" class="mb-8">
        <button
          class="language-section-header mb-3"
          type="button"
          :aria-expanded="isSectionOpen('online')"
          @click="toggleSection('online')"
        >
          <span class="dot dot-online" />
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.languagePractice.sections.online") }}
          </h2>
          <v-icon class="language-section-header__chevron" size="18">
            {{ isSectionOpen("online") ? "mdi-chevron-up" : "mdi-chevron-down" }}
          </v-icon>
        </button>
        <div v-show="isSectionOpen('online')" class="match-grid">
          <MatchCandidateCard
            v-for="c in onlineCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="true"
            :is-ai="false"
            context="language"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>

      <section v-if="offlineCandidates.length" class="mb-8">
        <button
          class="language-section-header mb-3"
          type="button"
          :aria-expanded="isSectionOpen('offline')"
          @click="toggleSection('offline')"
        >
          <span class="dot dot-offline" />
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.languagePractice.sections.offline") }}
          </h2>
          <v-icon class="language-section-header__chevron" size="18">
            {{ isSectionOpen("offline") ? "mdi-chevron-up" : "mdi-chevron-down" }}
          </v-icon>
        </button>
        <div v-show="isSectionOpen('offline')" class="match-grid">
          <MatchCandidateCard
            v-for="c in offlineCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="false"
            :is-ai="false"
            context="language"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>

      <section v-if="displayAiCandidates.length" class="mb-8">
        <button
          class="language-section-header mb-3"
          type="button"
          :aria-expanded="isSectionOpen('ai')"
          @click="toggleSection('ai')"
        >
          <v-icon size="18" color="secondary">mdi-robot-outline</v-icon>
          <h2 class="text-subtitle-1 font-weight-bold">
            {{ $t("pages.languagePractice.sections.ai") }}
          </h2>
          <v-icon class="language-section-header__chevron" size="18">
            {{ isSectionOpen("ai") ? "mdi-chevron-up" : "mdi-chevron-down" }}
          </v-icon>
        </button>
        <div v-show="isSectionOpen('ai')" class="match-grid">
          <MatchCandidateCard
            v-for="c in displayAiCandidates"
            :key="c.user_id"
            :candidate="c"
            :is-online="true"
            :is-ai="true"
            context="language"
            @chat="onChatRequest(c)"
            @view-profile="openProfileDialog(c)"
          />
        </div>
      </section>
    </template>

    <v-dialog v-model="onboardingDialogOpen" max-width="480">
      <v-card>
        <v-card-title class="pt-5 px-5">
          {{ $t("pages.languagePractice.onboardingDialog.title") }}
        </v-card-title>
        <v-card-text class="text-body-2 px-5">
          {{ $t("pages.languagePractice.onboardingDialog.body") }}
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="onboardingDialogOpen = false">
            {{ $t("pages.languagePractice.onboardingDialog.cancel") }}
          </v-btn>
          <v-btn color="primary" variant="flat" @click="goToOnboarding">
            {{ $t("pages.languagePractice.onboardingDialog.start") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { useDisplay } from "vuetify";
import { useLanguagePracticeProfile } from "@/composables/useLanguagePracticeProfile";
import { useLanguagePracticeSession } from "@/composables/useLanguagePracticeSession";

const { t, locale } = useI18n();
const route = useRoute();
const localPath = useLocalePath();
const auth = useAuthStore();
const onboardingDraft = useOnboardingDraftStore();
const { mdAndUp } = useDisplay();
const {
  fetchLanguagePracticePreference,
  saveLanguagePracticePreference,
} = useLanguagePracticeProfile();
const { createOrResumeLanguagePracticeSession } = useLanguagePracticeSession();

const languageFilters = ref({
  native_language_code: null,
  target_language_code: null,
  target_language_level: null,
  correction_preference: null,
  language_exchange_mode: null,
});

const candidateData = ref({ online: [], offline: [], ai: [] });
const publicPersonas = ref([]);
const publicOnline = ref([]);
const publicOffline = ref([]);
const loadingCandidates = ref(false);
const publicLoading = ref(false);
const onboardingDialogOpen = ref(false);
const pendingOnboardingCandidate = ref(null);
const profileDialogOpen = ref(false);
const profileDialogUserId = ref(null);
const openSections = ref(["online"]);
const largeScreenDefaultSections = ["online", "offline", "ai"];
const savingPreferences = ref(false);
const saveError = ref("");
const saveSuccess = ref("");
const chatStartError = ref("");

const isAuthenticated = computed(() => auth.authStatus !== "unauthenticated");
const authResolved = computed(() => auth.authResolved === true);
const isLoading = computed(
  () => !authResolved.value || loadingCandidates.value || publicLoading.value
);
const hasSavableLanguageFilters = computed(
  () =>
    Boolean(
      languageFilters.value.native_language_code ||
        languageFilters.value.target_language_code
    )
);

const languageOptions = computed(() => [
  { title: t("match.language.languages.en"), value: "en" },
  { title: t("match.language.languages.fr"), value: "fr" },
  { title: t("match.language.languages.ru"), value: "ru" },
  { title: t("match.language.languages.zh"), value: "zh" },
]);

const levelOptions = computed(() => [
  { title: t("pages.languagePractice.levels.unsure"), value: "unsure" },
  { title: t("pages.languagePractice.levels.a1"), value: "a1" },
  { title: t("pages.languagePractice.levels.a2"), value: "a2" },
  { title: t("pages.languagePractice.levels.b1"), value: "b1" },
  { title: t("pages.languagePractice.levels.b2"), value: "b2" },
  { title: t("pages.languagePractice.levels.c1"), value: "c1" },
  { title: t("pages.languagePractice.levels.c2"), value: "c2" },
]);

const correctionOptions = computed(() => [
  { title: t("match.language.correctionPreferences.no_corrections"), value: "no_corrections" },
  { title: t("match.language.correctionPreferences.light_corrections"), value: "light_corrections" },
  { title: t("match.language.correctionPreferences.active_corrections"), value: "active_corrections" },
]);

const exchangeModeOptions = computed(() => [
  { title: t("pages.languagePractice.exchangeModes.practice_only"), value: "practice_only" },
  { title: t("pages.languagePractice.exchangeModes.reciprocal_exchange"), value: "reciprocal_exchange" },
  { title: t("pages.languagePractice.exchangeModes.native_helper"), value: "native_helper" },
]);

const normalizeLanguageCode = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return null;
};

const normalizeChoice = (value, allowed) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : null;
};

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

function hydrateLanguageFiltersFromQuery() {
  languageFilters.value = {
    native_language_code: normalizeLanguageCode(route.query.nativeLanguage || route.query.native_language),
    target_language_code: normalizeLanguageCode(route.query.targetLanguage || route.query.target_language),
    target_language_level: normalizeChoice(route.query.level || route.query.targetLevel, ["a1", "a2", "b1", "b2", "c1", "c2", "unsure"]),
    correction_preference: normalizeChoice(route.query.correction, ["no_corrections", "light_corrections", "active_corrections"]),
    language_exchange_mode: normalizeChoice(route.query.exchangeMode || route.query.mode, ["practice_only", "reciprocal_exchange", "native_helper"]),
  };
}

function applyLanguageFilters(filters = {}) {
  languageFilters.value = {
    native_language_code: normalizeLanguageCode(filters.native_language_code),
    target_language_code: normalizeLanguageCode(filters.target_language_code),
    target_language_level: normalizeChoice(filters.target_language_level, [
      "a1",
      "a2",
      "b1",
      "b2",
      "c1",
      "c2",
      "unsure",
    ]),
    correction_preference: normalizeChoice(filters.correction_preference, [
      "no_corrections",
      "light_corrections",
      "active_corrections",
    ]),
    language_exchange_mode: normalizeChoice(filters.language_exchange_mode, [
      "practice_only",
      "reciprocal_exchange",
      "native_helper",
    ]),
  };
}

async function hydrateAuthenticatedLanguageFilters() {
  const hasQueryFilters = Object.values(languageFilters.value).some(Boolean);
  if (hasQueryFilters) return;

  try {
    const preference = await fetchLanguagePracticePreference();
    applyLanguageFilters(preference);
  } catch {
    // Leave query-derived filters in place if preference loading fails.
  }
}

function matchesLanguageFilters(candidate) {
  const {
    native_language_code: nativeLanguage,
    target_language_code: targetLanguage,
    target_language_level: targetLevel,
    correction_preference: correctionPreference,
    language_exchange_mode: exchangeMode,
  } = languageFilters.value;
  const candidateNativeLanguages = Array.isArray(candidate.supported_native_languages)
    ? candidate.supported_native_languages
    : [];
  const candidateTargetLanguages = Array.isArray(candidate.supported_target_languages)
    ? candidate.supported_target_languages
    : [];
  const candidateSupportedLevels = Array.isArray(candidate.supported_levels)
    ? candidate.supported_levels
    : [];
  const isAiCandidate = Boolean(candidate?.is_ai);
  const matchesCandidateNativeLanguage = (value) =>
    candidate.native_language_code === value || candidateNativeLanguages.includes(value);
  const matchesCandidateTargetLanguage = (value) =>
    candidate.target_language_code === value || candidateTargetLanguages.includes(value);
  const matchesCandidateLevel = (value) => {
    if (!value || value === "unsure") return true;
    if (!candidateSupportedLevels.length) {
      return candidate.target_language_level === value;
    }
    return (
      candidate.target_language_level === value ||
      candidateSupportedLevels.includes(value)
    );
  };

  if (targetLanguage) {
    const matchesRequestedTargetLanguage = isAiCandidate
      ? matchesCandidateTargetLanguage(targetLanguage)
      : matchesCandidateNativeLanguage(targetLanguage);
    if (!matchesRequestedTargetLanguage) {
      return false;
    }
  }

  if (nativeLanguage) {
    const matchesRequestedSupportLanguage = isAiCandidate
      ? matchesCandidateNativeLanguage(nativeLanguage)
      : matchesCandidateTargetLanguage(nativeLanguage);
    if (!matchesRequestedSupportLanguage) {
      return false;
    }
  }

  if (!matchesCandidateLevel(targetLevel)) {
    return false;
  }

  if (correctionPreference && candidate.correction_preference !== correctionPreference) {
    return false;
  }

  if (exchangeMode && candidate.language_exchange_mode !== exchangeMode) {
    return false;
  }

  return true;
}

const onlineCandidates = computed(() =>
  (isAuthenticated.value ? (candidateData.value.online ?? []) : publicOnline.value)
    .filter(matchesLanguageFilters)
    .filter((candidate) => String(candidate?.user_id || "").trim() !== String(auth.user?.id || "").trim())
);

const offlineCandidates = computed(() =>
  (isAuthenticated.value ? (candidateData.value.offline ?? []) : publicOffline.value)
    .filter(matchesLanguageFilters)
    .filter((candidate) => String(candidate?.user_id || "").trim() !== String(auth.user?.id || "").trim())
);

const displayAiCandidates = computed(() =>
  (isAuthenticated.value ? (candidateData.value.ai ?? []) : publicPersonas.value)
    .filter(matchesLanguageFilters)
    .filter((candidate) => String(candidate?.user_id || "").trim() !== String(auth.user?.id || "").trim())
);

const hasAnyCandidates = computed(
  () =>
    onlineCandidates.value.length +
    offlineCandidates.value.length +
    displayAiCandidates.value.length > 0
);

function isSectionOpen(section) {
  return openSections.value.includes(section);
}

function toggleSection(section) {
  if (isSectionOpen(section)) {
    openSections.value = openSections.value.filter((item) => item !== section);
    return;
  }
  openSections.value = [...openSections.value, section];
}

function openProfileDialog(candidate) {
  profileDialogUserId.value = candidate.user_id;
  profileDialogOpen.value = true;
}

async function onChatRequest(candidate) {
  if (!isAuthenticated.value) {
    pendingOnboardingCandidate.value = candidate;
    onboardingDialogOpen.value = true;
    return;
  }

  chatStartError.value = "";

  try {
    await createOrResumeLanguagePracticeSession({
      partner_user_id: candidate.user_id,
      source: "language_directory",
      ...languageFilters.value,
    });
    navigateTo(localPath(`/chat?userId=${candidate.user_id}&mode=language`));
  } catch (err) {
    chatStartError.value =
      err?.data?.statusMessage ||
      err?.data?.message ||
      t("pages.languagePractice.chatStartError");
  } finally {
  }
}

function buildOnboardingLanguageIntent(candidate) {
  const nativeLanguage =
    normalizeLanguageCode(languageFilters.value.native_language_code) || null;
  const targetLanguage =
    normalizeLanguageCode(languageFilters.value.target_language_code) ||
    normalizeLanguageCode(candidate?.native_language_code) ||
    null;
  const targetLevel =
    normalizeChoice(languageFilters.value.target_language_level, [
      "a1",
      "a2",
      "b1",
      "b2",
      "c1",
      "c2",
      "unsure",
    ]) || (targetLanguage ? "unsure" : null);
  const correctionPreference =
    normalizeChoice(languageFilters.value.correction_preference, [
      "no_corrections",
      "light_corrections",
      "active_corrections",
    ]) || "light_corrections";

  let exchangeMode =
    normalizeChoice(languageFilters.value.language_exchange_mode, [
      "practice_only",
      "reciprocal_exchange",
      "native_helper",
    ]) || null;

  if (!exchangeMode) {
    if (nativeLanguage && targetLanguage) {
      exchangeMode = "reciprocal_exchange";
    } else if (targetLanguage) {
      exchangeMode = "practice_only";
    } else if (nativeLanguage) {
      exchangeMode = "native_helper";
    }
  }

  if (!nativeLanguage && !targetLanguage) {
    return null;
  }

  return {
    is_active: true,
    native_language_code: nativeLanguage,
    target_language_code: targetLanguage,
    target_language_level: targetLevel,
    correction_preference: correctionPreference,
    language_exchange_mode: exchangeMode,
  };
}

function goToOnboarding() {
  onboardingDialogOpen.value = false;
  const intent = buildOnboardingLanguageIntent(pendingOnboardingCandidate.value);
  if (intent) {
    onboardingDraft.setLanguagePracticeIntent(intent);
  } else {
    onboardingDraft.clearLanguagePracticeIntent?.();
  }
  pendingOnboardingCandidate.value = null;
  navigateTo(localPath("/chat"));
}

async function loadAuthenticatedCandidates() {
  loadingCandidates.value = true;
  try {
    const [personasRes, candidatesRes] = await Promise.all([
      $fetch("/api/match/public-personas", {
        query: { languagePracticeOnly: true },
      }),
      $fetch("/api/match/public-candidates", {
        query: {
          locale: normalizeLocale(locale.value),
          languagePracticeOnly: true,
        },
      }),
    ]);
    candidateData.value = {
      online: candidatesRes?.online ?? [],
      offline: candidatesRes?.offline ?? [],
      ai: personasRes?.personas ?? [],
    };
  } catch {
    candidateData.value = { online: [], offline: [], ai: [] };
  } finally {
    loadingCandidates.value = false;
  }
}

async function loadPublicCandidates() {
  publicLoading.value = true;
  try {
    const [personasRes, candidatesRes] = await Promise.all([
      $fetch("/api/match/public-personas", {
        query: { languagePracticeOnly: true },
      }),
      $fetch("/api/match/public-candidates", {
        query: {
          locale: normalizeLocale(locale.value),
          languagePracticeOnly: true,
        },
      }),
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

async function loadCandidates() {
  if (isAuthenticated.value) {
    await loadAuthenticatedCandidates();
    return;
  }
  await loadPublicCandidates();
}

async function saveCurrentFilters() {
  if (!hasSavableLanguageFilters.value) return;

  savingPreferences.value = true;
  saveError.value = "";
  saveSuccess.value = "";

  try {
    await saveLanguagePracticePreference({
      is_active: true,
      ...languageFilters.value,
    });
    saveSuccess.value = t("pages.languagePractice.saveSuccess");
  } catch (err) {
    saveError.value =
      err?.data?.statusMessage ||
      err?.data?.message ||
      t("pages.languagePractice.saveError");
  } finally {
    savingPreferences.value = false;
  }
}

onMounted(async () => {
  openSections.value = mdAndUp.value ? largeScreenDefaultSections : ["online"];
  hydrateLanguageFiltersFromQuery();
  if (!authResolved.value) {
    await auth.checkAuth();
  }
  if (isAuthenticated.value) {
    await hydrateAuthenticatedLanguageFilters();
  }
  await loadCandidates();
});

watch(isAuthenticated, () => {
  if (!authResolved.value) return;
  loadCandidates();
});
watch(locale, () => {
  if (!authResolved.value) return;
  loadCandidates();
});

useHead({
  title: t("pages.languagePractice.seoTitle"),
  meta: [{ name: "description", content: t("pages.languagePractice.seoDescription") }],
});
</script>

<style scoped>
.language-practice-page-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 16px 64px;
}

.language-practice-header {
  max-width: 640px;
  margin: 0 auto;
}

.language-filter-panel {
  border: 1px solid rgba(var(--v-theme-outline), 0.22);
  border-radius: 8px;
  padding: 16px;
}

.language-filter-panel__controls {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
}

.language-filter-panel__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.language-section-header {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: 10px;
  padding: 0;
  text-align: left;
  width: 100%;
}

.language-section-header h2 {
  margin: 0;
}

.language-section-header__chevron {
  margin-left: auto;
}

.language-section-header:focus-visible {
  border-radius: 8px;
  outline: 2px solid rgba(var(--v-theme-primary), 0.8);
  outline-offset: 4px;
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

@media (max-width: 959px) {
  .language-filter-panel__controls {
    grid-template-columns: 1fr;
  }

  .language-filter-panel__actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
