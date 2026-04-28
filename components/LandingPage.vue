<template>
  <div class="landing-page">
    <section class="full-bleed hero-shell">
      <div class="hero-surface">
        <div class="hero-media">
          <div class="hero-overlay">
            <div class="hero-copy">
              <h1 class="hero-title">
                {{ heroCopy.title }}
              </h1>
              <p class="hero-subtitle">
                {{ heroCopy.subtitle }}
              </p>
              <div class="hero-actions">
                <NuxtLink
                  :to="localPath('/chat')"
                  class="landing-button landing-button--primary landing-button--xl hero-btn"
                >
                  {{ heroCopy.primaryCta }}
                </NuxtLink>
                <NuxtLink
                  :to="localPath('/anonymous-chat')"
                  class="landing-button landing-button--hero-secondary landing-button--xl hero-btn"
                >
                  {{ heroCopy.secondaryCta }}
                </NuxtLink>
                <button
                  v-if="showLinkEmailCta"
                  type="button"
                  class="landing-button landing-button--link-email landing-button--xl hero-btn"
                  @click="openLinkEmailDialog"
                >
                  {{ t("components.profile-email-link.cta") || "Link email" }}
                </button>
              </div>
              <div class="hero-trust">
                <span v-for="item in heroCopy.trustPoints" :key="item">
                  {{ item }}
                </span>
              </div>
              <ClientOnly>
                <HomeRecentlyConnectedTicker />
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="entry-section full-bleed">
      <div class="entry-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--section">
          <div class="section-copy section-copy--center">
            <span class="landing-chip landing-chip--primary section-kicker">
              {{ entryCopy.kicker }}
            </span>
            <h2 class="section-title type-section-title">
              {{ entryCopy.title }}
            </h2>
            <p class="section-subtitle entry-intro">
              {{ entryCopy.subtitle }}
            </p>
          </div>

          <div class="entry-grid">
            <div v-for="card in entryCards" :key="card.href" class="entry-grid__item">
              <NuxtLink :to="localPath(card.href)" class="entry-card-link">
                <article class="entry-card">
                  <div class="entry-card__eyebrow">
                    {{ card.eyebrow }}
                  </div>
                  <div class="entry-card__title type-card-title">
                    {{ card.title }}
                  </div>
                  <p class="entry-card__body">
                    {{ card.body }}
                  </p>
                  <span class="entry-card__cta">
                    {{ card.cta }}
                  </span>
                </article>
              </NuxtLink>
            </div>
          </div>
          <div v-if="moreLinks.length" class="entry-more-links">
            <span class="entry-more-label">{{ entryCopy.moreLabel }}</span>
            <template v-for="(link, i) in moreLinks" :key="link.href">
              <NuxtLink :to="localPath(link.href)" class="entry-more-link">{{ link.label }}</NuxtLink>
              <span v-if="i < moreLinks.length - 1" class="entry-more-sep">·</span>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="full-bleed away-agent-section">
      <div class="away-agent-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--section">
          <div class="away-agent-layout">
            <div class="away-agent-layout__copy">
              <div class="section-copy section-copy--left">
                <span class="landing-chip landing-chip--primary section-kicker">
                  {{ awayAgentCopy.kicker }}
                </span>
                <h2 class="section-title type-section-title">
                  {{ awayAgentCopy.title }}
                </h2>
                <p class="section-subtitle section-subtitle--spaced">
                  {{ awayAgentCopy.subtitle }}
                </p>

                <div class="proof-grid proof-grid--tight">
                  <div v-for="point in awayAgentCopy.points" :key="point.title" class="proof-point">
                    <div class="proof-point__title type-card-title">{{ point.title }}</div>
                    <div class="proof-point__body">{{ point.body }}</div>
                  </div>
                </div>

                <div class="hero-actions away-agent-actions">
                  <template v-if="authStatus === 'authenticated'">
                    <NuxtLink
                      :to="localPath('/settings') + '?tab=7'"
                      class="landing-button landing-button--primary landing-button--lg hero-btn"
                    >
                      {{ awayAgentCopy.ctaSetup }}
                    </NuxtLink>
                    <NuxtLink
                      :to="localPath('/away-agent')"
                      class="landing-button landing-button--outline landing-button--lg hero-btn"
                    >
                      {{ awayAgentCopy.ctaLearn }}
                    </NuxtLink>
                  </template>
                  <template v-else-if="authStatus === 'anon_authenticated'">
                    <button
                      type="button"
                      class="landing-button landing-button--primary landing-button--lg hero-btn"
                      @click="awayAgentDialogVisible = true"
                    >
                      {{ awayAgentCopy.ctaActivate }}
                    </button>
                    <NuxtLink
                      :to="localPath('/away-agent')"
                      class="landing-button landing-button--outline landing-button--lg hero-btn"
                    >
                      {{ awayAgentCopy.ctaLearn }}
                    </NuxtLink>
                  </template>
                  <template v-else>
                    <NuxtLink
                      :to="localPath('/chat')"
                      class="landing-button landing-button--primary landing-button--lg hero-btn"
                    >
                      {{ awayAgentCopy.ctaStart }}
                    </NuxtLink>
                    <NuxtLink
                      :to="localPath('/away-agent')"
                      class="landing-button landing-button--outline landing-button--lg hero-btn"
                    >
                      {{ awayAgentCopy.ctaLearn }}
                    </NuxtLink>
                  </template>
                </div>
              </div>
            </div>

            <div class="away-agent-layout__mock">
              <div class="agent-mock">
                <div class="agent-mock__titlebar">
                  <span class="agent-mock__dot" />
                  <span class="agent-mock__dot" />
                  <span class="agent-mock__dot" />
                  <span class="agent-mock__title">Chat</span>
                </div>
                <div class="agent-mock__body">
                  <div class="agent-mock__badge">
                    <i class="mdi mdi-robot-outline agent-mock__inline-icon agent-mock__inline-icon--badge" aria-hidden="true" />
                    {{ awayAgentCopy.mock.badge }}
                  </div>

                  <div class="agent-mock__row agent-mock__row--left">
                    <div class="agent-mock__bubble agent-mock__bubble--other">
                      {{ awayAgentCopy.mock.msg1 }}
                    </div>
                  </div>

                  <div class="agent-mock__row agent-mock__row--right">
                    <div class="agent-mock__bubble agent-mock__bubble--agent">
                      <span class="agent-mock__agent-label">
                        <i class="mdi mdi-robot-outline agent-mock__inline-icon agent-mock__inline-icon--label" aria-hidden="true" />{{ awayAgentCopy.mock.agentLabel }}
                      </span>
                      {{ awayAgentCopy.mock.reply1 }}
                    </div>
                  </div>

                  <div class="agent-mock__row agent-mock__row--left">
                    <div class="agent-mock__bubble agent-mock__bubble--other">
                      {{ awayAgentCopy.mock.msg2 }}
                    </div>
                  </div>

                  <div class="agent-mock__row agent-mock__row--right">
                    <div class="agent-mock__bubble agent-mock__bubble--agent">
                      <span class="agent-mock__agent-label">
                        <i class="mdi mdi-robot-outline agent-mock__inline-icon agent-mock__inline-icon--label" aria-hidden="true" />{{ awayAgentCopy.mock.agentLabel }}
                      </span>
                      {{ awayAgentCopy.mock.reply2 }}
                    </div>
                  </div>

                  <div class="agent-mock__status">
                    <i class="mdi mdi-check-circle-outline agent-mock__status-icon" aria-hidden="true" />
                    {{ awayAgentCopy.mock.status }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="full-bleed language-practice-section">
      <div class="language-practice-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--section">
          <div class="section-copy section-copy--center">
            <span class="landing-chip landing-chip--success section-kicker">
              {{ languagePracticeCopy.kicker }}
            </span>
            <h2 class="section-title type-section-title">
              {{ languagePracticeCopy.title }}
            </h2>
            <p class="section-subtitle language-practice-intro">
              {{ languagePracticeCopy.subtitle }}
            </p>
          </div>

          <div class="language-practice-grid">
            <article v-for="card in languagePracticeCopy.cards" :key="card.title" class="language-practice-card">
              <div class="language-practice-card__icon">
                <i :class="['mdi', card.icon, 'language-practice-card__icon-glyph']" aria-hidden="true" />
              </div>
              <div class="language-practice-card__title">
                {{ card.title }}
              </div>
              <p class="language-practice-card__body">
                {{ card.body }}
              </p>
              <div v-if="card.languages" class="language-practice-card__languages">
                <NuxtLink
                  v-for="language in card.languages"
                  :key="language"
                  :to="localPath(languagePracticeLandingHref(language))"
                  class="landing-chip landing-chip--success landing-chip--link language-practice-card__language-link"
                >
                  {{ language }}
                </NuxtLink>
              </div>
            </article>
          </div>

          <div class="hero-actions language-practice-actions">
            <NuxtLink
              :to="localPath('/language-practice')"
              class="landing-button landing-button--success landing-button--lg hero-btn"
            >
              {{ languagePracticeCopy.primaryCta }}
            </NuxtLink>
            <NuxtLink
              :to="localPath('/language-exchange-chat')"
              class="landing-button landing-button--outline-success landing-button--lg hero-btn language-practice-secondary"
            >
              {{ languagePracticeCopy.secondaryCta }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="full-bleed proof-section">
      <div class="proof-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--section">
          <div class="proof-layout">
            <div class="proof-layout__copy">
              <div class="section-copy section-copy--left">
                <span class="landing-chip landing-chip--primary section-kicker">
                  {{ proofCopy.kicker }}
                </span>
                <h2 class="section-title type-section-title">
                  {{ proofCopy.title }}
                </h2>
                <p class="section-subtitle section-subtitle--spaced">
                  {{ proofCopy.subtitle }}
                </p>
              </div>

              <div class="proof-grid">
                <div v-for="point in proofCopy.points" :key="point.title" class="proof-point">
                  <div class="proof-point__title type-card-title">{{ point.title }}</div>
                  <div class="proof-point__body">{{ point.body }}</div>
                </div>
              </div>
            </div>

            <div class="proof-layout__flow">
              <article class="entry-flow-card">
                <div class="entry-flow-card__eyebrow">{{ proofCopy.flowEyebrow }}</div>
                <div class="entry-flow-card__title type-card-title">{{ proofCopy.flowTitle }}</div>
                <div class="entry-flow-list">
                  <div v-for="step in proofCopy.flowSteps" :key="step.title" class="entry-flow-step">
                    <div class="entry-flow-step__number">{{ step.number }}</div>
                    <div>
                      <div class="entry-flow-step__title">{{ step.title }}</div>
                      <div class="entry-flow-step__body">{{ step.body }}</div>
                    </div>
                  </div>
                </div>
                <NuxtLink
                  :to="localPath('/chat')"
                  class="landing-button landing-button--primary landing-button--lg landing-button--block entry-flow-card__cta"
                >
                  {{ proofCopy.flowCta }}
                </NuxtLink>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <AuthConvertAccountDialog
      v-model="awayAgentDialogVisible"
      context="away-agent"
    />

    <section class="full-bleed mood-teaser-section">
      <div class="mood-teaser-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--section">
          <div class="section-copy section-copy--center">
            <span class="landing-chip landing-chip--primary section-kicker">
              {{ moodCopy.kicker }}
            </span>
            <h2 class="section-title type-section-title">
              {{ moodCopy.title }}
            </h2>
            <p class="section-subtitle mood-teaser-intro">
              {{ moodCopy.subtitle }}
            </p>
          </div>

          <div class="mood-chips">
            <button
              v-for="item in moodChipsWithPresets"
              :key="item.preset?.key ?? item.label"
              type="button"
              class="landing-chip landing-chip--outline mood-chip-interactive"
              @click="onMoodChipClick(item.preset)"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="mood-teaser-actions">
            <NuxtLink
              :to="localPath('/feeds')"
              class="landing-button landing-button--primary landing-button--lg"
            >
              {{ moodCopy.cta }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <div class="landing-page__container landing-page__container--seo">
      <HomeSeoDiscovery />
    </div>

    <section class="full-bleed final-cta-section">
      <div class="final-cta-surface" @mousemove="updateSpotlight" @mouseleave="clearSpotlight">
        <div class="landing-page__container landing-page__container--final-cta">
          <div class="final-cta-grid">
            <div class="final-cta-grid__copy">
              <div class="final-cta-copy-wrap">
                <span class="landing-chip landing-chip--primary section-kicker">
                  {{ finalCtaCopy.kicker }}
                </span>
                <h2 class="section-title type-section-title">
                  {{ finalCtaCopy.title }}
                </h2>
                <p class="section-subtitle final-cta-copy final-cta-subtitle">
                  {{ finalCtaCopy.subtitle }}
                </p>
                <div class="hero-actions final-cta-actions">
                  <NuxtLink
                    :to="localPath('/chat')"
                    class="landing-button landing-button--primary landing-button--xl hero-btn"
                  >
                    {{ finalCtaCopy.primaryCta }}
                  </NuxtLink>
                  <NuxtLink
                    :to="localPath('/chat-without-signup')"
                    class="landing-button landing-button--outline landing-button--xl hero-btn"
                  >
                    {{ finalCtaCopy.secondaryCta }}
                  </NuxtLink>
                </div>
              </div>
            </div>

            <div class="final-cta-grid__media">
              <div class="final-cta-mockup">
                <div class="final-cta-mockup__frame">
                  <img
                    :src="finalCtaCopy.mockupSrc"
                    :alt="finalCtaCopy.mockupAlt"
                    class="final-cta-mockup__image"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="landing-dialog-fade">
        <div v-if="logoutDialog" class="landing-dialog-layer" role="presentation">
          <button
            type="button"
            class="landing-dialog-backdrop"
            aria-label="Close logout dialog"
            @click="logoutDialog = false"
          />
          <div
            class="landing-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-logout-title"
          >
            <div class="landing-dialog-card">
              <div class="landing-dialog-card__header">
                <i class="mdi mdi-account-remove landing-dialog-card__icon" aria-hidden="true" />
                <h2 id="landing-logout-title" class="landing-dialog-card__title">
                  {{ $t("pages.home.landing_page.logout_title") }}
                </h2>
              </div>
              <p class="landing-dialog-card__body">
                {{ $t("pages.home.landing_page.logout_confirm") }}
              </p>
              <div class="landing-dialog-card__actions">
                <button
                  type="button"
                  class="landing-button landing-button--primary landing-button--md"
                  @click="confirmLogout"
                >
                  {{ $t("pages.home.landing_page.logout_confirm_button") }}
                </button>
                <button
                  type="button"
                  class="landing-button landing-button--ghost landing-button--md"
                  @click="logoutDialog = false"
                >
                  {{ $t("pages.home.landing_page.cancel") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AuthConvertAccountDialog
      v-model="linkEmailDialogVisible"
      context="general"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
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
const { hasEmail } = useDb();

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
const resolveTranslatedValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => resolveMessage(item));
  }
  return resolveMessage(value);
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
            resolveTranslatedValue(entry),
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
  moreLabel: t(homePageKey("entry.moreLabel")),
}));

