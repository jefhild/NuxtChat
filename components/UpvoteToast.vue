<template>
  <v-snackbar
    v-model="open"
    location="top right"
    timeout="3200"
    transition="fade-transition"
    class="upvote-toast"
    :z-index="2000"
  >
    <div class="upvote-toast__content">
      <v-avatar size="32" class="upvote-toast__avatar">
        <v-img v-if="avatarUrl" :src="avatarUrl" alt="" />
        <v-icon v-else size="18">mdi-account</v-icon>
      </v-avatar>
      <div class="upvote-toast__text">
        <v-icon size="14" color="amber-darken-1" class="mr-1">mdi-thumb-up</v-icon>
        <NuxtLink v-if="linkTo" :to="linkTo" class="upvote-toast__link">
          {{ message }}
        </NuxtLink>
        <span v-else>{{ message }}</span>
      </div>
    </div>
  </v-snackbar>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useNotificationStore } from "@/stores/notificationStore";

const notificationStore = useNotificationStore();
const localePath = useLocalePath();

const open = ref(false);
const message = ref("");
const lastId = ref(null);
const avatarUrl = ref(null);
const chatRoute = ref(null);

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
</script>

<style scoped>
.upvote-toast :deep(.v-overlay__scrim) {
  display: none;
}

.upvote-toast :deep(.v-overlay__content) {
  pointer-events: auto;
}

.upvote-toast :deep(.v-snackbar__wrapper) {
  max-width: 320px;
  border-radius: 14px;
  margin-top: 68px;
}

.upvote-toast__content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upvote-toast__avatar {
  border: 1px solid rgba(255, 179, 0, 0.3);
}

.upvote-toast__text {
  font-size: 0.95rem;
  line-height: 1.2;
}

.upvote-toast__link {
  color: inherit;
  text-decoration: none;
}

.upvote-toast__link:hover {
  text-decoration: underline;
}
</style>
