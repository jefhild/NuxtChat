<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <!-- <HomeRow1 /> -->

    <PageHeader
      :text="$t('pages.chat.index.heading')"
      :subtitle="$t('pages.chat.index.subtitle')"
    >
      <template #start>
        <v-btn
          icon
          variant="text"
          class="d-md-none"
          :class="{ 'chat-mobile-toggle--alert': showMobileUnreadAlert }"
          aria-label="Show online participants"
          @click="openUsersDrawer"
        >
          <v-icon color="green-darken-2">mdi-account-multiple-outline</v-icon>
        </v-btn>
      </template>
      <template #end>
        <v-btn
          icon
          variant="text"
          class="d-md-none"
          :class="{ 'chat-mobile-toggle--alert': showMobileActiveAlert }"
          aria-label="Show active chat participants"
          @click="openActiveDrawer"
        >
          <v-icon>mdi-chat-processing-outline</v-icon>
        </v-btn>
      </template>
    </PageHeader>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('components.loadingContainer.loading')"
    />

    <ChatLayout
      ref="chatLayoutRef"
      class="flex-grow-1 min-h-0"
      v-else
      :user="authStore.user"
      :userProfile="authStore.userProfile"
      :authStatus="authStore.authStatus"
      :show-mobile-controls="false"
    />
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { computed, onMounted, ref } from "vue";

const authStore = useAuthStore();
const isLoading = ref(true);
const chatLayoutRef = ref(null);
const showMobileUnreadAlert = computed(
  () => chatLayoutRef.value?.showMobileUnreadAlert?.value ?? false
);
const showMobileActiveAlert = computed(
  () => chatLayoutRef.value?.showMobileActiveAlert?.value ?? false
);
const openUsersDrawer = () => {
  chatLayoutRef.value?.openLeftDrawer?.();
};
const openActiveDrawer = () => {
  chatLayoutRef.value?.openRightDrawer?.();
};

const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();

useSeoI18nMeta("chat.index");
onMounted(async () => {
  try {
    // console.log("[chat2] onMounted: checking auth...");
    await authStore.checkAuth(); // safe getSession-based check
    if (
      ["authenticated", "anon_authenticated"].includes(authStore.authStatus) &&
      !authStore.isProfileComplete
    ) {
      const nextPath = route.fullPath || "/chat";
      const completionPath = `/settings?complete=1&next=${encodeURIComponent(
        nextPath
      )}`;
      return router.replace(localPath(completionPath));
    }
  } catch (e) {
    console.warn("[auth] checkAuth failed (ok to continue):", e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.chat-mobile-toggle--alert {
  animation: active-panel-pulse 1.6s ease-in-out infinite;
  border-color: rgba(220, 38, 38, 0.6);
  box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45),
    0 0 16px rgba(220, 38, 38, 0.3);
}

.chat-mobile-toggle--alert :deep(.v-icon) {
  color: rgba(220, 38, 38, 0.95);
}

@keyframes active-panel-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45),
      0 0 16px rgba(220, 38, 38, 0.3);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0),
      0 0 16px rgba(220, 38, 38, 0.2);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0),
      0 0 16px rgba(220, 38, 38, 0.25);
  }
}
</style>
