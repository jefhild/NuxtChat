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
        ></v-img>

        <!-- Overlay Mask -->
        <div
          class="position-absolute"
          style="
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 2;
            height: 100%;
            width: 100%;
          "
        ></div>

        <!-- Foreground Content -->
        <v-container
          class="text-center"
          style="z-index: 3"
          v-if="!isAuthenticated"
        >
          <v-row justify="center">
            <v-col cols="12" md="8">
              <h1 class="text-h4 text-md-h2 font-weight-bold mb-4 text-white">
                {{ $t("pages.home.landing_page.title-text") }}
              </h1>
              <p class="text-body-1 text-md-subtitle-1 mb-6 text-white">
                {{ $t("pages.home.landing_page.title-text2") }}
              </p>

              <v-row justify="center" align="center" class="mx-0" dense>
                <v-col cols="12" sm="auto" class="mb-2 mb-sm-0">
                  <v-btn color="primary" block>
                    <NuxtLink
                      to="#"
                      @click.prevent="handleClick"
                      class="text-dec-none text-white"
                    >
                      {{ $t("pages.home.landing_page.cta_button") }}
                    </NuxtLink>
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

        <v-container
          class="d-flex justify-center align-center"
          style="min-height: 70vh; z-index: 3"
          v-else
        >
          <v-card
            elevation="6"
            class="pa-6 text-center"
            max-width="500"
            rounded="xl"
          >
            <div class="avatar-wrapper mb-4">
              <NuxtImg
                :src="userProfile.avatar_url"
                width="50"
                height="50"
                class="rounded-circle cover-image"
                :alt="`${userProfile.displayname} image`"
              />
              <NuxtImg
                :src="userProfile.avatar_decoration_url"
                :alt="`${userProfile.displayname} image decoration`"
                v-if="userProfile.avatar_decoration_url"
                class="avatar-decoration"
              />
            </div>

            <h2 class="mb-2 font-weight-bold">
              {{ $t("pages.home.landing_page.welcome_back") }}
            </h2>
            <h3 class="text-h5 mb-4 primary--text">{{ loggedInUser }}</h3>

            <v-divider class="mb-4" />

            <v-row justify="center" align="center" dense>
              <v-col cols="12" sm="4">
                <v-btn
                  :to="localPath('/chat')"
                  block
                  color="primary"
                  variant="flat"
                  rounded
                >
                  <v-icon left>mdi-chat</v-icon>
                  {{ $t("pages.home.landing_page.chat") }}
                </v-btn>
              </v-col>
              <v-col cols="12" sm="4">
                <v-btn
                  :to="localPath('/settings')"
                  block
                  color="secondary"
                  variant="flat"
                  rounded
                >
                  <v-icon left>mdi-cog</v-icon>
                  {{ $t("pages.home.landing_page.settings") }}
                </v-btn>
              </v-col>
              <v-col cols="12" sm="4">
                <v-btn
                  @click="showLogoutDialog"
                  block
                  color="error"
                  variant="flat"
                  rounded
                >
                  <v-icon left>mdi-logout</v-icon>
                  {{ $t("pages.home.landing_page.logout") }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card>
        </v-container>
      </v-sheet>
    </v-container>

    <!-- CTA Section -->
    <v-container
      class="text-center py-16 mt-8"
      style="
        background: linear-gradient(135deg, #e3f2fd, #f1f8e9);
        border-radius: 100px;
      "
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
      <v-btn color="primary" class="mr-4 mt-5" size="large">
        <NuxtLink
          to="#"
          @click.prevent="handleClick"
          class="text-dec-none text-white"
        >
          {{ $t("pages.home.landing_page.get_chatting") }}
        </NuxtLink>
      </v-btn>
    </v-container>

    <!-- AI Profiles Section -->
    <v-container class="py-12 mt-8">
      <HomeRecent :limit="4" />
    </v-container>

    <!-- Articles Section -->
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
        <NuxtLink :to="localPath('/articles')">
          <v-btn variant="outlined" color="primary">
            {{ $t("pages.home.landing_page.see_more_articles") }}
          </v-btn>
        </NuxtLink>
      </div>
    </v-container>

    <!-- AI Profiles Section -->
    <v-container class="py-12 mt-8">
      <!-- <HomeRecent :limit="4" @loaded="handleLoaded" /> -->
      <HomeAi :limit="4" />
      <HomeMale :limit="4" />
      <HomeFemale :limit="4" />

      <!-- <HomeRecent :limit="4" @loaded="handleLoaded" />
  <HomeMale :limit="4" @loaded="handleLoaded" />
  <HomeFemale :limit="4" @loaded="handleLoaded" />
  <HomeMostPopular :limit="8" @loaded="handleLoaded" /> -->
    </v-container>

    <!-- Final CTA Banner -->
    <v-container
      class="text-center py-16 mt-10"
      style="
        background: linear-gradient(135deg, #e3f2fd, #f1f8e9);
        border-radius: 100px;
      "
    >
      <h2 class="text-h4 font-weight-bold mb-2">
        {{ $t("pages.home.landing_page.final_cta_title") }}
      </h2>
      <p class="text-body-1 mb-5">
        {{ $t("pages.home.landing_page.final_cta_description") }}
      </p>
      <v-btn color="primary" class="mr-4" size="large">
        <NuxtLink
          to="#"
          @click.prevent="handleClick"
          class="text-dec-none text-white"
        >
          {{ $t("pages.home.landing_page.get_chatting_now") }}
        </NuxtLink>
      </v-btn>
    </v-container>
  </v-container>

  <v-dialog v-model="aiDialog" :max-width="750">
    <DialogAiSignUp @closeDialog="handleDialogClose" :titleText="titleText" />
  </v-dialog>

  <v-dialog v-model="logoutDialog" width="auto">
    <v-card max-width="400" prepend-icon="mdi-account-remove">
      <v-card-title>
        {{ $t("pages.home.landing_page.logout_title") }}
      </v-card-title>
      <v-card-text>{{
        $t("pages.home.landing_page.logout_confirm")
      }}</v-card-text>
      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout">{{
          $t("pages.home.landing_page.logout_confirm_button")
        }}</v-btn>
        <v-spacer />
        <v-btn text @click="logoutDialog = false">{{
          $t("pages.home.landing_page.cancel")
        }}</v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
// App logic
const router = useRouter();
const localPath = useLocalePath();
const authStore = useAuthStore();

const mostPopularAiProfiles = ref([]);
const articles = ref([]);
const isLoading = ref(true);
const aiDialog = ref(false);

// Reactive state
const isAuthenticated = ref(false);
const userProfile = ref(null);
const loggedInUser = ref("??");
const titleText = ref(t("components.dialogAiSignUp.titleText"));
const logoutDialog = ref(false);

const {
  getMostPopularAiProfiles,
  getAllPublishedArticlesWithTags,
  getUserProfileFromId,
} = useDb();

function handleDialogClose() {
  aiDialog.value = false;
}

const handleAILogin = async () => {
  try {
    aiDialog.value = true;
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

onMounted(async () => {
  const data = await getMostPopularAiProfiles(4);
  if (data) {
    mostPopularAiProfiles.value = data;
  }

  articles.value = await getAllPublishedArticlesWithTags(3);

  try {
    await authStore.checkAuth();

    const user = authStore.user;
    const profile = authStore.userProfile;

    if (user?.id) {
      const { data: userProfileData } = await getUserProfileFromId(user.id);
      isAuthenticated.value = !!userProfileData;
      loggedInUser.value = profile?.displayname || "??";
      userProfile.value = userProfileData;
      // console.log("User profile data:", userProfileData);

      if (!userProfileData) {
        titleText.value = t("components.dialogAiSignUp.titleText2");
        aiDialog.value = true;
      }
    } else {
      isAuthenticated.value = false;
    }
  } catch (err) {
    console.error("index.vue auth error:", err);
    isAuthenticated.value = false;
  } finally {
    isLoading.value = false;
  }
});

const handleClick = () => {
  if (isAuthenticated.value) {
    router.push(localPath("/chat"));
  } else {
    handleAILogin();
  }
};

//useless
const loadedCount = ref(0);
const handleLoaded = () => {
  loadedCount.value++;
};

// Logout
function showLogoutDialog() {
  logoutDialog.value = true;
}
async function confirmLogout() {
  logoutDialog.value = false;
  router.push(localPath("/logout"));
}
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

.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
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