const entryCards = computed(() => translatedObjectList("entry.cards"));
const moreLinks = computed(() => translatedObjectList("entry.moreLinks"));

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
const hasLinkedEmail = ref(true);

const showLinkEmailCta = computed(
  () => authStatus.value === "anon_authenticated" && !hasLinkedEmail.value
);

async function confirmLogout() {
  logoutDialog.value = false;
  router.push(localPath("/logout"));
}

const openLinkEmailDialog = () => {
  linkEmailDialogVisible.value = true;
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

const awayAgentDialogVisible = ref(false);

const awayAgentCopy = computed(() => ({
  kicker: t(homePageKey("awayAgent.kicker")),
  title: t(homePageKey("awayAgent.title")),
  subtitle: t(homePageKey("awayAgent.subtitle")),
  points: translatedObjectList("awayAgent.points"),
  ctaSetup: t(homePageKey("awayAgent.ctaSetup")),
  ctaActivate: t(homePageKey("awayAgent.ctaActivate")),
  ctaStart: t(homePageKey("awayAgent.ctaStart")),
  ctaLearn: t(homePageKey("awayAgent.ctaLearn")),
  mock: {
    badge: t(homePageKey("awayAgent.mock.badge")),
    msg1: t(homePageKey("awayAgent.mock.msg1")),
    agentLabel: t(homePageKey("awayAgent.mock.agentLabel")),
    reply1: t(homePageKey("awayAgent.mock.reply1")),
    msg2: t(homePageKey("awayAgent.mock.msg2")),
    reply2: t(homePageKey("awayAgent.mock.reply2")),
    status: t(homePageKey("awayAgent.mock.status")),
  },
}));

const languagePracticeCopy = computed(() => ({
  kicker: t(homePageKey("languagePractice.kicker")),
  title: t(homePageKey("languagePractice.title")),
  subtitle: t(homePageKey("languagePractice.subtitle")),
  cards: translatedObjectList("languagePractice.cards"),
  primaryCta: t(homePageKey("languagePractice.primaryCta")),
  secondaryCta: t(homePageKey("languagePractice.secondaryCta")),
}));

const languagePracticeLandingMap = {
  english: "/practice-english-chat-online",
  anglais: "/practice-english-chat-online",
  английский: "/practice-english-chat-online",
  英语: "/practice-english-chat-online",
  chinese: "/practice-chinese-chat-online",
  chinois: "/practice-chinese-chat-online",
  китайский: "/practice-chinese-chat-online",
  中文: "/practice-chinese-chat-online",
  russian: "/practice-russian-chat-online",
  russe: "/practice-russian-chat-online",
  русский: "/practice-russian-chat-online",
  俄语: "/practice-russian-chat-online",
  french: "/practice-french-chat-online",
  français: "/practice-french-chat-online",
  французский: "/practice-french-chat-online",
  法语: "/practice-french-chat-online",
};

const languagePracticeLandingHref = (language) =>
  languagePracticeLandingMap[String(language || "").trim().toLowerCase()] ||
  "/language-practice";

const updateSpotlight = (e) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--sx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  el.style.setProperty("--sp-opacity", "1");
};

