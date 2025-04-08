<template>
  <v-container>
    <v-row>
      <template v-if="upvotedProfiles.length > 0">
        <v-container>
          <v-row>
            <!-- Column 1: Upvoted Profiles -->
            <v-col cols="12" md="6">
              <p>I Upvoted</p>
              <div v-if="upvotedProfiles.length > 0">
                <ProfileCard
                  v-for="profile in upvotedProfiles"
                  :key="profile.profile_id"
                  :profile="profile"
                  hide-unupvote
                  class="mb-2"
                />
              </div>
              <v-card v-else class="d-flex flex-column align-center">
                <v-card-title>No upvoted users found</v-card-title>
              </v-card>
            </v-col>

            <!-- Column 2: Upvoters -->
            <v-col cols="12" md="6">
              <p>Upvoted Me</p>
              <div v-if="upvotedMeProfiles.length > 0">
                <ProfileCard
                  v-for="profile in upvotedMeProfiles"
                  :key="profile.profile_id"
                  :profile="profile"
                  hide-unupvote
                  class="mb-2"
                />
              </div>
            </v-col>
          </v-row>
        </v-container>
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

const { upvotedProfiles, upvotedMeProfiles, unupvoteUser } = useUpvotes(
  props.userId
);

const getProfileImage = (avatar_url: string | null, gender_id: number) => {
  return getAvatar(avatar_url, gender_id);
};

// Method to handle unfavorite button click
const handleUnupvote = (profileId: string) => {
  unupvoteUser(profileId);
};
</script>

<style scoped></style>
