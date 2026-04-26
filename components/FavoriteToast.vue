<template>
  <Teleport to="body">
    <div class="favorite-toast-layer" aria-live="polite" aria-atomic="true">
      <Transition name="favorite-toast-fade">
        <div
          v-if="open"
          class="favorite-toast"
          role="status"
        >
          <div class="favorite-toast__content">
            <div class="favorite-toast__avatar" aria-hidden="true">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt=""
                class="favorite-toast__avatar-image"
              >
              <i v-else class="mdi mdi-account favorite-toast__avatar-icon" />
            </div>
            <div class="favorite-toast__text">
              <NuxtLink v-if="linkTo" :to="linkTo" class="favorite-toast__link">
                {{ message }}
              </NuxtLink>
              <span v-else>{{ message }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useNotificationStore } from "@/stores/notificationStore";

const notificationStore = useNotificationStore();
const localePath = useLocalePath();

const open = ref(false);
const message = ref("");
const lastId = ref(null);
const avatarUrl = ref(null);
const chatRoute = ref(null);
let closeTimer = null;

const linkTo = computed(() =>
  chatRoute.value ? localePath(chatRoute.value) : null
);

watch(
  () => notificationStore.notifications[0]?.id,
  async (id) => {
    if (!id) return;
    const n = notificationStore.notifications[0];
    if (n?.type !== "favorited") return;
    if (id === lastId.value) return;
    lastId.value = id;
    message.value = n.message;
    avatarUrl.value = n?.meta?.avatarUrl || null;
    chatRoute.value = n?.meta?.chatRoute || null;
    open.value = false;
    await nextTick();
    open.value = true;
  }
);

watch(open, (value) => {
  if (!import.meta.client) return;
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (!value) return;
  closeTimer = window.setTimeout(() => {
    open.value = false;
    closeTimer = null;
  }, 3200);
});

onBeforeUnmount(() => {
  if (closeTimer && import.meta.client) {
    window.clearTimeout(closeTimer);
  }
});
</script>

<style scoped>
.favorite-toast-layer {
  position: fixed;
  top: 68px;
  right: 1rem;
  z-index: 2000;
  pointer-events: none;
}

.favorite-toast__content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.favorite-toast {
  max-width: min(320px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.98);
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.24);
  color: rgb(248, 250, 252);
  pointer-events: auto;
}

.favorite-toast__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(255, 77, 109, 0.25);
}

.favorite-toast__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.favorite-toast__avatar-icon {
  font-size: 18px;
}

.favorite-toast__text {
  font-size: 0.95rem;
  line-height: 1.2;
}

.favorite-toast__link {
  color: inherit;
  text-decoration: none;
}

.favorite-toast__link:hover {
  text-decoration: underline;
}

.favorite-toast-fade-enter-active,
.favorite-toast-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.favorite-toast-fade-enter-from,
.favorite-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .favorite-toast-layer {
    left: 1rem;
    right: 1rem;
  }

  .favorite-toast {
    max-width: none;
  }
}
</style>
