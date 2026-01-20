<template>
  <v-container fluid>
    <!-- {{ profile }} -->
    <v-row justify="center">
      <v-col cols="12" md="8">
        <ProfileCard
          :profile="profile"
          :avatar-decoration="avatarDecoration"
          :locale-override="localeOverride"
        />

        <v-row
          v-if="localeOptions.length > 1"
          class="mt-4"
          justify="center"
        >
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="localeOverride"
              variant="underlined"
              :items="localeOptions"
              item-title="label"
              item-value="code"
              :label="t('components.profile-language.default')"
              clearable
              hide-details
            />
          </v-col>
        </v-row>

        <v-container v-if="isPublic">
          <v-row class="mt-2" justify="center" v-if="isAuthenticated"
            ><v-col cols="auto">
              <NuxtLink :to="localPath('/settings')">{{
                $t("components.public-user-profile.back")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath(`/chat?userslug=${profile?.slug}`)">
                {{ $t("components.public-user-profile.chat") }}
                {{ localized.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
          <v-row class="mt-2" justify="center" v-else>
                        <v-col cols="auto">
              <NuxtLink :to="localPath('/chat')">{{
                $t("components.public-user-profile.back-home")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath('/chat')">{{
                $t("components.public-user-profile.back-chat")
              }}</NuxtLink>
            </v-col>
            <v-col cols="auto">
              <NuxtLink :to="localPath('/chat?userslug=imchatty')">
                {{ $t("components.public-user-profile.chat") }}
                {{ localized.displayname }}
              </NuxtLink>
            </v-col>
          </v-row>
        </v-container>
      </v-col>
    </v-row>
  </v-container>

</template>

<script setup>
const localPath = useLocalePath();
import { useAuthStore } from "@/stores/authStore1";
import { useUserProfile } from "@/composables/useUserProfile";
import ProfileCard from "@/components/ProfileCard.vue";
import {
  resolveProfileLocalization,
  getProfileTranslationLocales,
} from "@/composables/useProfileLocalization";

const props = defineProps({
  selectedUserSlug: String,
  selectedUserId: String,
  isPublic: {
    type: Boolean,
    default: true,
  },
});

const authStore = useAuthStore();

const { profile, fetchUserProfileFromSlug, fetchUserProfile } =
  useUserProfile();

const { t, locale } = useI18n();
const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");
const localeOverride = ref("");

const loadProfile = async () => {
  if (props.selectedUserSlug) {
    await fetchUserProfileFromSlug(props.selectedUserSlug);
    return;
  }
  if (props.selectedUserId) {
    await fetchUserProfile(props.selectedUserId);
  }
};

await loadProfile();

const localized = computed(() =>
  resolveProfileLocalization({
    profile: profile.value,
    readerLocale: locale?.value,
    overrideLocale: localeOverride.value,
  })
);

const localeOptions = computed(() => {
  const locales = getProfileTranslationLocales(profile.value);
  return locales.map((code) => ({
    code,
    label: t(`components.profile-language.options.${code}`, code.toUpperCase()),
  }));
});

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const isLoading = ref(true);

onMounted(async () => {
  await authStore.checkAuth();
  // isAuthenticated.value = ["anon_authenticated", "authenticated"].includes(
  //   authStore.authStatus
  // );
  isLoading.value = false;
});

watch(
  () => [props.selectedUserSlug, props.selectedUserId],
  () => {
    loadProfile();
  }
);

watch(
  () => profile.value?.user_id,
  async (userId) => {
    avatarDecoration.value = userId
      ? await getAvatarDecorationFromId(userId)
      : "";
  },
  { immediate: true }
);
</script>
