<template>
  <div class="settings-shell mx-auto w-full max-w-[1260px] overflow-x-clip px-1 pt-1.5">
    <Teleport to="body">
      <div
        v-if="drawer"
        class="settings-drawer-overlay"
        @click="drawer = false"
      >
        <aside
          class="settings-drawer"
          @click.stop
        >
          <div class="settings-drawer__header">
            <p class="settings-drawer__title">{{ settingsHeading }}</p>
            <button
              type="button"
              class="ui-settings-icon-btn settings-icon-btn"
              :aria-label="$t('common.close')"
              @click="drawer = false"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
          <nav class="settings-drawer__nav" :aria-label="settingsHeading">
            <button
              v-for="item in menuItems"
              :key="item.value"
              type="button"
              class="settings-drawer-item"
              :class="{ 'settings-drawer-item--active': tab === item.value }"
              @click="selectTab(item.value)"
            >
              <i class="mdi settings-drawer-item__icon" :class="item.icon" aria-hidden="true" />
              <span>{{ item.title }}</span>
            </button>
          </nav>
        </aside>
      </div>
    </Teleport>

    <div class="settings-header-shell">
      <div class="settings-header-actions">
        <button
          type="button"
          class="ui-settings-icon-btn settings-menu-btn"
          :aria-label="settingsHeading"
          @click="drawer = true"
        >
          <i class="mdi mdi-menu" aria-hidden="true" />
        </button>
      </div>
      <PageHeader :text="pageTitle" :subtitle="settingsSubtitle" />
    </div>

    <div class="mt-2">
      <div class="settings-panel-card">
        <template v-if="!isLoading">
          <div v-if="tab === 1" class="settings-content-col">
            <template v-if="userProfile">
              <SettingsProfileForm
                :userProfile="userProfile"
                @openPhotoLibrary="selectTab(7)"
              />
            </template>
            <template v-else>
              <p>{{ $t("components.settings-container.loading") }}</p>
            </template>
          </div>

          <div v-else-if="tab === 2" class="settings-content-col">
            <div class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis">
              {{ $t("components.settings-container.registered-only") }}
            </div>
            <template v-if="userProfile?.user_id">
              <SettingsFavorites :userId="userProfile.user_id" />
            </template>
          </div>

          <div v-else-if="tab === 3" class="settings-content-col">
            <template v-if="user?.id">
              <SettingsBlockedUsers :userId="userProfile.user_id" />
            </template>
            <template v-else>
              <p>{{ $t("components.settings-container.loading") }}</p>
            </template>
          </div>

          <div v-else-if="tab === 4" class="settings-content-col">
            <template v-if="user?.id">
              <SettingsUpvotes :userId="userProfile.user_id" />
            </template>
            <template v-else>
              <p>{{ $t("components.settings-container.loading") }}</p>
            </template>
          </div>

          <div v-else-if="tab === 5" class="settings-content-col">
            <SettingsLanguagePractice />
          </div>

          <div v-else-if="tab === 6" class="settings-content-col">
            <SettingsChatSettings />
            <SettingsEmailNotifications />
            <SettingsDeleteAccount />
          </div>

          <div v-else-if="tab === 7" class="settings-content-col">
            <div
              v-if="!photoLibraryAvailable"
              class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
            >
              {{ $t("components.settings-container.registered-only") }}
            </div>
            <template v-else-if="userProfile?.user_id">
              <SettingsPhotoLibrary :userId="userProfile.user_id" />
            </template>
            <template v-else>
              <p>{{ $t("components.settings-container.loading") }}</p>
            </template>
          </div>

          <div v-else-if="tab === 8" class="settings-content-col">
            <SettingsAgentSettings />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import PageHeader from "~/components/PageHeader.vue";

const { t } = useI18n();

const tab = ref(1);
const drawer = ref(false);
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const userProfile = computed(() => authStore.userProfile);

const isLoading = ref(true);

const photoLibraryAvailable = computed(
  () => authStore.authStatus === "authenticated"
);

const settingsHeading = computed(() => t("pages.settings.heading"));
const settingsSubtitle = computed(() => t("pages.settings.subtitle"));

