<template>
  <div class="language-practice-page-shell mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="language-practice-header text-center mb-6">
      <div class="language-practice-kicker type-eyebrow">
        {{ $t("pages.languagePractice.kicker") }}
      </div>
      <h1 class="language-practice-title type-page-title">{{ $t("pages.languagePractice.title") }}</h1>
      <p class="language-practice-subtitle type-page-subtitle">{{ $t("pages.languagePractice.subtitle") }}</p>
    </div>

    <section class="language-filter-panel mb-6" aria-labelledby="language-filter-heading">
      <h2 id="language-filter-heading" class="language-filter-panel__title type-card-title">
        {{ $t("pages.languagePractice.filtersTitle") }}
      </h2>
      <p class="language-filter-panel__description">
        {{ $t("pages.languagePractice.filtersExplanation") }}
      </p>
      <div class="language-filter-panel__controls">
        <label class="language-filter-field">
          <span class="language-filter-field__label">{{ $t("pages.languagePractice.nativeLanguage") }}</span>
          <select v-model="languageFilters.native_language_code" class="language-filter-field__control">
            <option :value="null">{{ $t("components.filter-menu.all") }}</option>
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>
        <label class="language-filter-field">
          <span class="language-filter-field__label">{{ $t("pages.languagePractice.targetLanguage") }}</span>
          <select v-model="languageFilters.target_language_code" class="language-filter-field__control">
            <option :value="null">{{ $t("components.filter-menu.all") }}</option>
            <option v-for="option in languageOptions" :key="`target-${option.value}`" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>
        <label class="language-filter-field">
          <span class="language-filter-field__label">{{ $t("pages.languagePractice.level") }}</span>
          <select v-model="languageFilters.target_language_level" class="language-filter-field__control">
            <option :value="null">{{ $t("components.filter-menu.all") }}</option>
            <option v-for="option in levelOptions" :key="option.value" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>
        <label class="language-filter-field">
          <span class="language-filter-field__label">{{ $t("pages.languagePractice.corrections") }}</span>
          <select v-model="languageFilters.correction_preference" class="language-filter-field__control">
            <option :value="null">{{ $t("components.filter-menu.all") }}</option>
            <option v-for="option in correctionOptions" :key="option.value" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>
        <label class="language-filter-field">
          <span class="language-filter-field__label">{{ $t("pages.languagePractice.mode") }}</span>
          <select v-model="languageFilters.language_exchange_mode" class="language-filter-field__control">
            <option :value="null">{{ $t("components.filter-menu.all") }}</option>
            <option v-for="option in exchangeModeOptions" :key="option.value" :value="option.value">
              {{ option.title }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="isAuthenticated" class="language-filter-panel__actions">
        <button
          type="button"
          class="language-filter-panel__save-button"
          :disabled="savingPreferences || !hasSavableLanguageFilters"
          @click="saveCurrentFilters"
        >
          <span v-if="savingPreferences" class="language-filter-panel__save-spinner" aria-hidden="true" />
          {{ $t("pages.languagePractice.saveSettings") }}
        </button>
        <p class="language-filter-panel__save-hint">
          {{ $t("pages.languagePractice.saveHint") }}
        </p>
      </div>

      <div
        v-if="saveError"
        class="language-feedback language-feedback--error mt-4"
        role="alert"
      >
        {{ saveError }}
      </div>

      <div
        v-else-if="saveSuccess"
        class="language-feedback language-feedback--success mt-4"
        role="status"
      >
        {{ saveSuccess }}
      </div>

      <div
        v-if="chatStartError"
        class="language-feedback language-feedback--error mt-4"
        role="alert"
      >
        {{ chatStartError }}
      </div>
    </section>

    <div v-if="isLoading" class="match-grid mt-4">
      <div
        v-for="n in 6"
        :key="`sk-${n}`"
        class="match-skeleton"
        aria-hidden="true"
      >
        <span class="match-skeleton__line match-skeleton__line--title" />
        <span class="match-skeleton__line match-skeleton__line--body" />
        <span class="match-skeleton__line match-skeleton__line--body" />
        <span class="match-skeleton__line match-skeleton__line--chip" />
        <span class="match-skeleton__button" />
      </div>
    </div>

    <div v-else-if="!hasAnyCandidates" class="language-empty mt-10">
      <i class="mdi mdi-translate-off language-empty__icon" aria-hidden="true" />
      <p class="language-empty__text">{{ $t("pages.languagePractice.empty") }}</p>
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
          <h2 class="language-section-title type-list-heading">
            {{ $t("pages.languagePractice.sections.online") }}
          </h2>
          <i
            :class="[
              'mdi',
              isSectionOpen('online') ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'language-section-header__chevron',
            ]"
            aria-hidden="true"
          />
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
          <h2 class="language-section-title type-list-heading">
            {{ $t("pages.languagePractice.sections.offline") }}
          </h2>
          <i
            :class="[
              'mdi',
              isSectionOpen('offline') ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'language-section-header__chevron',
            ]"
            aria-hidden="true"
          />
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
          <i class="mdi mdi-robot-outline language-section-icon" aria-hidden="true" />
          <h2 class="language-section-title type-list-heading">
            {{ $t("pages.languagePractice.sections.ai") }}
          </h2>
          <i
            :class="[
              'mdi',
              isSectionOpen('ai') ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'language-section-header__chevron',
            ]"
            aria-hidden="true"
          />
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

    <Teleport to="body">
      <Transition name="language-dialog-fade">
        <div
          v-if="onboardingDialogOpen"
          class="language-dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="language-dialog-backdrop"
            aria-label="Close onboarding dialog"
            @click="onboardingDialogOpen = false"
          />
          <div
            class="language-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-onboarding-title"
          >
            <div class="language-dialog-card">
              <h2 id="language-onboarding-title" class="language-dialog-card__title type-card-title">
                {{ $t("pages.languagePractice.onboardingDialog.title") }}
              </h2>
              <p class="language-dialog-card__body">
                {{ $t("pages.languagePractice.onboardingDialog.body") }}
              </p>
              <div class="language-dialog-card__actions">
                <button
                  type="button"
                  class="language-dialog-card__button language-dialog-card__button--secondary"
                  @click="onboardingDialogOpen = false"
                >
                  {{ $t("pages.languagePractice.onboardingDialog.cancel") }}
                </button>
                <button
                  type="button"
                  class="language-dialog-card__button language-dialog-card__button--primary"
                  @click="goToOnboarding"
                >
                  {{ $t("pages.languagePractice.onboardingDialog.start") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ProfileDialog
      v-model="profileDialogOpen"
      :user-id="profileDialogUserId"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useLocalePath } from "#imports";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { useLanguagePracticeProfile } from "@/composables/useLanguagePracticeProfile";
import { useLanguagePracticeSession } from "@/composables/useLanguagePracticeSession";

const { t, locale } = useI18n();
const route = useRoute();
const localPath = useLocalePath();
const auth = useAuthStore();
const onboardingDraft = useOnboardingDraftStore();
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
const defaultOpenSections = ["online", "offline", "ai"];
const openSections = ref([...defaultOpenSections]);
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
    navigateTo(
      localPath({
        path: "/chat",
        query: {
          ...(candidate?.slug ? { userslug: candidate.slug } : {}),
          ...(candidate?.user_id ? { userId: candidate.user_id } : {}),
          mode: "language",
        },
      })
    );
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
  openSections.value = [...defaultOpenSections];
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

.language-practice-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0.4rem 0.8rem;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: rgb(var(--color-success, 34 197 94) / 0.12);
  color: rgb(var(--color-success, 34 197 94));
}