const clearSpotlight = (e) => {
  e.currentTarget.style.setProperty("--sp-opacity", "0");
};
</script>

<style scoped>
* {
  font-family: "Poppins", sans-serif;
}

.landing-page {
  width: 100%;
  padding: 0;
}

.landing-page__container {
  width: min(100%, 1200px);
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

.landing-page__container--section {
  padding-top: 40px;
  padding-bottom: 56px;
}

.landing-page__container--seo {
  margin-top: 24px;
}

.landing-page__container--final-cta {
  padding-top: 48px;
  padding-bottom: 64px;
}

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

.hero-surface,
.entry-surface,
.proof-surface,
.away-agent-surface,
.language-practice-surface,
.mood-teaser-surface,
.final-cta-surface {
  border-radius: 0;
}

.hero-media {
  min-height: clamp(520px, 82vh, 760px);
  background:
    linear-gradient(to bottom, rgba(6, 11, 23, 0.28), rgba(6, 11, 23, 0.82)),
    url("/images/background2.webp") center / cover no-repeat;
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
  margin: 0 auto 18px;
  max-width: 14ch;
  color: #fff;
  font-size: clamp(2.5rem, 5.6vw, 4.4rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.hero-subtitle {
  max-width: 52ch;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.94);
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
}

.section-copy {
  max-width: 760px;
}

.section-copy--center {
  margin: 0 auto;
  text-align: center;
}

.section-copy--left {
  margin: 0;
  text-align: left;
}

.section-kicker {
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 12px;
  color: rgb(var(--color-foreground));
}

.section-subtitle {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.74);
  font-size: 1rem;
  line-height: 1.65;
}

.section-subtitle--spaced {
  margin-bottom: 24px;
}

.entry-intro,
.mood-teaser-intro,
.language-practice-intro,
.final-cta-copy {
  max-width: 56ch;
  margin-left: auto;
  margin-right: auto;
}

.section-copy--left .section-subtitle--spaced {
  margin-left: 0;
  margin-right: 0;
}

.landing-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0.45rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.landing-chip--primary {
  color: rgb(var(--color-secondary));
  background: rgb(var(--color-secondary) / 0.12);
  border-color: rgb(var(--color-secondary) / 0.2);
}

.landing-chip--success {
  color: rgb(var(--color-success));
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.18);
}

