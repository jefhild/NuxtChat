<template>
  <v-snackbar
    v-model="open"
    location="top right"
    timeout="3200"
    transition="fade-transition"
    class="favorite-toast"
  >
    <div class="favorite-toast__content">
      <v-avatar size="32" class="favorite-toast__avatar">
        <v-img v-if="avatarUrl" :src="avatarUrl" alt="" />
        <v-icon v-else size="18">mdi-account</v-icon>
      </v-avatar>
      <div class="favorite-toast__text">
        <NuxtLink v-if="linkTo" :to="linkTo" class="favorite-toast__link">
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
</script>

<style scoped>
.favorite-toast :deep(.v-snackbar__wrapper) {
  max-width: 320px;
  border-radius: 14px;
}

.favorite-toast__content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.favorite-toast__avatar {
  border: 1px solid rgba(255, 77, 109, 0.25);
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
</style>
