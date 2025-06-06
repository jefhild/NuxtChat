<template>
  <v-container>
    <v-row>
      <template v-if="upvotedProfiles.length > 0">
        <v-container>
          <v-row>
            <!-- Column 1: Upvoted Profiles -->
            <v-col cols="12" md="6">
              <p class="text-center font-weight-medium my-2 text-h6">{{ $t('components.upvotes.i-upvoted') }}</p>
              <div v-if="upvotedProfiles.length > 0">
                <ProfileCard
                  v-for="profile in upvotedProfiles"
                  :key="profile.profile_id"
                  :profile="profile"
                  hide-un
                  class="mb-2"
                  type="upvote"
                  icon="mdi-thumb-down"
                  @unupvote="handleUnupvote"
                />
              </div>
              <v-card v-else class="d-flex flex-column align-center">
                <v-card-title>{{ $t('components.upvotes.no-upvotes') }}</v-card-title>
              </v-card>
            </v-col>

            <!-- Column 2: Upvoters -->
            <v-col cols="12" md="6">
              <p class="text-center font-weight-medium my-2 text-h6">{{ $t('components.upvotes.upvoted-me') }}</p>
              <div v-if="upvotedMeProfiles.length > 0">
                <ProfileCard
                  v-for="profile in upvotedMeProfiles"
                  :key="profile.profile_id"
                  :profile="profile"
                  class="mb-2"
                  type="upvote"
                  icon="mdi-thumb-down"
                  @unupvote="handleUnupvote"
                />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </template>

      <v-col v-else cols="12">
        <v-card class="d-flex flex-column align-center">
          <v-card-title>{{ $t('components.upvotes.no-upvoted-me') }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
import { useUpvotes } from "@/composables/useUpvotes";

const props = defineProps<{ userId: string }>();

const { upvotedProfiles, upvotedMeProfiles, unupvoteUser } = useUpvotes(
  props.userId
);

// Method to handle unfavorite button click
const handleUnupvote = (profileId: string) => {
  console.log("handleUnupvote: ", profileId);
  unupvoteUser(profileId);
};
</script>

<style scoped></style>