.language-practice-title {
  margin: 0 0 0.5rem;
  color: rgb(var(--color-foreground));
}

.language-practice-subtitle {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-filter-panel {
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 16px;
  padding: 16px;
  background: rgb(var(--color-surface));
  box-shadow: 0 10px 24px rgb(var(--color-shadow) / 0.08);
}

.language-filter-panel__title {
  margin: 0 0 0.75rem;
  color: rgb(var(--color-foreground));
}

.language-filter-panel__description {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-filter-panel__controls {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
}

.language-filter-field {
  display: grid;
  gap: 0.45rem;
}

.language-filter-field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-filter-field__control {
  width: 100%;
  min-height: 42px;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.7rem 0.9rem;
  font-size: 0.95rem;
}

.language-filter-field__control:focus {
  outline: 2px solid rgb(var(--color-primary) / 0.28);
  outline-offset: 2px;
}

.language-filter-panel__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.language-filter-panel__save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 42px;
  padding: 0.7rem 1rem;
  border: 0;
  border-radius: 12px;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.language-filter-panel__save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.language-filter-panel__save-button:not(:disabled):hover,
.language-filter-panel__save-button:not(:disabled):focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.12);
  outline: none;
}

.language-filter-panel__save-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgb(255 255 255 / 0.3);
  border-top-color: rgb(255 255 255 / 0.92);
  border-radius: 999px;
  animation: language-spin 0.8s linear infinite;
}