.landing-chip--link {
  text-decoration: none;
}

.landing-chip--outline {
  border-color: rgb(var(--color-border) / 0.78);
  background: rgb(var(--color-surface) / 0.72);
  color: rgb(var(--color-foreground));
  cursor: pointer;
  font: inherit;
}

.landing-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.78rem 1.2rem;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: rgb(var(--color-foreground));
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-align: center;
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease,
    background-color 160ms ease, color 160ms ease, opacity 160ms ease;
  white-space: normal;
}

.landing-button:hover,
.landing-button:focus-visible,
.landing-chip--outline:hover,
.landing-chip--outline:focus-visible,
.entry-card-link:focus-visible .entry-card,
.entry-more-link:focus-visible,
.language-practice-card__language-link:focus-visible {
  outline: none;
  transform: translateY(-1px);
}

.landing-button:focus-visible,
.landing-chip--outline:focus-visible,
.entry-more-link:focus-visible,
.language-practice-card__language-link:focus-visible {
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.18);
}

.landing-button--primary {
  background: rgb(var(--color-primary));
  color: #fff;
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.16);
}

.landing-button--success {
  background: rgb(var(--color-success));
  color: rgb(var(--color-primary-foreground, var(--color-background, 255 255 255)));
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.16);
}

.landing-button--outline {
  border-color: rgb(var(--color-secondary) / 0.42);
  background: rgb(var(--color-surface) / 0.72);
  color: rgb(var(--color-secondary));
}

