<template>
  <nav>
    <v-app-bar
      app
      image="/images/bkg/tiediebkg2.webp"
      alt="navbar background image"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink :to="localPath('/')">{{
          $t("components.navbar.imchatty")
        }}</NuxtLink>
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <template v-slot:append>
        <nav role="navigation" aria-label="Main Navigation">
          <!-- <v-row class="d-none d-md-flex" align="center"> -->
          <div
            v-if="navReady"
            class="d-none d-md-flex flex-column align-end"
          >
            <v-row align="center" no-gutters>
              <v-col>
                <v-menu
                  open-on-hover
                  close-on-content-click
                  :close-delay="100"
                  transition="fade-transition"
                  :offset="[0, 10]"
                >
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :to="localPath('/articles')"
                      variant="text"
                      class="text-button navItem navItem-btn mr-3 d-flex align-center"
                      append-icon="mdi-chevron-down"
                      :elevation="0"
                      :ripple="false"
                    >
                      {{ $t("components.navbar.blog") }}
                    </v-btn>
                  </template>

                  <v-card class="mega-menu-card" elevation="8">
                    <div class="mega-menu-header d-flex justify-space-between">
                      <NuxtLink :to="localPath('/articles')" class="all-link">
                        {{ $t("components.navbar.blog") }}
                      </NuxtLink>
                      <span class="text-caption text-medium-emphasis">
                        Browse by category, tag, or person
                      </span>
                    </div>
                    <v-divider />
                    <div class="mega-menu-columns">
                      <div class="mega-menu-column">
                        <div class="mega-menu-title">Categories</div>
                        <div class="mega-menu-list">
                          <NuxtLink
                            :to="localPath('/categories')"
                            class="mega-menu-item font-weight-medium"
                          >
                            All categories
                          </NuxtLink>
                          <NuxtLink
                            v-for="cat in categories"
                            :key="cat.slug || cat.id"
                            :to="
                              cat.slug
                                ? localPath(`/categories/${cat.slug}`)
                                : undefined
                            "
                            class="mega-menu-item"
                          >
                            {{ cat.name }}
                          </NuxtLink>
                          <div
                            v-if="!categories.length && navPending"
                            class="text-caption text-medium-emphasis"
                          >
                            Loading categories…
                          </div>
                        </div>
                      </div>
                      <div class="mega-menu-column">
                        <div class="mega-menu-title">Tags</div>
                        <div class="mega-menu-list">
                          <NuxtLink
                            :to="localPath('/tags')"
                            class="mega-menu-item font-weight-medium"
                          >
                            All tags
                          </NuxtLink>
                          <NuxtLink
                            v-for="tag in tags"
                            :key="tag.slug || tag.id"
                            :to="
                              tag.slug
                                ? localPath(`/tags/${tag.slug}`)
                                : undefined
                            "
                            class="mega-menu-item"
                          >
                            #{{ tag.name }}
                          </NuxtLink>
                          <div
                            v-if="!tags.length && navPending"
                            class="text-caption text-medium-emphasis"
                          >
                            Loading tags…
                          </div>
                        </div>
                      </div>
                      <div class="mega-menu-column">
                        <div class="mega-menu-title">People</div>
                        <div class="mega-menu-list">
                          <NuxtLink
                            :to="localPath('/people')"
                            class="mega-menu-item font-weight-medium"
                          >
                            All people
                          </NuxtLink>
                          <NuxtLink
                            v-for="person in people"
                            :key="person.slug || person.id"
                            :to="
                              person.slug
                                ? localPath(`/people/${person.slug}`)
                                : undefined
                            "
                            class="mega-menu-item"
                          >
                            {{ person.name }}
                          </NuxtLink>
                          <div
                            v-if="!people.length && navPending"
                            class="text-caption text-medium-emphasis"
                          >
                            Loading people…
                          </div>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </v-menu>
              </v-col>
              <!-- <v-col>
                <NuxtLink
                  :to="localPath('/about')"
                  class="v-btn text-button navItem mr-4"
                  exact
                >

                  {{ $t("components.navbar.aboutus") }}
                </NuxtLink></v-col
              > -->

              <v-col>
                <NuxtLink
                  :to="localPath('/chat/articles')"
                  class="v-btn text-button navItem mr-4"
                  exact
                >
                  <!-- <v-icon start>mdi-account-group</v-icon> -->
                  {{ $t("components.navbar.discussions") }}
                </NuxtLink></v-col
              >

              <v-col>
                <NuxtLink
                  :to="localPath('/chat')"
                  class="v-btn text-button navItem mr-4"
                  exact
                >
                  <!-- <v-icon start>mdi-monitor-account</v-icon> -->
                  {{ $t("components.navbar.chat") }}
                </NuxtLink></v-col
              >

              <!-- <v-col>
                <NuxtLink
                  :to="localPath('/profiles')"
                  class="v-btn text-button navItem mr-4"
                  exact
                >
              
                  {{ $t("components.navbar.free-chat") }}
                </NuxtLink></v-col
              > -->

              <v-col v-if="userProfile?.is_admin">
                <NuxtLink
                  :to="localPath('/admin')"
                  class="v-btn text-button navItem mr-3"
                  exact
                >
                  <!-- <v-icon start>mdi-shield-account</v-icon> -->
                  {{ $t("components.navbar.admin") }}
                </NuxtLink>
              </v-col>

              <v-col v-if="isAuthenticated">
                <NuxtLink
                  :to="localPath('/settings')"
                  class="v-btn text-button navItem mr-3"
                  exact
                >
                  <v-icon start>mdi-cog</v-icon>
                  {{ $t("components.navbar.settings") }}
                </NuxtLink>
              </v-col>

              <v-col>
                <v-btn
                  v-if="isAuthenticated"
                  @click="showLogoutDialog"
                  variant="text"
                >
                  <v-icon start>mdi-logout</v-icon>
                  {{ $t("components.navbar.logout") }}
                </v-btn>
                <v-btn
                  v-else
                  :to="localPath('/signin')"
                  variant="text"
                  class="navItem mr-4"
                >
                  <v-icon start>mdi-login</v-icon>
                  {{ $t("components.navbar.signin") }}
                </v-btn>
              </v-col>
            </v-row>

            <v-row no-gutters><LanguageSwitcher /></v-row>
          </div>

          <div
            v-else
            class="d-none d-md-flex flex-column align-end text-caption text-medium-emphasis pr-4"
          >
            Loading menu…
          </div>
        </nav>

        <!-- Mobile menu -->

        <v-row no-gutters>
          <div v-if="navReady" class="d-flex d-md-none">
            <v-menu>
              <template #activator="{ props }">
                <v-app-bar-nav-icon v-bind="props" />
              </template>

