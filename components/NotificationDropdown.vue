<template>
  <div
    ref="rootRef"
    class="notification-dropdown"
    :class="mdAndUp ? 'notification-dropdown--desktop' : 'notification-dropdown--mobile'"
  >
    <button
      type="button"
      class="notification-dropdown__trigger"
      :aria-expanded="menu ? 'true' : 'false'"
      aria-haspopup="menu"
      aria-label="Notifications"
      @click="toggleMenu"
    >
      <i class="mdi mdi-bell notification-dropdown__icon" aria-hidden="true" />
      <span
        v-if="notificationStore.unreadCount > 0"
        class="notification-dropdown__badge"
        aria-hidden="true"
      >
        {{ unreadLabel }}
      </span>
    </button>

    <Transition name="notification-dropdown-fade">
      <div
        v-if="menu"
        class="notification-dropdown__panel"
        role="menu"
        aria-label="Notifications"
      >
        <div class="notification-dropdown__list">
          <template v-if="visibleNotifications.length">
            <div
              v-for="notification in visibleNotifications"
              :key="notification.id"
              class="notification-dropdown__item"
            >
              <div class="notification-dropdown__message">
                {{ notification.message }}
              </div>
              <div class="notification-dropdown__time">
                {{ formatNotificationDate(notification.created_at) }}
              </div>
            </div>
          </template>
          <div v-else class="notification-dropdown__empty">
            {{ t("components.notification-dropdown.none") }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useNotificationStore } from "@/stores/notificationStore";
import { useI18n } from "vue-i18n";
import { useResponsiveDisplay } from "@/composables/useResponsiveDisplay";

const { t } = useI18n();
const { mdAndUp } = useResponsiveDisplay();

const notificationStore = useNotificationStore();
const menu = ref(false);
const rootRef = ref(null);

const visibleNotifications = computed(() =>
  notificationStore.notifications.slice(0, 4)
);
const unreadLabel = computed(() =>
  notificationStore.unreadCount > 99 ? "99+" : `${notificationStore.unreadCount}`
);

const closeMenu = () => {
  menu.value = false;
};

const toggleMenu = () => {
  menu.value = !menu.value;
};

const formatNotificationDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

const onDocumentPointerDown = (event) => {
  const root = rootRef.value;
  const target = event.target;
  if (!root || !(target instanceof Node)) return;
  if (!root.contains(target)) closeMenu();
};

const onDocumentKeydown = (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
};

watch(menu, (isOpen) => {
  if (isOpen) {
    notificationStore.markAllNonMessageAsRead();
  }
});

onMounted(() => {
  if (!import.meta.client) return;
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeydown);
});

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<style scoped>
.notification-dropdown {
  position: relative;
  display: inline-flex;
}

.notification-dropdown--desktop {
  margin: 0 0 0 8px;
}

.notification-dropdown--mobile {
  margin: 12px 16px 0 0;
}

.notification-dropdown__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.notification-dropdown__trigger:hover,
.notification-dropdown__trigger:focus-visible {
  background: rgb(var(--color-foreground) / 0.08);
  outline: none;
}

.notification-dropdown__icon {
  font-size: 1.35rem;
}

.notification-dropdown__badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ff3b30;
  box-shadow: 0 0 0 2px rgb(var(--color-surface) / 0.95);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.notification-dropdown__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(320px, calc(100vw - 24px));
  border: 1px solid rgb(var(--color-border) / 0.75);
  border-radius: 16px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 0 18px 42px rgb(var(--color-shadow) / 0.2);
  z-index: 2200;
}

.notification-dropdown__list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.notification-dropdown__item {
  padding: 12px 14px;
  border-radius: 12px;
}

.notification-dropdown__item + .notification-dropdown__item {
  margin-top: 4px;
}

.notification-dropdown__item:hover {
  background: rgb(var(--color-foreground) / 0.04);
}

.notification-dropdown__message {
  white-space: normal;
  line-height: 1.35;
}

.notification-dropdown__time {
  margin-top: 4px;
  color: rgb(var(--color-foreground) / 0.62);
  font-size: 0.75rem;
}

.notification-dropdown__empty {
  padding: 16px 14px;
  color: rgb(var(--color-foreground) / 0.72);
}

.notification-dropdown-fade-enter-active,
.notification-dropdown-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.notification-dropdown-fade-enter-from,
.notification-dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
