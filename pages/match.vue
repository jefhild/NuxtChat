<template>
  <div class="match-page-shell mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <div class="match-header text-center mb-6">
      <div class="match-kicker">
        {{ $t("pages.match.kicker") }}
      </div>
      <h1 class="match-title">{{ $t("pages.match.title") }}</h1>
      <p class="match-subtitle">{{ $t("pages.match.subtitle") }}</p>
    </div>

    <div class="match-chips-wrap mb-6">
      <MatchMoodChipsBar :selected-key="activePreset?.key ?? null" @select="onPresetSelect" />
    </div>

    <div v-if="activePreset" class="match-alert mb-6" role="status">
      <div class="match-alert__content">
        <i class="mdi mdi-information-outline match-alert__icon" aria-hidden="true" />
        <span>
          {{ $t("pages.match.moodSet", { mood: $t(activePreset.labelKey) }) }}
          <template v-if="!isAuthenticated">
            &mdash;
            <a href="#" class="match-alert__link" @click.prevent="goSignIn">{{ $t("pages.match.signInToSave") }}</a>
          </template>
        </span>
      </div>
      <button type="button" class="match-alert__close" aria-label="Clear preset" @click="clearPreset">
        <i class="mdi mdi-close" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading || publicLoading" class="match-grid mt-4">
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

    <div
      v-else-if="!hasAnyCandidates"
      class="match-empty mt-10"
    >
      <i class="mdi mdi-account-search-outline match-empty__icon" aria-hidden="true" />
      <p class="match-empty__text">{{ $t("pages.match.empty") }}</p>
    </div>

    <template v-else>
      <section v-if="onlineCandidates.length" class="mb-8">
        <div class="mb-3 flex items-center gap-2">
          <span class="dot dot-online" />
          <h2 class="match-section-title">
            {{ $t("pages.match.sections.online") }}
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

      <section v-if="offlineCandidates.length" class="mb-8">
        <div class="mb-3 flex items-center gap-2">
          <span class="dot dot-offline" />
          <h2 class="match-section-title">
            {{ $t("pages.match.sections.offline") }}
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

      <section v-if="displayAiCandidates.length" class="mb-8">
        <div class="mb-3 flex items-center gap-2">
          <i class="mdi mdi-robot-outline match-section-icon" aria-hidden="true" />
          <h2 class="match-section-title">
            {{ $t("pages.match.sections.ai") }}
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

    <Teleport to="body">
      <Transition name="match-dialog-fade">
        <div
          v-if="onboardingDialogOpen"
          class="match-dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="match-dialog-backdrop"
            aria-label="Close onboarding dialog"
            @click="onboardingDialogOpen = false"
          />
          <div
            class="match-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-onboarding-title"
          >
            <div class="match-dialog-card">
              <h2 id="match-onboarding-title" class="match-dialog-card__title">
                {{ $t("pages.match.onboardingDialog.title") }}
              </h2>
              <p class="match-dialog-card__body">
                {{ $t("pages.match.onboardingDialog.body") }}
              </p>
              <div class="match-dialog-card__actions">
                <button
                  type="button"
                  class="match-dialog-card__button match-dialog-card__button--secondary"
                  @click="onboardingDialogOpen = false"
                >
                  {{ $t("pages.match.onboardingDialog.cancel") }}
                </button>
                <button
                  type="button"
                  class="match-dialog-card__button match-dialog-card__button--primary"
                  @click="goToOnboarding"
                >
                  {{ $t("pages.match.onboardingDialog.start") }}
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
import { useMatchCandidates, bustMatchCache } from "@/composables/useMatchCandidates";
import { getPreset } from "@/constants/moodPresets";

const { t, locale } = useI18n();
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
function buildMatchDestination() {
  const preset = activePreset.value?.key;
  return preset ? `/match?preset=${preset}` : "/match";
}

function goSignIn() {
  const dest = buildMatchDestination();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("postLoginNext", dest);
  }
  navigateTo(localPath("/signin"));
}

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
    displayAiCandidates.value.length > 0
);

