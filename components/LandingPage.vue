<template>
  <v-container fluid class="landing-page pa-0">
    <section class="full-bleed hero-shell">
      <v-sheet class="hero-surface" elevation="0">
        <v-img
          src="/images/background2.webp"
          cover
          class="hero-media"
          gradient="to bottom, rgba(6, 11, 23, 0.28), rgba(6, 11, 23, 0.82)"
        >
          <div class="hero-overlay">
            <div class="hero-copy">
              <h1 class="hero-title text-white">
                {{ heroCopy.title }}
              </h1>
              <p class="hero-subtitle text-white">
                {{ heroCopy.subtitle }}
              </p>
              <div class="hero-actions">
                <v-btn
                  color="primary"
                  size="x-large"
                  class="hero-btn"
                  :to="localPath('/chat')"
                >
                  {{ heroCopy.primaryCta }}
                </v-btn>
                <v-btn
                  variant="outlined"
                  color="white"
                  size="x-large"
                  class="hero-btn"
                  :to="localPath('/anonymous-chat')"
                >
                  {{ heroCopy.secondaryCta }}
                </v-btn>
                <v-btn
                  v-if="showLinkEmailCta"
                  color="amber-darken-2"
                  variant="flat"
                  size="x-large"
                  class="hero-btn"
                  @click="openLinkEmailDialog"
                >
                  {{ t("components.profile-email-link.cta") || "Link email" }}
                </v-btn>
              </div>
              <div class="hero-trust">
                <span v-for="item in heroCopy.trustPoints" :key="item">
                  {{ item }}
                </span>
              </div>
            </div>
          </div>
        </v-img>
      </v-sheet>
    </section>

    <section class="entry-section full-bleed">
      <v-sheet class="entry-surface" elevation="0">
        <v-container class="py-10 py-md-14">
          <div class="section-copy text-center">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ entryCopy.kicker }}
            </v-chip>
            <h2 class="text-h4 font-weight-bold mb-3">
              {{ entryCopy.title }}
            </h2>
            <p class="text-body-1 text-medium-emphasis entry-intro">
              {{ entryCopy.subtitle }}
            </p>
          </div>

          <v-row class="mt-6" dense>
            <v-col v-for="card in entryCards" :key="card.href" cols="12" md="6" lg="3">
              <NuxtLink :to="localPath(card.href)" class="entry-card-link">
                <v-card class="entry-card h-100" rounded="xl" elevation="0">
                  <div class="entry-card__eyebrow">
                    {{ card.eyebrow }}
                  </div>
                  <div class="text-h6 font-weight-bold mb-2">
                    {{ card.title }}
                  </div>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    {{ card.body }}
                  </p>
                  <span class="entry-card__cta">
                    {{ card.cta }}
                  </span>
                </v-card>
              </NuxtLink>
            </v-col>
          </v-row>
        </v-container>
      </v-sheet>
    </section>

    <section class="full-bleed proof-section">
      <v-sheet class="proof-surface" elevation="0">
        <v-container class="py-10 py-md-14">
          <v-row align="stretch">
            <v-col cols="12" md="7">
              <div class="section-copy">
                <v-chip color="primary" variant="tonal" class="mb-4">
                  {{ proofCopy.kicker }}
                </v-chip>
                <h2 class="text-h4 font-weight-bold mb-3">
                  {{ proofCopy.title }}
                </h2>
                <p class="text-body-1 text-medium-emphasis mb-6">
                  {{ proofCopy.subtitle }}
                </p>
              </div>

              <div class="proof-grid">
                <div v-for="point in proofCopy.points" :key="point.title" class="proof-point">
                  <div class="proof-point__title">{{ point.title }}</div>
                  <div class="proof-point__body">{{ point.body }}</div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="5">
              <v-card class="entry-flow-card h-100" rounded="xl" elevation="0">
                <div class="text-overline mb-2">{{ proofCopy.flowEyebrow }}</div>
                <div class="text-h5 font-weight-bold mb-3">{{ proofCopy.flowTitle }}</div>
                <div class="entry-flow-list">
                  <div v-for="step in proofCopy.flowSteps" :key="step.title" class="entry-flow-step">
                    <div class="entry-flow-step__number">{{ step.number }}</div>
                    <div>
                      <div class="entry-flow-step__title">{{ step.title }}</div>
                      <div class="entry-flow-step__body">{{ step.body }}</div>
                    </div>
                  </div>
                </div>
                <v-btn color="primary" size="large" block class="mt-6" :to="localPath('/chat')">
                  {{ proofCopy.flowCta }}
                </v-btn>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-sheet>
    </section>

    <section class="full-bleed mood-teaser-section">
      <v-sheet class="mood-teaser-surface" elevation="0">
        <v-container class="py-10 py-md-14">
          <div class="section-copy text-center">
            <v-chip color="primary" variant="tonal" class="mb-4">
              {{ moodCopy.kicker }}
            </v-chip>
            <h2 class="text-h4 font-weight-bold mb-3">
              {{ moodCopy.title }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mood-teaser-intro">
              {{ moodCopy.subtitle }}
            </p>
          </div>

          <div class="mood-chips">
            <v-chip
              v-for="item in moodChipsWithPresets"
              :key="item.preset?.key ?? item.label"
              size="large"
              variant="outlined"
              class="mood-chip-interactive"
              @click="onMoodChipClick(item.preset)"
            >
              {{ item.label }}
            </v-chip>
          </div>

          <div class="text-center mt-6">
            <v-btn color="primary" size="large" :to="localPath('/feeds')">
              {{ moodCopy.cta }}
            </v-btn>
          </div>
        </v-container>
      </v-sheet>
    </section>

    <v-container fluid class="mt-6">
      <HomeSeoDiscovery />
    </v-container>

    <section class="full-bleed final-cta-section mt-10">
      <v-sheet class="final-cta-surface" elevation="0">
        <v-container class="py-12 py-md-16">
          <v-row align="center" class="final-cta-grid">
            <v-col cols="12" md="5">
              <div class="final-cta-copy-wrap">
                <v-chip color="primary" variant="tonal" class="mb-4">
                  {{ finalCtaCopy.kicker }}
                </v-chip>
                <h2 class="text-h4 font-weight-bold mb-3">
                  {{ finalCtaCopy.title }}
                </h2>
                <p class="text-body-1 final-cta-copy final-cta-subtitle">
                  {{ finalCtaCopy.subtitle }}
                </p>
                <div class="hero-actions mt-6">
                  <v-btn color="primary" size="x-large" class="hero-btn" :to="localPath('/chat')">
                    {{ finalCtaCopy.primaryCta }}
                  </v-btn>
                  <v-btn variant="outlined" size="x-large" class="hero-btn" :to="localPath('/chat-without-signup')">
                    {{ finalCtaCopy.secondaryCta }}
                  </v-btn>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="7" class="d-none d-md-flex">
              <div class="final-cta-mockup">
                <div class="final-cta-mockup__frame">
                  <img
                    :src="finalCtaCopy.mockupSrc"
                    :alt="finalCtaCopy.mockupAlt"
                    class="final-cta-mockup__image"
                  >
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-sheet>
    </section>

    <v-dialog v-if="logoutDialog" v-model="logoutDialog" width="auto">
      <v-card max-width="400" prepend-icon="mdi-account-remove">
        <v-card-title>{{
          $t("pages.home.landing_page.logout_title")
        }}</v-card-title>
        <v-card-text>{{
          $t("pages.home.landing_page.logout_confirm")
        }}</v-card-text>
        <template #actions>
          <v-btn color="primary" text @click="confirmLogout">
            {{ $t("pages.home.landing_page.logout_confirm_button") }}
          </v-btn>
          <v-spacer />
          <v-btn text @click="logoutDialog = false">
            {{ $t("pages.home.landing_page.cancel") }}
          </v-btn>
        </template>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="linkEmailDialogVisible"
      v-model="linkEmailDialogVisible"
      max-width="480"
      :retain-focus="false"
    >
      <v-card>
        <v-card-title class="text-h6">
          {{ t("components.profile-email-link.dialog-title") }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            {{ t("components.profile-email-link.dialog-description") }}
          </p>

          <v-text-field
            v-model="linkEmailForm.email"
            type="email"
            :label="t('components.profile-email-link.email-label')"
            autocomplete="email"
            variant="outlined"
          />
          <v-text-field
            v-model="linkEmailForm.confirmEmail"
            type="email"
            :label="t('components.profile-email-link.confirm-label')"
            autocomplete="email"
            variant="outlined"
          />

          <v-alert v-if="linkEmailError" type="error" variant="tonal" class="mt-2">
            {{ linkEmailError }}
          </v-alert>
          <v-alert
            v-else-if="linkEmailSuccess"
            type="success"
            variant="tonal"
            class="mt-2"
          >
            {{ linkEmailSuccess }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeLinkEmailDialog">
            {{ t("components.profile-email-link.cancel") }}
          </v-btn>
          <v-btn color="primary" :loading="linkEmailSubmitting" @click="submitLinkEmail">
            {{ t("components.profile-email-link.submit") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocalePath } from "#imports";
import { useAuthStore } from "@/stores/authStore1";
import { MOOD_PRESETS } from "@/constants/moodPresets";
import { useDb } from "@/composables/useDB";

const { t, tm, rt } = useI18n();
const router = useRouter();
const localPath = useLocalePath();
const authStore = useAuthStore();
const { hasEmail, updateUserEmail } = useDb();

const logoutDialog = ref(false);
const authStatus = computed(() => authStore.authStatus);
const isAnonAuthed = computed(() => authStatus.value === "anon_authenticated");

const homePageKey = (suffix) => `pages.home.page.${suffix}`;
const resolveMessage = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return String(rt(value));
};

const translatedStringList = (suffix) => {
  const value = tm(homePageKey(suffix));
  return Array.isArray(value) ? value.map((item) => resolveMessage(item)) : [];
};
const translatedObjectList = (suffix) => {
  const value = tm(homePageKey(suffix));
  return Array.isArray(value)
    ? value.map((item) =>
        Object.fromEntries(
          Object.entries(item || {}).map(([key, entry]) => [
            key,
            resolveMessage(entry),
          ])
        )
      )
    : [];
};

const heroCopy = computed(() => ({
  title: t(homePageKey("hero.title")),
  subtitle: t(homePageKey("hero.subtitle")),
  primaryCta: isAnonAuthed.value
    ? t(homePageKey("hero.primaryCtaReturning"))
    : t(homePageKey("hero.primaryCta")),
  secondaryCta: t(homePageKey("hero.secondaryCta")),
  trustPoints: translatedStringList("hero.trustPoints"),
}));

const entryCopy = computed(() => ({
  kicker: t(homePageKey("entry.kicker")),
  title: t(homePageKey("entry.title")),
  subtitle: t(homePageKey("entry.subtitle")),
}));

const entryCards = computed(() => translatedObjectList("entry.cards"));

const proofCopy = computed(() => ({
  kicker: t(homePageKey("proof.kicker")),
  title: t(homePageKey("proof.title")),
  subtitle: t(homePageKey("proof.subtitle")),
  points: translatedObjectList("proof.points"),
  flowEyebrow: t(homePageKey("proof.flowEyebrow")),
  flowTitle: t(homePageKey("proof.flowTitle")),
  flowSteps: translatedObjectList("proof.flowSteps"),
  flowCta: t(homePageKey("proof.flowCta")),
}));

const moodCopy = computed(() => ({
  kicker: t(homePageKey("mood.kicker")),
  title: t(homePageKey("mood.title")),
  subtitle: t(homePageKey("mood.subtitle")),
  chips: translatedStringList("mood.chips"),
  cta: t(homePageKey("mood.cta")),
}));

// Zip translated chip labels with preset keys for click handling.
// Array order must match MOOD_PRESETS order (bored, cant_sleep, want_advice, light_chat).
const moodChipsWithPresets = computed(() =>
  moodCopy.value.chips.map((label, i) => ({
    label,
    preset: MOOD_PRESETS[i] ?? null,
  }))
);

function onMoodChipClick(preset) {
  if (!preset) return;
  navigateTo(localPath(`/match?preset=${preset.key}`));
}

const finalCtaCopy = computed(() => ({
  kicker: t(homePageKey("finalCta.kicker")),
  title: t(homePageKey("finalCta.title")),
  subtitle: t(homePageKey("finalCta.subtitle")),
  primaryCta: t(homePageKey("finalCta.primaryCta")),
  secondaryCta: t(homePageKey("finalCta.secondaryCta")),
  mockupSrc: "/screenshots/chatexampledesk.webp",
  mockupAlt: t(homePageKey("finalCta.mockupAlt")),
}));

const linkEmailDialogVisible = ref(false);
const linkEmailSubmitting = ref(false);
const linkEmailError = ref("");
const linkEmailSuccess = ref("");
const hasLinkedEmail = ref(true);
const linkEmailForm = reactive({
  email: "",
  confirmEmail: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const showLinkEmailCta = computed(
  () => authStatus.value === "anon_authenticated" && !hasLinkedEmail.value
);

async function confirmLogout() {
  logoutDialog.value = false;
  router.push(localPath("/logout"));
}

const resetLinkEmailForm = () => {
  const existingEmail = authStore.user?.email ?? "";
  linkEmailForm.email = existingEmail;
  linkEmailForm.confirmEmail = existingEmail;
  linkEmailError.value = "";
  linkEmailSuccess.value = "";
};

const openLinkEmailDialog = () => {
  resetLinkEmailForm();
  linkEmailDialogVisible.value = true;
};

const closeLinkEmailDialog = () => {
  linkEmailDialogVisible.value = false;
};

const refreshLinkedEmailState = async () => {
  if (authStatus.value !== "anon_authenticated") {
    hasLinkedEmail.value = true;
    return;
  }
  try {
    hasLinkedEmail.value = await hasEmail(authStore.user?.id);
  } catch (err) {
    console.warn("[LandingPage] hasEmail failed:", err);
    hasLinkedEmail.value = false;
  }
};

const submitLinkEmail = async () => {
  linkEmailError.value = "";
  linkEmailSuccess.value = "";

  const email = linkEmailForm.email.trim().toLowerCase();
  const confirm = linkEmailForm.confirmEmail.trim().toLowerCase();

  if (!emailPattern.test(email)) {
    linkEmailError.value = t("components.profile-email-link.invalid");
    return;
  }

  if (email !== confirm) {
    linkEmailError.value = t("components.profile-email-link.mismatch");
    return;
  }

  linkEmailSubmitting.value = true;
  try {
    const { error } = await updateUserEmail(email);
    if (error) throw error;
    linkEmailSuccess.value = t("components.profile-email-link.success");
    await authStore.checkAuth();
    await refreshLinkedEmailState();
    linkEmailDialogVisible.value = false;
  } catch (err) {
    console.error("[LandingPage] link email failed:", err);
    linkEmailError.value =
      err?.message || t("components.profile-email-link.generic-error");
  } finally {
    linkEmailSubmitting.value = false;
  }
};

watch(
  () => authStatus.value,
  (status) => {
    if (!import.meta.client) return;
    if (status === "anon_authenticated") {
      refreshLinkedEmailState();
    } else {
      hasLinkedEmail.value = true;
      linkEmailDialogVisible.value = false;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
* {
  font-family: "Poppins", sans-serif;
}

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

.hero-surface,
.entry-surface,
.proof-surface,
.mood-teaser-surface,
.final-cta-surface {
  border-radius: 0;
}

.hero-media {
  min-height: clamp(520px, 82vh, 760px);
}

.hero-overlay {
  min-height: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
}

.hero-copy {
  width: min(92vw, 900px);
  text-align: center;
  padding-top: clamp(56px, 10vh, 110px);
}

.hero-title {
  font-size: clamp(2.5rem, 5.6vw, 4.4rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.03em;
  text-wrap: balance;
  max-width: 14ch;
  margin: 0 auto 18px;
}

.hero-subtitle {
  max-width: 52ch;
  margin: 0 auto;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  line-height: 1.55;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 28px;
}

.hero-btn {
  min-width: fit-content;
  white-space: normal;
}

.hero-trust {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  justify-content: center;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.95rem;
}

.hero-trust span::before {
  content: "•";
  margin-right: 8px;
  color: #93c5fd;
}

.entry-surface {
  background:
    radial-gradient(900px 320px at 4% 0%, rgba(14, 165, 233, 0.14), transparent 62%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.proof-surface {
  background:
    radial-gradient(720px 220px at 96% 0%, rgba(30, 64, 175, 0.08), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.mood-teaser-surface {
  background:
    radial-gradient(780px 280px at 50% 0%, rgba(34, 197, 94, 0.1), transparent 60%),
    linear-gradient(180deg, #f8fafc 0%, #edf7f3 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.final-cta-surface {
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(59, 130, 246, 0.16), transparent 60%),
    radial-gradient(640px 220px at 88% 100%, rgba(14, 165, 233, 0.1), transparent 55%),
    linear-gradient(180deg, #f8fbff 0%, #eaf3ff 100%);
  color: #0f172a;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.section-copy {
  max-width: 760px;
  margin: 0 auto;
}

.entry-intro,
.mood-teaser-intro,
.final-cta-copy {
  max-width: 56ch;
  margin-left: auto;
  margin-right: auto;
}

.final-cta-subtitle {
  color: rgba(51, 65, 85, 0.86);
}

.final-cta-copy-wrap {
  max-width: 34rem;
}

.entry-card-link {
  text-decoration: none;
  display: block;
  height: 100%;
}

.entry-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.94) 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  padding: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 12px 30px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(8px);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.entry-card:hover {
  transform: translateY(-3px);
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 20px 44px rgba(15, 23, 42, 0.1);
}

.entry-card__eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2563eb;
  margin-bottom: 10px;
}

.entry-card__cta {
  color: #1d4ed8;
  font-weight: 600;
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.proof-point {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 20px;
  padding: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 10px 26px rgba(15, 23, 42, 0.04);
}

.proof-point__title {
  font-weight: 700;
  margin-bottom: 8px;
  color: #0f172a;
}

.proof-point__body {
  color: #475569;
  line-height: 1.55;
}

.entry-flow-card {
  background:
    radial-gradient(420px 200px at 100% 0%, rgba(59, 130, 246, 0.16), transparent 60%),
    linear-gradient(180deg, #0f172a 0%, #172554 100%);
  color: #e2e8f0;
  padding: 24px;
  border: 1px solid rgba(96, 165, 250, 0.12);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24);
}

.entry-flow-list {
  display: grid;
  gap: 18px;
}

.entry-flow-step {
  display: flex;
  gap: 14px;
}

.entry-flow-step__number {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(96, 165, 250, 0.16);
  color: #bfdbfe;
  font-weight: 700;
  flex: 0 0 auto;
}

.entry-flow-step__title {
  font-weight: 700;
  margin-bottom: 4px;
}

.entry-flow-step__body {
  color: #cbd5e1;
  line-height: 1.5;
}

.mood-chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.mood-chip-interactive {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.mood-chip-interactive:hover {
  transform: translateY(-2px);
}

.final-cta-grid {
  row-gap: 28px;
}

.final-cta-surface .hero-btn {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
}

.final-cta-section {
  position: relative;
}

.final-cta-mockup {
  display: flex;
  justify-content: center;
}

.final-cta-mockup__frame {
  width: min(100%, 760px);
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.72);
  box-shadow:
    0 28px 70px rgba(2, 6, 23, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.final-cta-mockup__image {
  display: block;
  width: 100%;
  height: auto;
}

@media (max-width: 959px) {
  .hero-copy {
    padding-top: clamp(72px, 14vh, 120px);
  }

  .proof-grid {
    grid-template-columns: 1fr;
  }

  .hero-trust {
    gap: 8px 14px;
  }

  .final-cta-copy-wrap {
    max-width: none;
    text-align: center;
    margin: 0 auto;
  }

  .final-cta-copy {
    max-width: 100%;
  }

  .final-cta-copy-wrap .hero-actions {
    justify-content: center;
  }
}

:global(.v-theme--dark .entry-surface) {
  background:
    radial-gradient(900px 340px at 4% 0%, rgba(14, 165, 233, 0.16), transparent 62%),
    linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
}

:global(.v-theme--dark .proof-surface) {
  background:
    radial-gradient(720px 220px at 96% 0%, rgba(30, 64, 175, 0.12), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #111827 100%);
}

:global(.v-theme--dark .mood-teaser-surface) {
  background:
    radial-gradient(780px 280px at 50% 0%, rgba(34, 197, 94, 0.12), transparent 60%),
    linear-gradient(180deg, #111827 0%, #0f172a 100%);
}

:global(.v-theme--dark .final-cta-surface) {
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(59, 130, 246, 0.24), transparent 60%),
    radial-gradient(640px 220px at 88% 100%, rgba(14, 165, 233, 0.16), transparent 55%),
    linear-gradient(180deg, #0f172a 0%, #111827 100%);
  color: #e5eefc;
  border-top: 1px solid rgba(147, 197, 253, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(.v-theme--dark .entry-card),
:global(.v-theme--dark .proof-point) {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%);
  border-color: rgba(148, 163, 184, 0.18);
}

:global(.v-theme--dark .final-cta-mockup__frame) {
  border-color: rgba(148, 163, 184, 0.18);
}

:global(.v-theme--dark .final-cta-subtitle) {
  color: rgba(226, 232, 240, 0.9);
}

:global(.v-theme--dark .proof-point__title) {
  color: #f8fafc;
}

:global(.v-theme--dark .proof-point__body) {
  color: #cbd5e1;
}
</style>
