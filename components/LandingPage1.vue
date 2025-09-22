<template>
  <LoadingContainer v-if="isLoading" />

  <v-container v-else fluid>
    <!-- Hero Section -->
    <v-container fluid class="pa-0">
      <v-sheet
        height="100vh"
        class="d-flex align-center justify-center position-relative"
      >
        <!-- Background Image -->
        <v-img
          src="/public/images/background.png"
          cover
          height="80%"
          width="80%"
          class="position-absolute"
          style="z-index: 1"
        />

        <!-- Overlay Mask -->
        <div
          class="position-absolute"
          style="background-color: rgba(0, 0, 0, 0.6); z-index: 2; height: 100%; width: 100%;"
        />

        <!-- Foreground Content -->
        <v-container class="text-center" style="z-index: 3" >
          <v-row justify="center">
            <v-col cols="12" md="8">
              <h1 class="text-h4 text-md-h2 font-weight-bold mb-4 text-white">
                <!-- {{ $t("pages.home.landing_page.title-text") }} -->
                  {{ getAuthHeading }}
              </h1>
              <p class="text-body-1 text-md-subtitle-1 mb-6 text-white">
                {{ $t("pages.home.landing_page.title-text2") }}
              </p>

              <v-row justify="center" align="center" class="mx-0" dense>
                <v-col cols="12" sm="auto" class="mb-2 mb-sm-0">
                  <!-- <v-btn color="primary" block @click="handleClick"> -->
                     <v-btn color="primary" block :to="localPath('/chat')">
                    {{ $t("pages.home.landing_page.cta_button") }}
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn
                    color="white"
                    variant="outlined"
                    block
                    @click="$router.push(localPath('/about'))"
                  >
                    {{ $t("pages.home.landing_page.learn_more") }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>

      </v-sheet>
    </v-container>

    <!-- CTA Section -->
    <v-container
      class="text-center py-16 mt-8"
      style="background: linear-gradient(135deg, #e3f2fd, #f1f8e9); border-radius: 100px"
    >
      <v-chip color="primary" variant="tonal" class="mb-4">{{
        $t("pages.home.landing_page.meet_people")
      }}</v-chip>
      <div class="text-h5 font-weight-medium mb-2">
        {{ $t("pages.home.landing_page.discover_connections") }}
      </div>
      <div class="text-body-1 mt-6">
        {{ $t("pages.home.landing_page.realtime_conversations") }}
      </div>
      <v-btn color="primary" class="mr-4 mt-5" size="large" :to="localPath('/chat')">
        <!-- {{ $t("pages.home.landing_page.start_chatting") }} -->
        {{ $t("pages.home.landing_page.get_chatting") }}
      </v-btn>
    </v-container>

    <!-- AI and Article Sections -->
    <v-container class="py-12 mt-8">
      <HomeRecent :limit="4" />
    </v-container>

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
          <ArticleCard :article="article" />
        </v-col>
      </v-row>
      <div class="text-center mt-6">
        <v-btn variant="outlined" color="primary" :to="localPath('/articles')">
          {{ $t("pages.home.landing_page.see_more_articles") }}
        </v-btn>
      </div>
    </v-container>

    <v-container class="py-12 mt-8">
      <HomeAi :limit="4" />
      <HomeMale :limit="4" />
      <HomeFemale :limit="4" />
    </v-container>

    <!-- Final CTA Banner -->
    <v-container
      class="text-center py-16 mt-10"
      style="background: linear-gradient(135deg, #e3f2fd, #f1f8e9); border-radius: 100px"
    >
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
  </v-container>

  <!-- Dialogs -->
  <v-dialog v-model="aiDialog" :max-width="750">
    <DialogAiSignUp @closeDialog="handleDialogClose" :titleText="titleText" />
  </v-dialog>

  <v-dialog v-model="logoutDialog" width="auto">
    <v-card max-width="400" prepend-icon="mdi-account-remove">
      <v-card-title>{{ $t("pages.home.landing_page.logout_title") }}</v-card-title>
      <v-card-text>{{ $t("pages.home.landing_page.logout_confirm") }}</v-card-text>
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
const aiDialog = ref(false);
const logoutDialog = ref(false);
const articles = ref([]);
const mostPopularAiProfiles = ref([]);
const titleText = ref(t("components.dialogAiSignUp.titleText"));

// Derived state
const authStatus = computed(() => authStore.authStatus);
const isLoggedIn = computed(() =>
  ["authenticated", "anon_authenticated"].includes(authStatus.value)
);
const userProfile = computed(() => authStore.userProfile);
const loggedInUser = computed(() => userProfile.value?.displayname || "??");

function handleDialogClose() {
  aiDialog.value = false;
}


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

function showLogoutDialog() {
  logoutDialog.value = true;
}

onMounted(async () => {
  try {
    // console.log("[LandingPage] onMounted: checking auth...");
    // await authStore.checkAuth();
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
.position-absolute {
  position: absolute;
}
.text-dec-none {
  text-decoration: none !important;
}
.text-white {
  color: white !important;
}
.avatar-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto;
}
.cover-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.avatar-decoration {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: auto;
  pointer-events: none;
  z-index: 1;
}
</style>