const menuItems = computed(() => [
    {
      value: 1,
      label: t("components.settings-container.profile"),
      title: t("components.settings-container.menu.profile"),
      icon: "mdi-account",
    },
    {
      value: 2,
      label: t("components.settings-container.favorites"),
      title: t("components.settings-container.menu.favorites"),
      icon: "mdi-heart",
    },
    {
      value: 3,
      label: t("components.settings-container.blocked"),
      title: t("components.settings-container.menu.blocked"),
      icon: "mdi-block-helper",
    },
    {
      value: 4,
      label: t("components.settings-container.upvotes"),
      title: t("components.settings-container.menu.upvotes"),
      icon: "mdi-thumb-up",
    },
    {
      value: 5,
      label: t("components.settings-container.language-practice", "Language Practice"),
      title: t("components.settings-container.menu.language-practice", "Language Practice"),
      icon: "mdi-translate",
    },
    {
      value: 6,
      label: t("components.settings-container.site-settings", "Site Settings"),
      title: t("components.settings-container.menu.site-settings", "Site Settings"),
      icon: "mdi-chat-outline",
    },
    {
      value: 7,
      label: t("components.settings-container.photo-library"),
      title: t("components.settings-container.menu.photo-library"),
      icon: "mdi-image-multiple",
    },
    {
      value: 8,
      label: t("components.settings-container.agent-settings", "Away Agent"),
      title: t("components.settings-container.menu.agent-settings", "Away Agent"),
      icon: "mdi-robot-outline",
    },
  ]);

const currentSectionLabel = computed(() => {
  const match = menuItems.value.find((item) => item.value === tab.value);
  return match?.label || t("components.settings-container.profile");
});

const pageTitle = computed(
  () => `${settingsHeading.value} ${currentSectionLabel.value}`
);

const selectTab = (value) => {
  tab.value = value;
  drawer.value = false;
};

const handleEscape = (event) => {
  if (event.key === "Escape") {
    drawer.value = false;
  }
};

onMounted(async () => {
  window.addEventListener("keydown", handleEscape);
  await authStore.checkAuth();
  isLoading.value = false;
});

watch(drawer, (isOpen) => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = isOpen ? "hidden" : "";
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleEscape);
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
});
</script>

<style scoped>
.settings-content-col {
  padding: 10px 10px 14px;
}

.settings-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.settings-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.settings-menu-btn {
  margin: 0;
}

.settings-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1700;
  background: rgba(15, 23, 42, 0.5);
  padding-top: 64px;
}

.settings-drawer {
  display: flex;
  flex-direction: column;
  width: min(280px, calc(100vw - 24px));
  height: calc(100dvh - 76px);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.96)
  );
  border-radius: 0 16px 16px 0;
  border: 1px solid rgb(var(--color-secondary) / 0.24);
  box-shadow:
    0 24px 56px rgb(var(--color-shadow) / 0.28),
    0 0 0 1px rgb(var(--color-secondary) / 0.08);
  overflow: auto;
}

.settings-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.5rem;
}

.settings-drawer__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.settings-drawer__nav {
  display: grid;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem 1rem;
}

.settings-drawer-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 2.5rem;
  border: 0;
  border-radius: 0.9rem;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.84);
  padding: 0.65rem 0.8rem;
  text-align: left;
  font-size: 0.9rem;
}

.settings-drawer-item__icon {
  font-size: 1.05rem;
}

.settings-drawer-item--active {
  background: rgb(var(--color-primary) / 0.16);
  color: rgb(var(--color-heading));
}

.settings-panel-card {
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.96)
  );
  border: 1px solid rgb(var(--color-border) / 0.74);
  border-radius: 16px;
  box-shadow: 0 18px 38px rgb(var(--color-shadow) / 0.14);
}

@media (min-width: 640px) {
  .settings-content-col {
    padding: 12px 14px 18px;
  }
}

@media (hover: hover) {
  .settings-drawer-item:hover {
    background: rgb(var(--color-primary) / 0.12);
  }
}
</style>