.landing-button--outline-success {
  border-color: rgb(var(--color-success) / 0.36);
  background: rgb(var(--color-surface) / 0.7);
  color: rgb(var(--color-success));
}

.landing-button--hero-secondary {
  border-color: rgb(255 255 255 / 0.68);
  background: rgb(255 255 255 / 0.04);
  color: #fff;
}

.landing-button--link-email {
  background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
  color: rgb(15 23 42);
  box-shadow: 0 12px 24px rgb(15 23 42 / 0.16);
}

.landing-button--ghost {
  border-color: rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
}

.landing-button--block {
  width: 100%;
}

.landing-button--md {
  min-height: 42px;
}

.landing-button--lg {
  min-height: 48px;
  padding-inline: 1.45rem;
}

.landing-button--xl {
  min-height: 52px;
  padding-inline: 1.65rem;
}

.away-agent-actions {
  flex-wrap: nowrap;
}

.away-agent-actions .hero-btn {
  flex: 0 1 260px;
  min-width: 0;
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
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(900px 320px at 4% 0%, rgba(14, 165, 233, 0.14), transparent 62%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.proof-surface {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(720px 220px at 96% 0%, rgba(30, 64, 175, 0.08), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.mood-teaser-surface {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(780px 280px at 50% 0%, rgba(34, 197, 94, 0.1), transparent 60%),
    linear-gradient(180deg, #f8fafc 0%, #edf7f3 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.language-practice-surface {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(760px 260px at 16% 0%, rgba(34, 197, 94, 0.15), transparent 62%),
    radial-gradient(620px 220px at 88% 100%, rgba(20, 184, 166, 0.1), transparent 56%),
    linear-gradient(180deg, #f8fafc 0%, #edf8f1 100%);
  border-bottom: 1px solid rgba(34, 197, 94, 0.12);
}

.away-agent-surface {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(900px 280px at 18% 0%, rgba(99, 102, 241, 0.12), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.final-cta-surface {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(59, 130, 246, 0.16), transparent 60%),
    radial-gradient(640px 220px at 88% 100%, rgba(14, 165, 233, 0.1), transparent 55%),
    linear-gradient(180deg, #f8fbff 0%, #eaf3ff 100%);
  color: #0f172a;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.entry-grid,
.language-practice-grid {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.away-agent-layout,
.proof-layout,
.final-cta-grid {
  display: grid;
  gap: 28px;
  align-items: center;
}

.entry-card-link {
  display: block;
  height: 100%;
  text-decoration: none;
}

.entry-more-links {
  margin-top: 20px;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.6;
}

.entry-more-label {
  margin-right: 4px;
  color: rgb(var(--color-foreground) / 0.72);
}

.entry-more-link {
  color: rgb(var(--color-secondary));
  text-decoration: none;
  font-weight: 500;
}

.entry-more-link:hover {
  text-decoration: underline;
}

.entry-more-sep {
  color: rgb(var(--color-foreground) / 0.35);
  margin: 0 6px;
}

.entry-card {
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.94) 100%);
  border: 1px solid rgb(var(--color-border) / 0.65);
  border-radius: 24px;
  padding: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 12px 30px rgb(var(--color-shadow) / 0.05);
  backdrop-filter: blur(8px);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.entry-card:hover,
.entry-card-link:focus-visible .entry-card {
  transform: translateY(-3px);
  border-color: rgb(var(--color-primary) / 0.35);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 20px 44px rgb(var(--color-shadow) / 0.1);
}

.entry-card__eyebrow {
  margin-bottom: 10px;
  color: rgb(var(--color-secondary));
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.entry-card__title,
.language-practice-card__title,
.entry-flow-card__title {
  margin-bottom: 8px;
  color: rgb(var(--color-foreground));
}

.entry-card__body,
.language-practice-card__body {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.95rem;
  line-height: 1.6;
}

.entry-card__body {
  margin-bottom: 16px;
}

.entry-card__cta {
  color: rgb(var(--color-secondary));
  font-weight: 600;
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.proof-grid--tight {
  margin-bottom: 24px;
}

.proof-point {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%);
  border: 1px solid rgb(var(--color-border) / 0.55);
  border-radius: 20px;
  padding: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 10px 26px rgb(var(--color-shadow) / 0.04);
}

.proof-point__title {
  margin-bottom: 8px;
  color: rgb(var(--color-foreground));
}

.proof-point__body {
  color: rgb(var(--color-foreground) / 0.78);
  line-height: 1.55;
}

.entry-flow-card {
  background:
    radial-gradient(420px 200px at 100% 0%, rgba(59, 130, 246, 0.16), transparent 60%),
    linear-gradient(180deg, #0f172a 0%, #172554 100%);
  color: #e2e8f0;
  padding: 24px;
  border: 1px solid rgba(96, 165, 250, 0.12);
  border-radius: 24px;
  box-shadow: 0 18px 42px rgb(var(--color-shadow) / 0.24);
}

.entry-flow-card__eyebrow {
  margin-bottom: 8px;
  color: rgba(191, 219, 254, 0.86);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.entry-flow-card__title {
  color: #fff;
  margin-bottom: 12px;
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
  margin-bottom: 4px;
  font-weight: 700;
}

.entry-flow-step__body {
  color: #cbd5e1;
  line-height: 1.5;
}

.entry-flow-card__cta {
  margin-top: 24px;
}

.mood-chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.mood-chip-interactive {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.mood-chip-interactive:hover {
  transform: translateY(-2px);
}

.mood-teaser-actions {
  margin-top: 24px;
  text-align: center;
}

.language-practice-card {
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 254, 249, 0.94) 100%);
  border: 1px solid rgb(var(--color-success) / 0.22);
  border-radius: 18px;
  padding: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 12px 30px rgb(var(--color-shadow) / 0.05);
}

.language-practice-card__icon {
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-success));
  background: rgb(var(--color-success) / 0.12);
  border: 1px solid rgb(var(--color-success) / 0.18);
}

.language-practice-card__icon-glyph {
  font-size: 20px;
}

.language-practice-card__languages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.language-practice-card__language-link {
  text-decoration: none;
}

.language-practice-actions {
  margin-top: 30px;
}

.final-cta-copy-wrap {
  max-width: 34rem;
}

.final-cta-subtitle {
  color: rgba(51, 65, 85, 0.86);
}

.final-cta-actions {
  margin-top: 24px;
}

.final-cta-surface .hero-btn {
  box-shadow: 0 12px 28px rgb(var(--color-shadow) / 0.22);
}

.final-cta-section {
  position: relative;
  margin-top: 40px;
}

.agent-mock {
  width: min(100%, 400px);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.68);
  box-shadow:
    0 24px 60px rgba(2, 6, 23, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  font-size: 13px;
}

.agent-mock__titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.agent-mock__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.25);
}

.agent-mock__title {
  margin-left: 6px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.6);
  font-weight: 500;
  letter-spacing: 0.04em;
}

.agent-mock__body {
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-mock__badge {
  display: inline-flex;
  align-items: center;
  align-self: center;
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--color-primary));
  background: rgb(var(--color-primary) / 0.12);
  border: 1px solid rgb(var(--color-primary) / 0.2);
  border-radius: 20px;
  padding: 3px 10px;
  margin-bottom: 4px;
}

.agent-mock__inline-icon {
  display: inline-block;
  line-height: 1;
}

.agent-mock__inline-icon--badge {
  margin-right: 4px;
  font-size: 14px;
}

.agent-mock__inline-icon--label {
  margin-right: 4px;
  font-size: 11px;
}

.agent-mock__row {
  display: flex;
}

.agent-mock__row--right {
  justify-content: flex-end;
}

.agent-mock__bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 14px;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.92);
}

.agent-mock__bubble--other {
  background: rgba(255, 255, 255, 0.07);
  border-bottom-left-radius: 4px;
}

.agent-mock__bubble--agent {
  background: rgb(var(--color-primary) / 0.18);
  border: 1px solid rgb(var(--color-primary) / 0.22);
  border-bottom-right-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-mock__agent-label {
  display: flex;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--color-primary));
  opacity: 0.85;
  letter-spacing: 0.03em;
}

.agent-mock__status {
  display: flex;
  align-items: center;
  align-self: flex-end;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.72);
  margin-top: 2px;
}

.agent-mock__status-icon {
  margin-right: 4px;
  font-size: 13px;
  color: rgb(var(--color-success));
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

.landing-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.landing-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.52);
}

