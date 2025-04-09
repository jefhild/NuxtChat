<template>
  <v-card class="pa-2 mb-2 d-flex align-center" flat hover @click="goToProfile(profile.user_id)"
    style="cursor: pointer">

    <!-- Avatar with overlaid icon and decoration-->
    <div class="avatar-wrapper mr-3">
      <NuxtImg :src="getProfileImage(profile.avatar_url, profile.gender_id)" width="50" height="50"
        class="rounded-circle cover-image" />
      <v-icon :color="getGenderColor(profile.gender_id)" :icon="getAvatarIcon(profile.gender_id)" size="17"
        class="icon-overlay" />

      <NuxtImg :src="avatarDecoration" v-if="avatarDecoration" class="avatar-decoration" />
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

    <!-- Un... Icon -->
    <v-btn v-if="hideUn" :icon="props.icon" variant="plain" color="red" size="small"
      @click.stop="handeClick(profile.user_id)" class="ml-2">
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
const router = useRouter();
const authStore = useAuthStore();
const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");
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

const goToProfile = (userId: string) => {
  router.push(`/profiles/${userId}`);
};

onMounted(async() => {
  avatarDecoration.value = await getAvatarDecorationFromId(props.profile.user_id);
});

const handeClick = (userId: string) => {
  if (props.type === "favorite") {
    // Handle favorite click
    emit('unfavorite', userId);
  } else if (props.type === "upvote") {
    // Handle upvote click
    emit('unupvote', userId)
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