// ----------------------------------------------------------
// Preset selection
// ----------------------------------------------------------
async function onPresetSelect(preset) {
  if (activePreset.value?.key === preset.key) {
    await clearPreset();
    return;
  }

  activePreset.value = preset;

  if (isAuthenticated.value) {
    await applyPresetToMoodState(preset);
    bustMatchCache();
    fetchCandidates(true);
    return;
  }

  await loadPublicPersonas(preset);
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

async function clearPreset() {
  activePreset.value = null;

  if (!isAuthenticated.value) {
    await loadPublicPersonas();
  }
}

// ----------------------------------------------------------
// Chat initiation
// ----------------------------------------------------------
function onChatRequest(_candidate) {
  if (!isAuthenticated.value) {
    onboardingDialogOpen.value = true;
    return;
  }
  navigateTo(
    localPath({
      path: "/chat",
      query: {
        ...( _candidate?.slug ? { userslug: _candidate.slug } : {}),
        ...( _candidate?.user_id ? { userId: _candidate.user_id } : {}),
      },
    })
  );
}

function goToOnboarding() {
  onboardingDialogOpen.value = false;
  // /chat handles the full anonymous onboarding flow
  navigateTo(localPath("/chat"));
}

function buildPublicMatchQuery(preset = activePreset.value) {
  const query = { locale: locale.value };
  if (!preset) return query;
  return {
    ...query,
    emotion: preset.emotion,
    intent: preset.intent,
    energy: preset.energy,
  };
}

// ----------------------------------------------------------
// Public personas (unauthenticated path)
// ----------------------------------------------------------
async function loadPublicPersonas(preset = activePreset.value) {
  publicLoading.value = true;
  try {
    const [personasRes, candidatesRes] = await Promise.all([
      $fetch("/api/match/public-personas", {
        query: buildPublicMatchQuery(preset),
      }),
      $fetch("/api/match/public-candidates", {
        query: buildPublicMatchQuery(preset),
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

// ----------------------------------------------------------
// Lifecycle
// ----------------------------------------------------------
onMounted(async () => {
  const queryPreset = getPreset(route.query.preset);
  if (queryPreset) {
    activePreset.value = queryPreset;
  }

  // Always pre-load public personas so unauthenticated visitors see content
  await loadPublicPersonas(activePreset.value);

  if (queryPreset && isAuthenticated.value) {
    await applyPresetToMoodState(queryPreset);
    bustMatchCache();
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
      await clearPreset();
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

.match-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0.4rem 0.8rem;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.match-title {
  margin: 0 0 0.5rem;
  font-size: clamp(2rem, 2vw + 1.2rem, 2.8rem);
  font-weight: 700;
  line-height: 1.15;
  color: rgb(var(--color-foreground));
}

.match-subtitle {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.match-chips-wrap {
  display: flex;
  justify-content: center;
}

.match-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgb(56 189 248 / 0.24);
  border-radius: 14px;
  background: rgb(56 189 248 / 0.12);
  color: rgb(var(--color-foreground) / 0.88);
}

.match-alert__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.match-alert__icon {
  color: rgb(56 189 248);
  font-size: 1.2rem;
  flex: 0 0 auto;
}

.match-alert__link {
  color: rgb(var(--color-primary));
  text-decoration: underline;
}

.match-alert__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.68);
  cursor: pointer;
}

.match-alert__close:hover,
.match-alert__close:focus-visible {
  background: rgb(var(--color-foreground) / 0.08);
  outline: none;
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
  animation: match-skeleton-pulse 1.6s ease-in-out infinite;
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

.match-empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
}

.match-empty__icon {
  font-size: 4rem;
  color: rgb(var(--color-foreground) / 0.28);
}

.match-empty__text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.match-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.match-section-icon {
  font-size: 1rem;
  color: rgb(var(--color-secondary));
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

.match-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
}

.match-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.62);
}

.match-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(100% - 2rem, 480px);
  transform: translate(-50%, -50%);
}

.match-dialog-card {
  padding: 1.4rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.match-dialog-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.match-dialog-card__body {
  margin: 0.8rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.match-dialog-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.match-dialog-card__button {
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

.match-dialog-card__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.match-dialog-card__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.match-dialog-card__button:hover,
.match-dialog-card__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.match-dialog-fade-enter-active,
.match-dialog-fade-leave-active {
  transition: opacity 160ms ease;
}

.match-dialog-fade-enter-from,
.match-dialog-fade-leave-to {
  opacity: 0;
}

@keyframes match-skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .match-alert {
    align-items: flex-start;
  }

  .match-alert__content {
    align-items: flex-start;
  }

  .match-dialog-card__actions {
    flex-direction: column-reverse;
  }

  .match-dialog-card__button {
    width: 100%;
  }
}
</style>