<v-list aria-label="Mobile Navigation" class="mobile-nav-list">
                <v-list-group value="articles">
                  <template #activator="{ props }">
                    <v-list-item
                      v-bind="props"
                      :to="localPath('/articles')"
                      link
                      :title="$t('components.navbar.blog')"
                    />
                  </template>
                  <v-list-group value="mobile-categories">
                    <template #activator="{ props }">
                      <v-list-item v-bind="props" title="Categories" />
                    </template>
                    <div class="mobile-sublist">
                      <v-list-item
                        :to="localPath('/categories')"
                        link
                        density="compact"
                      >
                        <v-list-item-title>All categories</v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        v-for="cat in mobileCategories"
                        :key="cat.slug || cat.id"
                        :to="
                          cat.slug
                            ? localPath(`/categories/${cat.slug}`)
                            : undefined
                        "
                        link
                        density="compact"
                      >
                        <v-list-item-title>{{ cat.name }}</v-list-item-title>
                      </v-list-item>
                    </div>
                  </v-list-group>

                    <v-list-group value="mobile-tags">
                      <template #activator="{ props }">
                        <v-list-item v-bind="props" title="Tags" />
                      </template>
                      <div class="mobile-sublist">
                        <v-list-item
                          :to="localPath('/tags')"
                          link
                          density="compact"
                        >
                          <v-list-item-title>All tags</v-list-item-title>
                        </v-list-item>
                        <v-list-item
                          v-for="tag in mobileTags"
                          :key="tag.slug || tag.id"
                          :to="
                            tag.slug ? localPath(`/tags/${tag.slug}`) : undefined
                          "
                          link
                          density="compact"
                        >
                          <v-list-item-title>#{{ tag.name }}</v-list-item-title>
                        </v-list-item>
                      </div>
                    </v-list-group>

                    <v-list-group value="mobile-people">
                      <template #activator="{ props }">
                        <v-list-item v-bind="props" title="People" />
                      </template>
                      <div class="mobile-sublist">
                        <v-list-item
                          :to="localPath('/people')"
                          link
                          density="compact"
                        >
                          <v-list-item-title>All people</v-list-item-title>
                        </v-list-item>
                        <v-list-item
                          v-for="person in mobilePeople"
                          :key="person.slug || person.id"
                          :to="
                            person.slug
                              ? localPath(`/people/${person.slug}`)
                              : undefined
                          "
                          link
                          density="compact"
                        >
                          <v-list-item-title>{{ person.name }}</v-list-item-title>
                        </v-list-item>
                      </div>
                    </v-list-group>
                </v-list-group>

                <!-- <v-list-item :to="localPath('/about')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.aboutus")
                  }}</v-list-item-title>
                </v-list-item> -->

                <v-list-item :to="localPath('/chat/articles')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.discussions")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item :to="localPath('/chat')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.chat")
                  }}</v-list-item-title>
                </v-list-item>

                <!-- <v-list-item :to="localPath('/profiles')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.free-chat")
                  }}</v-list-item-title>
                </v-list-item> -->

                <v-list-item
                  v-if="userProfile?.is_admin"
                  :to="localPath('/admin')"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.admin")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="isAuthenticated"
                  :to="localPath('/settings')"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.settings")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="isAuthenticated" @click="showLogoutDialog">
                  <v-list-item-title>{{
                    $t("components.navbar.logout")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-else
                  :to="localPath('/signin')"
                  append-icon="mdi-login"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.signin")
                  }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>

          <div
            v-else
            class="d-flex d-md-none px-4 py-2 text-caption text-medium-emphasis"
          >
            Loading menu…
          </div>
        </v-row>
      </template>
    </v-app-bar>
  </nav>

  <v-dialog v-model="logoutDialog" width="auto" :scrim="!isLoggingOut">
    <v-card
      max-width="420"
      class="logout-dialog-card"
      prepend-icon="mdi-account-remove"
    >
      <template #title>
        {{
          isLoggingOut ? $t("components.navbar.logout") : "Logout Of My Account"
        }}
      </template>

      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">
            <template v-if="!isLoggingOut">
              {{ $t("pages.home.landing_page.logout_confirm") }}
            </template>

            <template v-else>
              <div class="d-flex flex-column align-center py-3">
                <v-progress-circular indeterminate size="36" class="mb-3" />
                <div class="text-medium-emphasis">
                  {{ currentLogoutLine }}
                </div>
                <div v-if="logoutError" class="text-error mt-3">
                  {{ logoutError }}
                </div>
              </div>
            </template>
          </v-col>
        </v-row>
      </v-card-text>

      <template #actions>
        <template v-if="!isLoggingOut">
          <v-btn color="primary" text @click="confirmLogout">
            {{ $t("pages.home.landing_page.logout_confirm_button") }}
          </v-btn>
          <v-spacer />
          <v-btn class="ms-auto" @click="logoutDialog = false">
            {{ $t("pages.home.landing_page.cancel") }}
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            v-if="logoutError"
            color="primary"
            variant="text"
            @click="confirmLogout"
          >
            {{ $t("common.try_again") || "Try again" }}
          </v-btn>
          <v-spacer />
          <v-btn
            :disabled="!logoutError"
            class="ms-auto"
            @click="logoutDialog = false"
          >
            {{ $t("pages.home.landing_page.cancel") }}
          </v-btn>
        </template>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";
// import { useI18n } from "vue-i18n";

const localPath = useLocalePath();
const router = useRouter();
const { getAllCategories, getAllTags, getAllPeople } = useDb();
const authStore = useAuthStore();
const logoutDialog = ref(false);
const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const userProfile = computed(() => authStore.userProfile);

const {
  data: navFilters,
  pending: navPending,
  refresh: refreshNavFilters,
} = await useAsyncData("nav-filters", async () => {
  const [categoryData, tagData, peopleData] = await Promise.all([
    getAllCategories(),
    getAllTags(),
    getAllPeople(),
  ]);
  return {
    categories: categoryData || [],
    tags: tagData || [],
    people: peopleData || [],
  };
});

const isLoggingOut = ref(false);
const logoutError = ref("");
const logoutLines = [
  "Deleting presence…",
  "Disconnecting messages…",
  "Silencing your admirers…",
  "Packing your bags…",
  "Sweeping cookie crumbs…",
  "Politely leaving the chat…",
  "Waving goodbye 👋…",
];
const lineIdx = ref(0);
const currentLogoutLine = computed(
  () => logoutLines[lineIdx.value % logoutLines.length]
);
let rotateTimer = null;
const maxMobileItems = 50;
const cleanList = (items, skipNames = []) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = item?.slug || item?.name;
    if (!key) return false;
    const lowerName = (item.name || "").trim().toLowerCase();
    const lowerSlug = (item.slug || "").trim().toLowerCase();
    if (
      skipNames.includes(lowerName) ||
      skipNames.includes(lowerSlug) ||
      lowerName.startsWith("all ") ||
      lowerSlug.startsWith("all-")
    )
      return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const categories = computed(() => navFilters.value?.categories || []);
const tags = computed(() => navFilters.value?.tags || []);
const people = computed(() => navFilters.value?.people || []);
const cleanedCategories = computed(() =>
  cleanList(categories.value, ["all categories"])
);
const cleanedTags = computed(() => cleanList(tags.value, ["all tags"]));
const cleanedPeople = computed(() => cleanList(people.value));
const navReady = computed(() => !navPending.value && !!navFilters.value);

const mobileCategories = computed(() =>
  cleanedCategories.value.slice(0, maxMobileItems)
);
const mobileTags = computed(() => cleanedTags.value.slice(0, maxMobileItems));
const mobilePeople = computed(() => cleanedPeople.value.slice(0, maxMobileItems));

function startLogoutAnimation() {
  stopLogoutAnimation();
  lineIdx.value = 0;
  rotateTimer = setInterval(() => {
    lineIdx.value++;
  }, 800);
}
function stopLogoutAnimation() {
  if (rotateTimer) {
    clearInterval(rotateTimer);
    rotateTimer = null;
  }
}

onBeforeUnmount(stopLogoutAnimation);

const showLogoutDialog = () => {
  logoutError.value = "";
  isLoggingOut.value = false;
  logoutDialog.value = true;
};

const confirmLogout = async () => {
  logoutError.value = "";
  isLoggingOut.value = true;
  startLogoutAnimation();

  try {
    // do the real logout work
    await authStore.logout(); // your existing action

    // success → close + redirect (replace to avoid “Back” reviving old page)
    stopLogoutAnimation();
    logoutDialog.value = false;
    await router.replace(localPath("/"));
  } catch (e) {
    // show a friendly error and leave dialog open with a retry button
    logoutError.value = e?.message || "Something went wrong while logging out.";
    stopLogoutAnimation();
    isLoggingOut.value = true; // keep processing view; user can retry
  }
};

onMounted(async () => {
  // If SSR skipped or payload missing, fetch once on client.
  if (!navFilters.value && !navPending.value) {
    await refreshNavFilters();
  }
});
</script>

<style scoped>
.siteTitle {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
}

.navItem {
  color: black;
}

.navItem-btn {
  box-shadow: none !important;
  background-color: transparent !important;
}
.navItem-btn .v-btn__overlay,
.navItem-btn .v-ripple__container {
  display: none !important;
}
.navItem-btn:hover,
.navItem-btn:focus-visible,
.navItem-btn:active {
  background-color: transparent !important;
  box-shadow: none !important;
}
.flag-dropdown .v-field__input {
  padding: 0 4px;
  min-height: 32px;
  width: 40px;
  justify-content: center;
}

.flag-dropdown .v-input__control,
.flag-dropdown .v-field {
  border: none !important;
  box-shadow: none !important;
}

.language-switcher-row {
  display: flex;
  justify-content: flex-end;
}

.logout-dialog-card {
  width: 360px;
  max-width: 90vw;
}

.mobile-nav-list {
  max-height: 70vh;
  overflow-y: auto;
}

.mobile-sublist {
  max-height: 230px;
  overflow-y: auto;
  padding-left: 8px;
}

.mega-menu-card {
  min-width: 760px;
  padding: 12px 16px 16px;
  background: linear-gradient(135deg, #ffffff, #f7f7ff);
  border: 1px solid #ececf7;
}

.mega-menu-header {
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
}

.mega-menu-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 8px;
}

.mega-menu-column {
  min-width: 0;
}

.mega-menu-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #2b2b3d;
  margin-bottom: 8px;
}

.mega-menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 6px;
}

.mega-menu-item {
  display: block;
  padding: 4px 6px;
  border-radius: 8px;
  color: #2b2b3d;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.mega-menu-item:hover {
  background-color: #eef1ff;
  color: #1a1a2f;
}

.all-link {
  font-weight: 700;
  color: #1a1a2f;
  text-decoration: none;
}
</style>
