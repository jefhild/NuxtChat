<template>
  <v-row class="mt-6">
    <v-col cols="12">
      <v-divider class="mb-4" />
      <v-btn
        color="error"
        variant="outlined"
        size="small"
        :loading="deleteBusy"
        :disabled="deleteBusy || !userId"
        @click="toggleDeletionMark"
      >
        {{ isMarkedForDeletion
          ? $t("components.profile-container.marked-for-deletion")
          : $t("components.profile-container.delete") }}
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";

const authStore = useAuthStore();
const { markUserForDeletion, unmarkUserForDeletion } = useDb();

const userId = computed(() => authStore.userProfile?.user_id);

const isMarkedForDeletion = computed(
  () => !!authStore.userProfile?.marked_for_deletion_at
);

const deleteBusy = ref(false);

const toggleDeletionMark = async () => {
  if (!userId.value || deleteBusy.value) return;
  deleteBusy.value = true;
  try {
    if (isMarkedForDeletion.value) {
      await unmarkUserForDeletion(userId.value);
      authStore.userProfile.marked_for_deletion_at = null;
    } else {
      await markUserForDeletion(userId.value);
      authStore.userProfile.marked_for_deletion_at = new Date().toISOString();
    }
  } catch (err) {
    console.error("[DeleteAccount] error:", err);
  } finally {
    deleteBusy.value = false;
  }
};
</script>
