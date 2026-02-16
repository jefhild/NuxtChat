<template>
  <v-container fluid class="pa-0">
    <!-- Hero Section -->
    <div class="full-bleed">
      <v-sheet class="hero w-100" height="85vh">
        <v-img
          src="/images/background2.webp"
          cover
          class="hero-img w-100"
          height="100%"
          gradient="to bottom, rgba(0,0,0,.35), rgba(0,0,0,.65)"
        >
          <!-- Make *this* the flex container that fills the image area -->
          <div class="fill-height w-100 d-flex align-center justify-center">
            <!-- Constrain and center the content -->
            <div class="hero-content text-center mx-auto">
              <h1 class="text-h4 text-md-h2 font-weight-bold mb-4 text-white">
                {{ getAuthHeading }}
              </h1>
              <p class="text-body-1 text-md-subtitle-1 mb-6 text-white">
                {{ $t("pages.home.landing_page.title-text2") }}
              </p>

              <div
                class="d-flex flex-column flex-sm-row ga-2 justify-center align-center"
              >
                <v-btn
                  v-if="showPrimaryHeroCta"
                  color="primary"
                  :to="heroCtaTo"
                  class="hero-btn"
                >
                  {{ heroCtaLabel }}
                </v-btn>
                <v-btn
                  v-if="showLearnMoreCta"
                  color="white"
                  variant="outlined"
                  @click="$router.push(localPath('/about'))"
                  class="hero-btn"
                >
                  {{ $t("pages.home.landing_page.learn_more") }}
                </v-btn>
                <v-btn
                  v-if="showLinkEmailCta"
                  color="amber-darken-2"
                  variant="flat"
                  class="hero-btn"
                  @click="openLinkEmailDialog"
                >
                  {{ $t("components.profile-email-link.cta") || "Link email" }}
                </v-btn>
              </div>
            </div>
          </div>
        </v-img>
      </v-sheet>
    </div>
    <!-- CTA Section -->
    <div class="full-bleed">
      <v-sheet class="cta cta-surface" elevation="0">
        <v-container fluid class="text-center py-8 cta-content">
          <v-chip color="primary" variant="tonal" class="mb-4">
            {{ $t("pages.home.landing_page.meet_people") }}
          </v-chip>

          <div class="text-h5 font-weight-medium mb-2">
            {{ $t("pages.home.landing_page.discover_connections") }}
          </div>
          <div class="text-body-1 mt-6">
            {{ $t("pages.home.landing_page.realtime_conversations") }}
          </div>

          <i18n-t
            keypath="pages.home.landing_page.profile_links"
            tag="div"
            class="text-body-2 mt-4"
          >
            <template #male>
              <NuxtLink :to="localPath('/profiles/male')" class="cta-link">
                {{ $t("components.profile-container.gender-male") }}
              </NuxtLink>
            </template>
            <template #female>
              <NuxtLink :to="localPath('/profiles/female')" class="cta-link">
                {{ $t("components.profile-container.gender-female") }}
              </NuxtLink>
            </template>
            <template #other>
              <NuxtLink :to="localPath('/profiles/other')" class="cta-link">
                {{ $t("components.profile-container.gender-other") }}
              </NuxtLink>
            </template>
          </i18n-t>

          <v-btn
            color="primary"
            class="mr-4 mt-5"
            size="large"
            :to="localPath('/chat')"
          >
            {{ $t("pages.home.landing_page.get_chatting") }}
          </v-btn>
        </v-container>
      </v-sheet>
    </div>

    <!-- Article Sections -->
    <v-container fluid class="mt-10">
      <h2
        :class="[
          'text-h4 text-center font-weight-medium mb-8 home-articles-heading',
          { 'home-articles-heading--dark': isDarkTheme },
        ]"
        :style="{ color: isDarkTheme ? '#f8fafc' : '#0f172a' }"
      >
        {{ $t("pages.home.landing_page.check_articles") }}
      </h2>

      <template v-if="isLoading">
        <v-row>
          <v-col v-for="n in 6" :key="n" class="pa-3" cols="12" sm="6" md="4">
            <v-skeleton-loader type="image, article" />
          </v-col>
        </v-row>
      </template>

      <template v-else>
        <v-row>
          <v-col
            v-for="article in articles"
            :key="article.id"
            class="pa-3"
            cols="12"
            sm="6"
            md="4"
          >
            <ArticleCard :article="article" :chatThreadId="article.threadSlug ?? undefined"/>
          </v-col>
        </v-row>

        <div class="text-center mt-6">
          <v-btn variant="outlined" color="primary" :to="localPath('/articles')">
            {{ $t("pages.home.landing_page.see_more_articles") }}
          </v-btn>
        </div>
      </template>
    </v-container>

    <!-- Final CTA Banner -->
    <div class="full-bleed mt-10">
      <v-sheet class="final-cta w-100" elevation="0">
        <v-img
          src="/images/heromale.webp"
          cover
          class="final-cta-img w-100"
          gradient="to bottom, rgba(0,0,0,.35), rgba(0,0,0,.75)"
        >
          <div class="fill-height w-100 d-flex align-center justify-center">
            <div class="hero-content text-center mx-auto py-16">
              <h2 class="text-h4 font-weight-bold mb-2 text-white">
                {{ $t("pages.home.landing_page.final_cta_title") }}
              </h2>
              <p class="text-body-1 mb-5 text-white">
                {{ $t("pages.home.landing_page.final_cta_description") }}
              </p>
              <v-btn
                color="primary"
                class="hero-btn"
                size="large"
                :to="localPath('/chat')"
              >
                {{ $t("pages.home.landing_page.get_chatting_now") }}
              </v-btn>
            </div>
          </div>
        </v-img>
      </v-sheet>
    </div>

    <!-- Logout Dialog -->
    <v-dialog v-model="logoutDialog" width="auto">
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

    <!-- Link Email Dialog -->
    <v-dialog
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
import { ref, computed, onMounted, watch, reactive } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocalePath } from "#imports";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";

