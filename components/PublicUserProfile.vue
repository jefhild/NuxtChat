<template>
  <v-container fluid>
    <!-- {{ profile }} -->
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="mx-auto" max-width="400" v-if="profile">
          <div class="avatar-wrapper">
            <NuxtImg :src="profile.avatar_url" height="200" width="200"
              class="rounded-circle cover-image mx-auto d-block ma-9" :alt="`${profile.displayname} image`" />

            <NuxtImg :src="avatarDecoration" v-if="avatarDecoration" class="avatar-decoration"
              :alt="`${profile.displayname} image decoration`" />
          </div>

          <v-card-title>
            <v-row><v-col>
                <h1 class="text-h5">
                  {{ profile?.displayname }}, {{ profile?.age }}
                </h1>
              </v-col></v-row>
          </v-card-title>

          <v-card-subtitle>
            <v-row><v-col>{{ profile?.tagline }}</v-col><v-col class="justify-end d-flex align-center">{{
                profile?.status }}, {{ profile?.country }}
                {{ profile.country_emoji }}</v-col></v-row>
          </v-card-subtitle>

          <v-card-text>
            <!-- {{ profile }} -->
            <v-row v-if="profile?.looking_for?.length">
              <v-col class="text-h6">{{ $t('components.public-user-profile.looking-for') }}</v-col>
            </v-row>
            <v-row v-if="profile?.looking_for?.length" no-gutters>
              <v-col class="ml-2">{{ profile?.looking_for.join(", ") }}</v-col>
            </v-row>
            <v-row v-if="profile?.bio"><v-col class="text-h6">{{ $t('components.public-user-profile.about-me') }}</v-col></v-row>
            <v-row v-if="profile?.bio">
              <v-col class="bio-paragraph">{{ profile?.bio }}</v-col></v-row>
          </v-card-text>
          <v-card-actions style="
              position: relative;
              bottom: 0;
              width: 100%;
              background-color: rgba(0, 0, 0, 0.1);
            ">
            <v-btn v-if="profileSiteUrl" :href="profileSiteUrl" color="medium-emphasis" icon="mdi-link-variant"
              size="small" target="_blank" rel="noopener noreferrer"
              :aria-label="t('components.public-user-profile.visit1') + ` ${profile?.displayname}` + t('components.public-user-profile.visit2')"></v-btn>
            <v-btn v-else color="medium-emphasis" icon="mdi-link-variant-off" size="small" disabled></v-btn>
            <v-spacer></v-spacer>

            <ButtonFavorite :profile="profile" />

            <v-btn color="blue medium-emphasis" icon="mdi-cancel" size="small"></v-btn>

            <v-btn color="black medium-emphasis" icon="mdi-share-variant" size="small"></v-btn>
          </v-card-actions>
        </v-card>

        <v-container v-if="isPublic">
          <v-row class="mt-2" justify="center" v-if="isAuthenticated"><v-col cols="auto">
              <NuxtLink :to="localPath('/settings')">{{ $t('components.public-user-profile.back') }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath(`/chat?userSlug=${profile?.slug}`)">
                {{ $t('components.public-user-profile.chat') }} {{ profile?.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
          <v-row class="mt-2" justify="center" v-else>
            <v-col cols="auto">
              <NuxtLink :to="localPath('/')">{{ $t('components.public-user-profile.back-home') }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink to="#" @click.prevent="handleAILogin">
                {{ $t('components.public-user-profile.chat') }} {{ profile?.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
        </v-container>

      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="aiDialog" :max-width="750">
    <DialogAiSignUp :titleText="titleText" @closeDialog="handleDialogClose" />
  </v-dialog>
</template>

<script setup>
const localPath = useLocalePath();
import { useAuthStore } from "@/stores/authStore";
import { useUserProfile } from "@/composables/useUserProfile";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  selectedUserSlug: String,
  isPublic: {
    type: Boolean,
    default: true,
  },
});

const authStore = useAuthStore();

// Computed property to check if user is authenticated
const isAuthenticated = ref(false);
const isLoading = ref(true);
const aiDialog = ref(false);
const titleText = computed(() => t("components.dialogAiSignUp.titleText"));

const { profile, fetchUserProfileFromSlug } = useUserProfile();
await fetchUserProfileFromSlug(props.selectedUserSlug);

const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");

// Computed property for the formatted href
const profileSiteUrl = computed(() => {
  const siteUrl = profile.value?.site_url;

  // Ensure siteUrl is defined and is a string
  if (!siteUrl || typeof siteUrl !== "string") return null;

  // Ensure it's a valid URL starting with http or https
  return siteUrl.trim().startsWith("http")
    ? siteUrl
    : `https://${siteUrl.trim()}`;
});

function handleDialogClose() {
  // console.log('Dialog closed!');
  aiDialog.value = false;
}

const handleAILogin = async () => {
  // errorMessages.value = []; // Clear previous error messages

  try {
    // await authStore.checkAuthGoogle();
    aiDialog.value = true;
    // console.log("AI login clicked");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

onMounted(async () => {
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;

  avatarDecoration.value = await getAvatarDecorationFromId(
    profile.value?.user_id
  );
  // console.log("profile", profile.value);
});
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.avatar-wrapper {
  position: relative;
}

.avatar-decoration {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 245px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.subtitle-1 {
  font-size: 1.2rem;
  color: #757575;
}

.subtitle-2 {
  font-size: 1rem;
  color: #9e9e9e;
}

.bio-paragraph {
  font-size: 1rem;
  line-height: 1.25;
  color: #374151;
  /* Tailwind's gray-700 */
  font-style: italic;
  border-left: 4px solid #d1d5db;
  /* Tailwind's gray-300 */
  padding-left: 1rem;
  text-align: justify;
}
</style>
