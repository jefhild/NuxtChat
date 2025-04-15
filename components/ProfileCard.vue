<template>
  <v-card
    class="pa-2 mb-2 d-flex align-center"
    flat
    hover
    @click="goToProfile(profile.gender_id ,profile.displayname)"
    style="cursor: pointer"
  >
    <!-- Avatar with overlaid icon and decoration-->
    <div class="avatar-wrapper mr-3">
      <NuxtImg
        :src="getProfileImage(profile.avatar_url, profile.gender_id)"
        width="50"
        height="50"
        class="rounded-circle cover-image"
      />
      <v-icon
        :color="getGenderColor(profile.gender_id)"
        :icon="getAvatarIcon(profile.gender_id)"
        size="17"
        class="icon-overlay"
      />

      <NuxtImg
        :src="avatarDecoration"
        v-if="avatarDecoration"
        class="avatar-decoration"
      />
    </div>

    <!-- Info -->
    <div class="flex-grow-1">
      <div class="font-weight-medium text-truncate">
        <span class="text-medium-emphasis font-weight-medium">
          {{ profile.displayname }} ({{ profile.age }})
        </span>
      </div>
      <div class="text-body-2 text-truncate">
        {{ profile.country }} {{ profile.country_emoji }}
      </div>
    </div>

    <v-tooltip :text="tooltipText" location="top">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-if="hideUn"
          v-bind="tooltipProps"
          :icon="icon"
          variant="plain"
          color="red"
          size="small"
          @click.stop="handleClick()"
          class="ml-2"
        />
      </template>
    </v-tooltip>
  </v-card>
</template>

<script setup lang="ts">
const router = useRouter();
const { getGenderFromId, getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");

const tooltipText = computed(() => {
  if (props.type === "favorite") return "Remove Favorite";
  if (props.type === "upvote") return "Remove Upvote";
  return "Remove"; // default fallback
});

import {
  getAvatar,
  getGenderColor,
  getAvatarIcon,
} from "@/composables/useUserUtils";

const props = defineProps<{
  profile: any;
  hideUn?: boolean;
  icon?: string;
  type?: string;
}>();

const emit = defineEmits(["unfavorite", "unupvote"]);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

const goToProfile = async(genderid: string, displayname: string) => {
  const gender = await getGenderFromId(genderid);
  router.push(`/profiles/${gender}/${displayname}`);
};

onMounted(async () => {
  avatarDecoration.value = await getAvatarDecorationFromId(
    props.profile.user_id
  );
});

const handleClick = () => {
  if (props.type === "favorite") {
    emit("unfavorite", props.profile.user_id);
  } else if (props.type === "upvote") {
    emit("unupvote", props.profile.profile_id);
  }
};
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.avatar-wrapper {
  position: relative;
  width: 50px;
  height: 50px;
}

.avatar-decoration {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 62px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.icon-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-30%, -30%);
  background-color: white;
  border-radius: 9999px;
  padding: 2px;
  z-index: 2;
}
</style>
