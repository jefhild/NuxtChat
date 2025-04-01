<template>
  <v-container>
    <v-row>
      <template v-if="upvotedProfiles.length > 0">
        <v-col
          v-for="profile in upvotedProfiles"
          :key="profile.profile_id"
          cols="12"
          sm="6"
          md="4"
        >
          <!-- <v-card hover :to="`/profiles/${profile.user_id}`"> -->
          <v-card hover>
            <v-row>
              <v-col>
                <NuxtImg
                  :src="getProfileImage(profile.avatar_url, profile.gender_id)"
                  aspect-ratio="1"
                  width="100px"
                />
              </v-col>
              <v-col class="text-right mr-3">
                {{ profile.country }} {{ profile.country_emoji }}
              </v-col>
            </v-row>
            <v-card-title>
              <v-row>
                <v-col>
                  <v-btn variant="plain" :to="`/profiles/${profile.user_id}`">
                    {{ profile.displayname }} ({{ profile.age }})
                  </v-btn>
                  <v-icon
                    :color="getGenderColor(profile.gender_id)"
                    :icon="getAvatarIcon(profile.gender_id)"
                  ></v-icon>
                </v-col>
                <v-spacer />
                <v-col>
                  <v-tooltip text="Remove User from Upvotes?">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-block-helper"
                        variant="plain"
                        color="red"
                        size="small"
                        @click="handleUnupvote(profile.profile_id)"
                      ></v-btn>
                    </template>
                  </v-tooltip>
                </v-col>
              </v-row>
            </v-card-title>
            <!-- <v-card-subtitle>{{ profile.tagline }}</v-card-subtitle> -->
          </v-card>
        </v-col>
      </template>
      <v-col v-else cols="12">
        <v-card class="d-flex flex-column align-center">
          <v-card-title>No upvoted users found</v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useUpvotes } from "@/composables/useUpvotes";
// import { getAvatar } from "@/utils/userUtils";
import { getAvatar } from "@/composables/useUserUtils";

const props = defineProps<{ userId: string }>();

const { upvotedProfiles, unupvoteUser } = useUpvotes(props.userId);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

// Method to handle unfavorite button click
const handleUnupvote = (profileId: string) => {
  unupvoteUser(profileId);
};
</script>

<style scoped></style>
