<template>
  <v-container>
    <v-row>
      <template v-if="blockedProfiles.length > 0">
        <v-col v-for="profile in blockedProfiles" :key="profile.profile_id" cols="12" sm="6" md="4">
          <!-- <v-card hover :to="`/profiles/${profile.user_id}`"> -->
          <v-card hover>
            <v-row>
              <v-col cols="12">
                <div class="avatar-wrapper">
                  <NuxtImg :src="getProfileImage(profile.avatar_url, profile.gender_id)" height="200" width="200"
                    class="rounded-circle cover-image mx-auto d-block ma-4" />

                  <NuxtImg v-if="avatarDecorations[profile.user_id]" :src="avatarDecorations[profile.user_id]"
                    class="avatar-decoration" />
                </div>
              </v-col>
              <v-col class="text-right mr-3">
                {{ profile.country }} {{ profile.country_emoji }}
              </v-col>
            </v-row>
            <v-card-title>
              <v-row>
                <v-col cols="8">
                  <v-btn variant="plain" :to="`/profiles/${profile.user_id}`">
                    {{ profile.displayname }} ({{ profile.age }})
                  </v-btn>
                  <v-icon :color="getGenderColor(profile.gender_id)" :icon="getAvatarIcon(profile.gender_id)"></v-icon>
                </v-col>
                <v-spacer />
                <v-col>
                  <v-tooltip text="Unblock user?">
                    <template v-slot:activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-block-helper" variant="plain" color="red" size="small"
                        @click="handleUnblock(profile.user_id)"></v-btn>
                    </template>
                  </v-tooltip>
                </v-col>
              </v-row>
            </v-card-title>
            <v-card-subtitle>{{ profile.tagline }}</v-card-subtitle>
          </v-card>
        </v-col>
      </template>
      <v-col v-else cols="12">
        <v-card class="d-flex flex-column align-center">
          <v-card-title>No blocked users found</v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useBlockedProfiles } from "@/composables/useBlockedProfiles";
// import { getAvatar } from "@/utils/userUtils"; // Import the helper function
import { getAvatar } from "@/composables/useUserUtils";

const { getAvatarDecorationFromId } = useDb();
const avatarDecorations = ref<Record<string, string>>({});
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

const props = defineProps<{ userId: string }>();

const { blockedProfiles, unblockAUser } = useBlockedProfiles(props.userId);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

// Method to handle unblock button click
const handleUnblock = (userId: string) => {
  unblockAUser(userId);
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

.avatar-decoration {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 241px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}
</style>
