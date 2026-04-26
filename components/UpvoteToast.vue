<template>
  <Teleport to="body">
    <div class="upvote-toast-layer" aria-live="polite" aria-atomic="true">
      <Transition name="upvote-toast-fade">
        <div
          v-if="open"
          class="upvote-toast"
          role="status"
        >
          <div class="upvote-toast__content">
            <div class="upvote-toast__avatar" aria-hidden="true">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt=""
                class="upvote-toast__avatar-image"
              >
              <i v-else class="mdi mdi-account upvote-toast__avatar-icon" />
            </div>
            <div class="upvote-toast__text">
              <i class="mdi mdi-thumb-up upvote-toast__thumb-icon" aria-hidden="true" />
              <NuxtLink v-if="linkTo" :to="linkTo" class="upvote-toast__link">
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
    if (n?.type !== "upvoted") return;
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
.upvote-toast-layer {
  position: fixed;
  top: 68px;
  right: 1rem;
  z-index: 2000;
  pointer-events: none;
}

.upvote-toast__content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upvote-toast {
  max-width: min(320px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.98);
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.24);
  color: rgb(248, 250, 252);
  pointer-events: auto;
}

.upvote-toast__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(255, 179, 0, 0.3);
}

.upvote-toast__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upvote-toast__avatar-icon {
  font-size: 18px;
}

.upvote-toast__text {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  line-height: 1.2;
}

.upvote-toast__thumb-icon {
  color: rgb(245, 158, 11);
  font-size: 14px;
}

.upvote-toast__link {
  color: inherit;
  text-decoration: none;
}

.upvote-toast__link:hover {
  text-decoration: underline;
}

.upvote-toast-fade-enter-active,
.upvote-toast-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.upvote-toast-fade-enter-from,
.upvote-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .upvote-toast-layer {
    left: 1rem;
    right: 1rem;
  }

  .upvote-toast {
    max-width: none;
  }
}
</style>
