<template>
  <v-container>
    <v-row v-if="isLoading" justify="center">
      <v-progress-circular indeterminate color="primary" class="ma-6" />
    </v-row>

    <v-row v-else>
      <v-container>
        <v-row>
          <!-- Column 1: Upvoted Profiles -->
          <v-col cols="12" md="6">
            <p class="text-center font-weight-medium my-2 text-h6">
              {{ $t("components.upvotes.i-upvoted") }}
            </p>

            <div v-if="upvotedProfiles.length > 0">
              <SettingsProfileCard
                v-for="profile in upvotedProfiles"
                :key="profile.profile_id"
                :profile="profile"
                class="mb-2"
                type="upvote"
                icon="mdi-thumb-down"
                @unupvote="handleUnupvote"
              />
            </div>
            <v-card v-else class="d-flex flex-column align-center">
              <v-card-title>{{
                $t("components.upvotes.no-upvotes")
              }}</v-card-title>
            </v-card>
          </v-col>
          <!-- Column 2: Upvoted Me -->
          <v-col cols="12" md="6">
            <p class="text-center font-weight-medium my-2 text-h6">
              {{ $t("components.upvotes.upvoted-me") }}
            </p>
            <div v-if="upvotedMeProfiles.length > 0">
              <SettingsProfileCard
                v-for="profile in upvotedMeProfiles"
                :key="profile.profile_id"
                :profile="profile"
                class="mb-2"
                type="upvote"
                icon="mdi-thumb-down"
                @unupvote="handleUnupvote"
              />
            </div>
            <v-card v-else class="d-flex flex-column align-center">
              <v-card-title>{{
                $t("components.upvotes.no-upvoted-me")
              }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { onMounted, ref } from "vue";
import { useUpvotes } from "@/composables/useUpvotes";

const { t } = useI18n();
const props = defineProps(["userId"]);

const isLoading = ref(true);

const {
  upvotedProfiles,
  upvotedMeProfiles,
  unupvoteUser,
  fetchUpvotes, // You’ll need to expose this from the composable
} = useUpvotes(props.userId);

const loadUpvotes = async () => {
  isLoading.value = true;
  await fetchUpvotes();
  isLoading.value = false;
};

onMounted(() => {
  loadUpvotes();
});

const handleUnupvote = async (profileId) => {
  await unupvoteUser(profileId);
  await loadUpvotes();
};
</script>

<style scoped></style>