const { t } = useI18n();
const router = useRouter();
const localPath = useLocalePath();
const authStore = useAuthStore();
const theme = useTheme();
const {
  getMostPopularAiProfiles,
  getAllPublishedArticlesWithTags,
  hasEmail,
  updateUserEmail,
} = useDb();

const isLoading = ref(true);
const logoutDialog = ref(false);
const articles = ref([]);
const mostPopularAiProfiles = ref([]);

const authStatus = computed(() => authStore.authStatus);
const userProfile = computed(() => authStore.userProfile);
const isAnonAuthed = computed(() => authStatus.value === "anon_authenticated");
const isDarkTheme = computed(() => theme.global.current.value.dark);

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
const showPrimaryHeroCta = computed(() => !isAnonAuthed.value);
const showLearnMoreCta = computed(() => !isAnonAuthed.value);
const heroCtaTo = computed(() =>
  authStatus.value === "authenticated" || authStatus.value === "anon_authenticated"
    ? localPath("/chat")
    : localPath("/chat?userslug=imchatty")
);
const heroCtaLabel = computed(() =>
  authStatus.value === "authenticated" || authStatus.value === "anon_authenticated"
    ? t("pages.home.landing_page.get_chatting")
    : t("pages.home.landing_page.cta_button")
);

const getAuthHeading = computed(() => {
  switch (authStatus.value) {
    case "unauthenticated":
      return t("pages.home.landing_page.heading_unauthenticated");
    case "guest":
      return t("pages.home.landing_page.heading_guest");
    case "onboarding":
      return t("pages.home.landing_page.heading_onboarding");
    case "anon_authenticated":
      return t("pages.home.landing_page.heading_anon_authenticated");
    case "authenticated":
      return t("pages.home.landing_page.heading_authenticated");
    default:
      return t("pages.home.landing_page.title-text");
  }
});

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

onMounted(async () => {
  try {
    articles.value = await getAllPublishedArticlesWithTags(9);
    mostPopularAiProfiles.value = await getMostPopularAiProfiles(4);
  } catch (err) {
    console.error("[LandingPage] Error:", err);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
* {
  font-family: "poppins", sans-serif;
}

/* HERO */

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

.hero {
  position: relative;
  overflow: hidden;
}

.hero-img {
  /* Make sure the content uses full height of the hero */
  width: 100%;
}

.hero-content {
  max-width: 720px;
  padding: 0 16px;
}

.hero-btn {
  min-width: 160px;
  max-width: 200px;
}

/* CTA shared background */
.cta {
  background: linear-gradient(135deg, #e3f2fd, #f1f8e9);
  border-radius: 0;
}

.cta-surface {
  width: 100%;
}

.cta.v-sheet {
  /* Override Vuetify sheet inline background color in both themes. */
  background: linear-gradient(135deg, #e3f2fd, #f1f8e9) !important;
}

.cta-content {
  max-width: 1100px;
  color: #0f172a;
}

.cta-link {
  color: #1e88e5;
  font-weight: 600;
  text-decoration: none;
}

.cta-link:hover {
  text-decoration: underline;
}

:global(.v-theme--dark .cta.v-sheet) {
  background:
    radial-gradient(1000px 360px at 10% 0%, rgba(37, 99, 235, 0.2), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0f172a 100%) !important;
}

:global(.v-theme--dark .cta-content) {
  color: #e2e8f0;
}

:global(.v-theme--dark .cta-content) :deep(.v-chip) {
  border-color: rgba(148, 163, 184, 0.28);
}

:global(.v-theme--dark .cta-link) {
  color: #93c5fd;
}

.home-articles-heading {
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.home-articles-heading--dark {
  color: #f8fafc !important;
}

@media (prefers-color-scheme: dark) {
  .home-articles-heading {
    color: #f8fafc !important;
  }
}

.final-cta {
  border-radius: 0;
}

.final-cta-img {
  height: clamp(420px, 60vh, 680px);
}

/* Utilities kept from your original styles (trimmed) */
.text-white {
  color: white !important;
}
.text-dec-none {
  text-decoration: none !important;
}
</style>
