<template>
  <section
    :class="[
      'profiles-shell mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8',
      { 'profiles-shell--dark': isDarkTheme },
    ]"
  >
    <div class="profiles-header-shell">
      <div class="profiles-header-actions">
        <button
          type="button"
          aria-label="Open filters"
          class="profiles-menu-btn"
          :aria-expanded="filtersOpen ? 'true' : 'false'"
          aria-controls="profiles-filters-drawer"
          @click="filtersOpen = true"
        >
          <i class="mdi mdi-menu profiles-menu-btn__icon" aria-hidden="true" />
        </button>
      </div>
      <PageHeader :text="t(titleKey)" :subtitle="t(subtitleKey)" />
    </div>

    <Teleport to="body">
      <Transition name="profiles-drawer-fade">
        <button
          v-if="filtersOpen"
          type="button"
          class="profiles-drawer__scrim"
          aria-label="Close filters"
          @click="filtersOpen = false"
        />
      </Transition>
      <Transition name="profiles-drawer-slide">
        <aside
          v-if="filtersOpen"
          id="profiles-filters-drawer"
          class="profiles-drawer"
          aria-label="Profile filters"
        >
          <div class="profiles-drawer__header">
            <div class="profiles-drawer__title">
              {{ t("pages.profiles.index.filters") }}
            </div>
            <button
              type="button"
              class="profiles-drawer__close"
              aria-label="Close filters"
              @click="filtersOpen = false"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
          <nav class="profiles-drawer__list">
            <NuxtLink
              v-for="link in filterLinks"
              :key="link.path"
              :to="localPath(link.path)"
              class="profiles-drawer__item"
              @click="filtersOpen = false"
            >
              <i
                :class="['mdi', link.icon, 'profiles-drawer__item-icon', link.iconClass]"
                aria-hidden="true"
              />
              <span>{{ link.label }}</span>
            </NuxtLink>
          </nav>
        </aside>
      </Transition>
    </Teleport>

    <div class="w-full">
      <slot />
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  titleKey: {
    type: String,
    required: true,
  },
  subtitleKey: {
    type: String,
    default: "pages.profiles.index.subtitle",
  },
});

const localPath = useLocalePath();
const { t } = useI18n();
const filtersOpen = ref(false);
const { resolvedTheme } = useAppTheme();
const isDarkTheme = computed(() => resolvedTheme.value === "dark");

const filterLinks = computed(() => [
  {
    path: "/profiles",
    label: t("pages.profiles.index.title"),
    icon: "mdi-account-multiple",
    iconClass: "",
  },
  {
    path: "/profiles/recent",
    label: t("pages.profiles.recent.title"),
    icon: "mdi-clock-outline",
    iconClass: "profiles-drawer__item-icon--recent",
  },
  {
    path: "/profiles/popular",
    label: t("pages.profiles.popular.title"),
    icon: "mdi-fire-circle",
    iconClass: "profiles-drawer__item-icon--popular",
  },
  {
    path: "/profiles/ai",
    label: t("pages.profiles.ai.title"),
    icon: "mdi-robot-outline",
    iconClass: "profiles-drawer__item-icon--ai",
  },
  {
    path: "/profiles/male",
    label: t("components.profile-container.gender-male"),
    icon: "mdi-gender-male",
    iconClass: "profiles-drawer__item-icon--male",
  },
  {
    path: "/profiles/female",
    label: t("components.profile-container.gender-female"),
    icon: "mdi-gender-female",
    iconClass: "profiles-drawer__item-icon--female",
  },
  {
    path: "/profiles/other",
    label: t("components.profile-container.gender-other"),
    icon: "mdi-gender-non-binary",
    iconClass: "profiles-drawer__item-icon--other",
  },
]);
</script>

<style scoped>
.profiles-shell {
  padding-top: 6px;
  min-height: 100%;
}

.profiles-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.profiles-header-shell :deep(.page-header-row) {
  padding-left: clamp(76px, 10vw, 92px);
  box-sizing: border-box;
}

.profiles-header-actions {
  position: absolute;
  top: 8px;
  left: 0;
  display: inline-flex;
  align-items: center;
  z-index: 1;
}

.profiles-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border: 1px solid rgb(var(--color-primary) / 0.32);
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
  box-shadow: 0 12px 28px rgb(var(--color-shadow) / 0.12);
  cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
}

.profiles-menu-btn:hover,
.profiles-menu-btn:focus-visible {
  background: rgb(var(--color-primary) / 0.14);
  border-color: rgb(var(--color-primary) / 0.42);
  outline: none;
}

.profiles-menu-btn__icon {
  font-size: 1.55rem;
}

.profiles-drawer {
  position: fixed;
  top: var(--nav2-offset, 0px);
  left: 0;
  bottom: 0;
  z-index: 2250;
  width: min(260px, 84vw);
  padding: 14px;
  border-right: 1px solid rgb(var(--color-border) / 0.7);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 18px 0 42px rgb(var(--color-shadow) / 0.22);
  overflow-y: auto;
}

.profiles-drawer__scrim {
  position: fixed;
  inset: 0;
  z-index: 2240;
  border: 0;
  background: rgb(15 23 42 / 0.42);
}

.profiles-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.profiles-drawer__title {
  font-size: 1rem;
  font-weight: 700;
}

.profiles-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.profiles-drawer__close:hover,
.profiles-drawer__close:focus-visible {
  background: rgb(var(--color-foreground) / 0.08);
  outline: none;
}

.profiles-drawer__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profiles-drawer__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  font-size: 0.95rem;
}

.profiles-drawer__item:hover,
.profiles-drawer__item:focus-visible {
  background: rgb(var(--color-foreground) / 0.06);
  outline: none;
}

.profiles-drawer__item-icon {
  font-size: 1.1rem;
}

.profiles-drawer__item-icon--male {
  color: #60a5fa;
}

.profiles-drawer__item-icon--recent {
  color: #38bdf8;
}

.profiles-drawer__item-icon--popular {
  color: #f97316;
}

.profiles-drawer__item-icon--ai {
  color: #22c55e;
}

.profiles-drawer__item-icon--female {
  color: #f472b6;
}

.profiles-drawer__item-icon--other {
  color: #c084fc;
}

.profiles-shell--dark {
  background: #0f172a;
  border-radius: 0;
  color: #e2e8f0;
}

.profiles-shell--dark :deep(.page-header-text),
.profiles-shell--dark :deep(.page-header-subtitle),
.profiles-shell--dark :deep(.text-h6),
.profiles-shell--dark :deep(.text-body-2) {
  color: #e2e8f0 !important;
}

.profiles-shell--dark :deep(.text-medium-emphasis) {
  color: #94a3b8 !important;
}

.profiles-drawer-fade-enter-active,
.profiles-drawer-fade-leave-active,
.profiles-drawer-slide-enter-active,
.profiles-drawer-slide-leave-active {
  transition: opacity 160ms ease, transform 180ms ease;
}

.profiles-drawer-fade-enter-from,
.profiles-drawer-fade-leave-to,
.profiles-drawer-slide-enter-from,
.profiles-drawer-slide-leave-to {
  opacity: 0;
}

.profiles-drawer-slide-enter-from,
.profiles-drawer-slide-leave-to {
  transform: translateX(-14px);
}

@media (max-width: 640px) {
  .profiles-shell {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .profiles-header-shell :deep(.page-header-row) {
    padding-left: 72px;
  }
}
</style>
