<template>
  <LoadingContainer v-if="isLoading" />

  <v-container v-else fluid class="pa-0">
    <!-- Hero Section -->
    <div class="full-bleed">
      <v-sheet class="hero w-100" height="100vh">
        <v-img
          src="/images/background.png"
          cover
          class="hero-img w-100"
          :height="'80%'"
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
                  color="primary"
                  :to="localPath('/chat')"
                  class="hero-btn"
                >
                  {{ $t("pages.home.landing_page.cta_button") }}
                </v-btn>
                <v-btn
                  color="white"
                  variant="outlined"
                  @click="$router.push(localPath('/about'))"
                  class="hero-btn"
                >
                  {{ $t("pages.home.landing_page.learn_more") }}
                </v-btn>
              </div>
            </div>
          </div>
        </v-img>
      </v-sheet>
    </div>
    <!-- CTA Section -->
    <v-container class="text-center py-8 mt-4 cta">
      <v-chip color="primary" variant="tonal" class="mb-4">
        {{ $t("pages.home.landing_page.meet_people") }}
      </v-chip>

      <div class="text-h5 font-weight-medium mb-2">
        {{ $t("pages.home.landing_page.discover_connections") }}
      </div>
      <div class="text-body-1 mt-6">
        {{ $t("pages.home.landing_page.realtime_conversations") }}
      </div>

      <v-btn
        color="primary"
        class="mr-4 mt-5"
        size="large"
        :to="localPath('/chat')"
      >
        {{ $t("pages.home.landing_page.get_chatting") }}
      </v-btn>
    </v-container>

    <!-- Article Sections -->
    <v-container class="mt-10">
      <h2 class="text-h4 text-center font-weight-bold mb-8">
        {{ $t("pages.home.landing_page.check_articles") }}
      </h2>

      <v-row dense>
        <v-col
          v-for="article in articles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
        >

          <ArticleCard :article="article" :chatThreadId="article.threadId ?? undefined"/>
        </v-col>
      </v-row>

      <div class="text-center mt-6">
        <v-btn variant="outlined" color="primary" :to="localPath('/articles')">
          {{ $t("pages.home.landing_page.see_more_articles") }}
        </v-btn>
      </div>
    </v-container>

    <v-container class="py-12 mt-8">
      <HomeRecent :limit="4" />
      <HomeAi :limit="4" />
      <HomeMale :limit="4" />
      <HomeFemale :limit="4" />
    </v-container>

    <!-- Final CTA Banner -->
    <v-container class="text-center py-16 mt-10 cta">
      <h2 class="text-h4 font-weight-bold mb-2">
        {{ $t("pages.home.landing_page.final_cta_title") }}
      </h2>
      <p class="text-body-1 mb-5">
        {{ $t("pages.home.landing_page.final_cta_description") }}
      </p>
      <v-btn color="primary" class="mr-4" size="large" :to="localPath('/chat')">
        {{ $t("pages.home.landing_page.get_chatting_now") }}
      </v-btn>
    </v-container>

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
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useLocalePath } from "#imports";
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";

const { t } = useI18n();
const router = useRouter();
const localPath = useLocalePath();
const authStore = useAuthStore();
const { getMostPopularAiProfiles, getAllPublishedArticlesWithTags } = useDb();

const isLoading = ref(true);
const logoutDialog = ref(false);
const articles = ref([]);
const mostPopularAiProfiles = ref([]);

const authStatus = computed(() => authStore.authStatus);
const userProfile = computed(() => authStore.userProfile);

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

onMounted(async () => {
  try {
    articles.value = await getAllPublishedArticlesWithTags(3);
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
  border-radius: 24px; /* more reasonable than 100px on small screens */
}

/* Utilities kept from your original styles (trimmed) */
.text-white {
  color: white !important;
}
.text-dec-none {
  text-decoration: none !important;
}
</style>