.language-filter-panel__save-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgb(var(--color-foreground) / 0.62);
}

.language-feedback {
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.language-feedback--error {
  border: 1px solid rgb(239 68 68 / 0.22);
  background: rgb(239 68 68 / 0.1);
  color: rgb(248 113 113);
}

.language-feedback--success {
  border: 1px solid rgb(34 197 94 / 0.22);
  background: rgb(34 197 94 / 0.1);
  color: rgb(74 222 128);
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

.language-section-title {
  margin: 0;
  color: rgb(var(--color-foreground));
}

.language-section-icon {
  font-size: 1rem;
  color: rgb(var(--color-secondary));
}

.language-section-header__chevron {
  margin-left: auto;
  font-size: 1.05rem;
}

.language-section-header:focus-visible {
  border-radius: 8px;
  outline: 2px solid rgb(var(--color-primary) / 0.8);
  outline-offset: 4px;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.match-skeleton {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  box-shadow: 0 10px 24px rgb(var(--color-shadow) / 0.08);
}

.match-skeleton__line,
.match-skeleton__button {
  display: block;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.14) 0%,
    rgba(148, 163, 184, 0.26) 50%,
    rgba(148, 163, 184, 0.14) 100%
  );
  background-size: 200% 100%;
  animation: language-skeleton-pulse 1.6s ease-in-out infinite;
}

.match-skeleton__line--title {
  width: 56%;
  height: 1.2rem;
}

.match-skeleton__line--body {
  width: 100%;
  height: 0.9rem;
}

.match-skeleton__line--chip {
  width: 44%;
  height: 1.8rem;
}

.match-skeleton__button {
  width: 100%;
  height: 2.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.dot-online {
  background: #4caf50;
}

.dot-offline {
  background: #90a4ae;
}

.language-empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
}

.language-empty__icon {
  font-size: 4rem;
  color: rgb(var(--color-foreground) / 0.28);
}

.language-empty__text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
}

.language-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.62);
}

.language-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(100% - 2rem, 480px);
  transform: translate(-50%, -50%);
}

.language-dialog-card {
  padding: 1.4rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.language-dialog-card__title {
  margin: 0;
  color: rgb(var(--color-foreground));
}

.language-dialog-card__body {
  margin: 0.8rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-dialog-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.language-dialog-card__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.65rem 0.95rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.language-dialog-card__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.language-dialog-card__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.language-dialog-card__button:hover,
.language-dialog-card__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.language-dialog-fade-enter-active,
.language-dialog-fade-leave-active {
  transition: opacity 160ms ease;
}

.language-dialog-fade-enter-from,
.language-dialog-fade-leave-to {
  opacity: 0;
}

@keyframes language-skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes language-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 959px) {
  .language-filter-panel__controls {
    grid-template-columns: 1fr;
  }

  .language-filter-panel__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .language-dialog-card__actions {
    flex-direction: column-reverse;
  }

  .language-dialog-card__button {
    width: 100%;
  }
}
</style>
