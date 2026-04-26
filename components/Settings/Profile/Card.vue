<template>
  <div
    v-if="profile"
    class="settings-profile-list-card mb-2 rounded-xl px-3 py-3"
    style="cursor: pointer"
    @click="goToProfile(profile.gender_id, profile.user_id)"
  >
    <div class="settings-profile-list-row">
      <div class="avatar-wrapper shrink-0">
        <NuxtImg
          :src="getProfileImage(profile.avatar_url, profile.gender_id)"
          width="50"
          height="50"
          class="rounded-circle cover-image"
          :alt="`${profile.displayname} image`"
        />
        <i
          :class="['mdi', getAvatarIcon(profile.gender_id), 'icon-overlay']"
          class="icon-overlay"
          :style="{ '--profile-card-gender-color': getGenderHexColor(profile.gender_id) }"
          aria-hidden="true"
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="text-medium-emphasis font-weight-medium text-truncate">
          {{ profile.displayname }} ({{ profile.age }})
        </div>
        <div class="text-body-2 text-truncate">
          {{ profile.country }} {{ profile.country_emoji }}
        </div>
      </div>

      <button
        v-if="hideUn"
        type="button"
        class="profile-card-action shrink-0"
        :title="tooltipText"
        :aria-label="tooltipText"
        @click.stop="handleClick()"
      >
        <i :class="['mdi', icon, 'profile-card-action__icon']" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const router = useRouter();
const { getGenderFromId, getUserSlugFromId } = useDb();
const localPath = useLocalePath();

const tooltipText = computed(() => {
  if (props.type === "favorite")
    return t("components.profile-card.remove-favorite");
  if (props.type === "upvote")
    return t("components.profile-card.remove-upvote");
  return t("components.profile-card.remove"); // default fallback
});

import {
  getAvatar,
  getGenderHexColor,
  getAvatarIcon,
} from "@/composables/useUserUtils";

const props = defineProps<{
  profile: any | null;
  hideUn?: boolean;
  icon?: string;
  type?: string;
}>();
if (!props.profile) {
  console.warn("ProfileCard received null profile");
}
const emit = defineEmits(["unfavorite", "unupvote"]);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

const goToProfile = async (genderid: string, user_id: string) => {
  const gender = await getGenderFromId(genderid);
  const slug = await getUserSlugFromId(user_id);
  router.push(localPath(`/profiles/${gender}/${slug}`));
};

const handleClick = () => {
  if (props.type === "favorite") {
    emit("unfavorite", props.profile.user_id);
  } else if (props.type === "upvote") {
    emit("unupvote", props.profile.profile_id);
  }
};
</script>

<style scoped>
.settings-profile-list-card {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.96);
  color: rgb(var(--color-foreground));
  transition: background-color 120ms ease, border-color 120ms ease;
}

.settings-profile-list-card:hover {
  background: rgba(148, 163, 184, 0.06);
}

.settings-profile-list-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
}

.cover-image {
  object-fit: cover;
  display: block;
}

.avatar-wrapper {
  position: relative;
  width: 50px;
  height: 50px;
  display: block;
}

.icon-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-30%, -30%);
  background-color: rgb(var(--color-surface));
  color: var(--profile-card-gender-color, #a855f7) !important;
  border-radius: 9999px;
  padding: 2px;
  z-index: 2;
  font-size: 17px;
  line-height: 1;
}

.profile-card-action {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-danger));
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.profile-card-action:hover {
  background: rgb(var(--color-danger) / 0.08);
}

.profile-card-action__icon {
  font-size: 1rem;
  line-height: 1;
}

</style>
