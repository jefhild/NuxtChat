<template>
  <div
    class="chat-page-shell flex min-h-0 flex-1 flex-col"
    :class="{ 'chat-page-shell--loading': isLoading }"
  >
    <LoadingContainer
      v-if="isLoading"
      class="chat-route-loader"
      :text="$t('components.loadingContainer.loading')"
    />

    <template v-else>
      <h1 class="chat-page-h1">
        {{ $t("pages.chat.index.heading") }}
      </h1>
      <ChatLayout
        ref="chatLayoutRef"
        class="min-h-0 flex-grow-1"
        :user="authStore.user"
        :userProfile="authStore.userProfile"
        :authStatus="authStore.authStatus"
        :show-mobile-controls="true"
      />
    </template>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { computed, onMounted, ref } from "vue";

const authStore = useAuthStore();
const isLoading = ref(true);

const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();
const baseUrl = String(siteConfig?.url || config.public?.SITE_URL || "").replace(
  /\/+$/,
  ""
);
const chatCanonicalPath = computed(() => {
  const localizedPath = localPath("/chat");
  return `${baseUrl}${localizedPath === "/" ? "" : localizedPath}`;
});
useSeoI18nMeta("chat.index", {
  overrideUrl: chatCanonicalPath,
  robots: "noindex,follow",
});
onMounted(async () => {
  try {
    // console.log("[chat] onMounted: checking auth...");
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
.chat-page-shell {
  color: rgb(var(--color-foreground));
  background: transparent;
  border-radius: 0;
  flex: 1 1 auto;
  overflow: hidden;
  padding: 4px 6px 0;
}

.chat-page-shell--loading {
  padding: 0;
  background: #0f172a;
}

.chat-route-loader {
  background: #0f172a !important;
  color: #cbd5e1 !important;
}

.chat-route-loader :deep(.text-h6) {
  color: #cbd5e1;
}

.chat-page-h1 {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 959px) {
  .chat-page-shell {
    padding: 0;
  }
}
</style>