.landing-dialog {
  position: relative;
  z-index: 1;
  width: min(400px, 94vw);
}

.landing-dialog-card {
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
  padding: 20px;
}

.landing-dialog-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.landing-dialog-card__icon {
  font-size: 1.35rem;
  color: rgb(var(--color-primary));
}

.landing-dialog-card__title {
  margin: 0;
  color: rgb(var(--color-foreground));
  font-size: 1.1rem;
  font-weight: 700;
}

.landing-dialog-card__body {
  margin: 14px 0 0;
  color: rgb(var(--color-foreground) / 0.78);
  line-height: 1.6;
}

.landing-dialog-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.landing-dialog-card__actions .landing-button--ghost {
  margin-left: auto;
}

.landing-dialog-fade-enter-active,
.landing-dialog-fade-leave-active {
  transition: opacity 180ms ease;
}

.landing-dialog-fade-enter-from,
.landing-dialog-fade-leave-to {
  opacity: 0;
}

@media (min-width: 960px) {
  .landing-page__container {
    padding-left: 32px;
    padding-right: 32px;
  }

  .landing-page__container--section {
    padding-top: 56px;
    padding-bottom: 72px;
  }

  .landing-page__container--final-cta {
    padding-top: 64px;
    padding-bottom: 88px;
  }

  .entry-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .language-practice-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .away-agent-layout {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  }

  .proof-layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  }

  .final-cta-grid {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .away-agent-layout__mock,
  .final-cta-grid__media {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

@media (min-width: 1280px) {
  .entry-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
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

  .final-cta-actions {
    justify-content: center;
  }

  .away-agent-layout__mock,
  .final-cta-grid__media {
    display: none;
  }
}

@media (max-width: 599px) {
  .away-agent-actions {
    flex-wrap: wrap;
  }

  .away-agent-actions .hero-btn,
  .landing-dialog-card__actions .landing-button {
    flex-basis: 100%;
  }

  .landing-dialog-card__actions .landing-button--ghost {
    margin-left: 0;
  }
}

:global(html.dark .entry-surface),
:global(html[data-imchatty-theme="dark"] .entry-surface) {
  background:
    radial-gradient(900px 340px at 4% 0%, rgba(14, 165, 233, 0.16), transparent 62%),
    linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
}

:global(html.dark .entry-surface::before),
:global(html[data-imchatty-theme="dark"] .entry-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(14, 165, 233, 0.1), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .proof-surface),
:global(html[data-imchatty-theme="dark"] .proof-surface) {
  background:
    radial-gradient(720px 220px at 96% 0%, rgba(30, 64, 175, 0.12), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #111827 100%);
}

:global(html.dark .proof-surface::before),
:global(html[data-imchatty-theme="dark"] .proof-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(99, 102, 241, 0.1), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .mood-teaser-surface),
:global(html[data-imchatty-theme="dark"] .mood-teaser-surface) {
  background:
    radial-gradient(780px 280px at 50% 0%, rgba(34, 197, 94, 0.12), transparent 60%),
    linear-gradient(180deg, #111827 0%, #0f172a 100%);
}

:global(html.dark .mood-teaser-surface::before),
:global(html[data-imchatty-theme="dark"] .mood-teaser-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(34, 197, 94, 0.1), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .language-practice-surface),
:global(html[data-imchatty-theme="dark"] .language-practice-surface) {
  background:
    radial-gradient(760px 260px at 16% 0%, rgba(34, 197, 94, 0.18), transparent 62%),
    radial-gradient(620px 220px at 88% 100%, rgba(20, 184, 166, 0.12), transparent 56%),
    linear-gradient(180deg, #0f172a 0%, #102018 100%);
  border-bottom: 1px solid rgba(34, 197, 94, 0.14);
}

:global(html.dark .language-practice-surface::before),
:global(html[data-imchatty-theme="dark"] .language-practice-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(34, 197, 94, 0.12), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .away-agent-surface),
:global(html[data-imchatty-theme="dark"] .away-agent-surface) {
  background:
    radial-gradient(900px 280px at 18% 0%, rgba(99, 102, 241, 0.16), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #111827 100%);
}

:global(html.dark .away-agent-surface::before),
:global(html[data-imchatty-theme="dark"] .away-agent-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(99, 102, 241, 0.12), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .final-cta-surface),
:global(html[data-imchatty-theme="dark"] .final-cta-surface) {
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(59, 130, 246, 0.24), transparent 60%),
    radial-gradient(640px 220px at 88% 100%, rgba(14, 165, 233, 0.16), transparent 55%),
    linear-gradient(180deg, #0f172a 0%, #111827 100%);
  color: #e5eefc;
  border-top: 1px solid rgba(147, 197, 253, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(html.dark .final-cta-surface::before),
:global(html[data-imchatty-theme="dark"] .final-cta-surface::before) {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(600px circle at var(--sx, -600px) var(--sy, -600px), rgba(59, 130, 246, 0.12), transparent 40%);
  opacity: var(--sp-opacity, 0);
  transition: opacity 0.5s ease;
}

:global(html.dark .entry-card),
:global(html.dark .proof-point),
:global(html.dark .language-practice-card),
:global(html[data-imchatty-theme="dark"] .entry-card),
:global(html[data-imchatty-theme="dark"] .proof-point),
:global(html[data-imchatty-theme="dark"] .language-practice-card) {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%);
  border-color: rgba(148, 163, 184, 0.18);
}

:global(html.dark .final-cta-mockup__frame),
:global(html[data-imchatty-theme="dark"] .final-cta-mockup__frame) {
  border-color: rgba(148, 163, 184, 0.18);
}

:global(html.dark .final-cta-subtitle),
:global(html[data-imchatty-theme="dark"] .final-cta-subtitle) {
  color: rgba(226, 232, 240, 0.9);
}

:global(html.dark .proof-point__title),
:global(html[data-imchatty-theme="dark"] .proof-point__title),
:global(html.dark .entry-card__title),
:global(html[data-imchatty-theme="dark"] .entry-card__title),
:global(html.dark .language-practice-card__title),
:global(html[data-imchatty-theme="dark"] .language-practice-card__title),
:global(html.dark .section-title),
:global(html[data-imchatty-theme="dark"] .section-title),
:global(html.dark .landing-dialog-card__title),
:global(html[data-imchatty-theme="dark"] .landing-dialog-card__title) {
  color: #f8fafc;
}

:global(html.dark .proof-point__body),
:global(html[data-imchatty-theme="dark"] .proof-point__body),
:global(html.dark .entry-card__body),
:global(html[data-imchatty-theme="dark"] .entry-card__body),
:global(html.dark .language-practice-card__body),
:global(html[data-imchatty-theme="dark"] .language-practice-card__body),
:global(html.dark .section-subtitle),
:global(html[data-imchatty-theme="dark"] .section-subtitle),
:global(html.dark .landing-dialog-card__body),
:global(html[data-imchatty-theme="dark"] .landing-dialog-card__body) {
  color: #cbd5e1;
}

:global(html.dark .landing-button--outline),
:global(html[data-imchatty-theme="dark"] .landing-button--outline),
:global(html.dark .landing-button--ghost),
:global(html[data-imchatty-theme="dark"] .landing-button--ghost),
:global(html.dark .landing-button--outline-success),
:global(html[data-imchatty-theme="dark"] .landing-button--outline-success),
:global(html.dark .landing-chip--outline),
:global(html[data-imchatty-theme="dark"] .landing-chip--outline) {
  background: rgb(var(--color-surface) / 0.18);
}
</style>
