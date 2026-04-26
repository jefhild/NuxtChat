<template>
  <div class="w-full px-2 sm:px-3 lg:px-4">
    <div
      v-if="blockedProfiles.length > 0"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <div v-for="profile in blockedProfiles" :key="profile.profile_id">
        <div
          v-if="genderMap[profile.gender_id]"
          class="blocked-user-card rounded-xl px-3 py-3"
          @click="goToProfile(profile)"
        >
          <div class="flex items-start gap-3">
            <div class="avatar-wrapper shrink-0">
              <NuxtImg
                :src="getProfileImage(profile.avatar_url, profile.gender_id)"
                height="56"
                width="56"
                class="blocked-avatar-image cover-image rounded-circle"
                :alt="`${displayNameFor(profile)}'s image`"
              />
              <NuxtImg
                v-if="avatarDecorations[profile.user_id]"
                :src="avatarDecorations[profile.user_id]"
                class="avatar-decoration"
              />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <button
                  v-if="genderMap[profile.gender_id]"
                  class="blocked-name-btn"
                  type="button"
                  @click.stop="goToProfile(profile)"
                >
                  {{ displayNameFor(profile) }} ({{ profile.age }})
                </button>
                <i
                  class="profile-gender-icon"
                  :style="{ '--profile-gender-color': getGenderHexColor(profile.gender_id) }"
                  :class="['mdi', getAvatarIcon(profile.gender_id)]"
                  aria-hidden="true"
                />
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ profile.country }} {{ profile.country_emoji }}
              </div>
              <div v-if="taglineFor(profile)" class="mt-1 text-caption text-medium-emphasis">
                {{ taglineFor(profile) }}
              </div>
            </div>

            <div class="shrink-0">
              <button
                type="button"
                class="blocked-action-btn"
                title="Unblock user?"
                aria-label="Unblock user?"
                @click.stop="handleUnblock(profile.user_id)"
              >
                <i class="mdi mdi-block-helper" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="settings-empty-card flex min-h-28 items-center justify-center px-4 text-center">
        <p>{{ $t("components.blockedUsers.no-blocked-users") }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlockedProfiles } from "@/composables/useBlockedProfiles";
// import { getAvatar } from "@/utils/userUtils"; // Import the helper function
import { getAvatar, getAvatarIcon, getGenderHexColor } from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";
const { t, locale } = useI18n();


const { getAvatarDecorationFromId, getGenderFromId, getUserSlugFromId } = useDb();
const avatarDecorations = ref<Record<string, string>>({});
const slugByUserId = ref<Record<string, string>>({});
// interface Profile {
//   profile_id: string;
//   user_id: string;
//   displayname: string;
//   tagline: string;
//   avatar_url: string | null;
//   gender_id: number;
//   age: number;
//   country: string;
//   country_emoji: string;
// }
const localPath = useLocalePath();
const props = defineProps<{ userId: string }>();
const genderMap = ref<Record<number, string>>({});
const router = useRouter();

const { blockedProfiles, unblockAUser } = useBlockedProfiles(props.userId);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

const displayNameFor = (profile: any) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).displayname || profile?.displayname || "";

const taglineFor = (profile: any) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).tagline || profile?.tagline || "";

// Method to handle unblock button click
const handleUnblock = (userId: string) => {
  unblockAUser(userId);
};

const profilePathFor = (profile: any) => {
  const genderName = genderMap.value[profile.gender_id];
  if (!genderName) return null;
  const slug =
    profile.slug || slugByUserId.value[profile.user_id] || profile.user_id;
  if (!slug) return null;
  return localPath(`/profiles/${genderName}/${slug}`);
};

const goToProfile = (profile: any) => {
  const path = profilePathFor(profile);
  if (!path) return;
  router.push(path);
};


watch(blockedProfiles, async (newProfiles) =>
{
  console.log("New blocked profiles:", newProfiles);
  for (const profile of newProfiles)
  {
    if (!avatarDecorations.value[profile.user_id])
    {
      const url = await getAvatarDecorationFromId(profile.user_id);
      avatarDecorations.value[profile.user_id] = url;
    }

    // Gender name
    if (!genderMap.value[profile.gender_id]) {
      const genderName = await getGenderFromId(profile.gender_id);
      if (genderName) {
        genderMap.value[profile.gender_id] = genderName;
      }
    }

    if (!slugByUserId.value[profile.user_id]) {
      const slug = profile.slug || (await getUserSlugFromId(profile.user_id));
      if (slug) {
        slugByUserId.value[profile.user_id] = slug;
      }
    }
  }
}, { immediate: true });
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.avatar-wrapper {
  position: relative;
}

.blocked-user-card {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.88);
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
}

.blocked-user-card:hover {
  border-color: rgb(var(--color-primary) / 0.32);
  background: rgb(var(--color-surface));
  transform: translateY(-1px);
}

.blocked-avatar-image {
  width: 56px;
  height: 56px;
  object-fit: cover;
}

.avatar-decoration {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 72px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.blocked-name-btn {
  margin: 0;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.86);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.settings-empty-card {
  border: 1px solid rgb(var(--color-border) / 0.64);
  background: rgb(var(--color-surface));
  border-radius: 12px;
  color: rgb(var(--color-foreground) / 0.72);
}

.profile-gender-icon {
  color: var(--profile-gender-color, #a855f7);
  background: transparent;
}

.blocked-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
}

.blocked-action-btn:hover,
.blocked-action-btn:focus-visible,
.blocked-name-btn:hover,
.blocked-name-btn:focus-visible {
  outline: none;
  text-decoration: underline;
}
</style>
