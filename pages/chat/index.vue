<template>
  <v-container
    fluid
    class="chat-page-shell d-flex flex-column flex-grow-1 min-h-0"
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
        class="flex-grow-1 min-h-0"
        :user="authStore.user"
        :userProfile="authStore.userProfile"
        :authStatus="authStore.authStatus"
        :show-mobile-controls="true"
      />
    </template>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useTheme } from "vuetify";

const authStore = useAuthStore();
const isLoading = ref(true);

const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();
const vuetifyTheme = useTheme();
const previousThemeName = ref(null);
const previousColorScheme = ref("");
const chatSeoQueryKeys = ["userslug", "slug", "userId", "id", "imchatty"];
const hasEntryQuery = computed(() =>
  chatSeoQueryKeys.some((key) => {
    const value = route.query?.[key];
    return Array.isArray(value) ? value.length > 0 : value != null && `${value}` !== "";
  })
);
const baseUrl = String(siteConfig?.url || config.public?.SITE_URL || "").replace(
  /\/+$/,
  ""
);
const chatCanonicalPath = computed(() => {
  const localizedPath = localPath("/chat");
  return `${baseUrl}${localizedPath === "/" ? "" : localizedPath}`;
});
const chatRobots = computed(() =>
  hasEntryQuery.value ? "noindex,follow" : undefined
);

function setThemeNameSafe(nextThemeName) {
  if (!nextThemeName) return;
  if (typeof vuetifyTheme?.change === "function") {
    vuetifyTheme.change(nextThemeName);
    return;
  }
  if (typeof vuetifyTheme?.global?.change === "function") {
    vuetifyTheme.global.change(nextThemeName);
  }
}

useSeoI18nMeta("chat.index", {
  overrideUrl: chatCanonicalPath,
  robots: chatRobots,
});
onMounted(async () => {
  try {
    if (vuetifyTheme?.global?.name?.value) {
      previousThemeName.value = vuetifyTheme.global.name.value;
      if (typeof document !== "undefined") {
        previousColorScheme.value = document.documentElement.style.colorScheme || "";
      }
    }

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

onBeforeUnmount(() => {
  if (vuetifyTheme?.global?.name?.value && previousThemeName.value) {
    setThemeNameSafe(previousThemeName.value);
  }
  if (typeof document !== "undefined") {
    if (previousColorScheme.value) {
      document.documentElement.style.colorScheme = previousColorScheme.value;
    } else {
      document.documentElement.style.removeProperty("color-scheme");
    }
  }
});
</script>

<style scoped>
.chat-page-shell {
  color: rgb(var(--v-theme-on-surface));
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
