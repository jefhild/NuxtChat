<template>
  <div class="w-full px-2 sm:px-3 lg:px-4">
    <div v-if="isLoading" class="flex justify-center">
      <span class="settings-spinner my-6" aria-hidden="true" />
    </div>

    <div v-else class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <section class="settings-list-panel rounded-2xl p-4 sm:p-5">
        <p class="mb-4 text-base font-medium sm:text-lg">
          {{ $t("components.upvotes.i-upvoted") }}
        </p>

        <div v-if="upvotedProfiles.length > 0" class="space-y-2">
          <SettingsProfileCard
            v-for="profile in upvotedProfiles"
            :key="profile.profile_id"
            :profile="profile"
            type="upvote"
            icon="mdi-thumb-down"
            @unupvote="handleUnupvote"
          />
        </div>
        <div v-else class="settings-empty-card flex min-h-28 items-center justify-center px-4 text-center">
          <p>{{
            $t("components.upvotes.no-upvotes")
          }}</p>
        </div>
      </section>

      <section class="settings-list-panel rounded-2xl p-4 sm:p-5">
        <p class="mb-4 text-base font-medium sm:text-lg">
          {{ $t("components.upvotes.upvoted-me") }}
        </p>
        <div v-if="upvotedMeProfiles.length > 0" class="space-y-2">
          <SettingsProfileCard
            v-for="profile in upvotedMeProfiles"
            :key="profile.profile_id"
            :profile="profile"
            type="upvote"
            icon="mdi-thumb-down"
            @unupvote="handleUnupvote"
          />
        </div>
        <div v-else class="settings-empty-card flex min-h-28 items-center justify-center px-4 text-center">
          <p>{{
            $t("components.upvotes.no-upvoted-me")
          }}</p>
        </div>
      </section>
    </div>
  </div>
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

<style scoped>
.settings-list-panel {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.88);
}

.settings-empty-card {
  border: 1px solid rgb(var(--color-border) / 0.64);
  background: rgb(var(--color-surface));
  border-radius: 12px;
  color: rgb(var(--color-foreground) / 0.72);
}

.settings-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgb(var(--color-primary) / 0.2);
  border-right-color: rgb(var(--color-primary));
  border-radius: 999px;
  animation: settings-spin 0.7s linear infinite;
}

@keyframes settings-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
