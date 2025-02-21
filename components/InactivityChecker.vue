<template>
  <div></div>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { onMounted, onUnmounted } from 'vue';

const authStore = useAuthStore();
let inactivityCheckTimer;

const updatePresence = async () => {
  if (authStore.user) {
    await authStore.updatePresence(authStore.user.id, "online");
  }
};

const resetInactivityTimer = () => {
  clearTimeout(inactivityCheckTimer);
  inactivityCheckTimer = setTimeout(async () => {
    await logoutIfAnonymous();
  }, 3600000); // 1 hour in milliseconds
  updatePresence();
};

const logoutIfAnonymous = async () => {
  if (authStore.user && authStore.user.isAnonymous) {
    await authStore.logout();
  }
};

const initializeInactivityTimer = () => {
  resetInactivityTimer();
  // window.addEventListener('mousemove', resetInactivityTimer);
  window.addEventListener('keydown', resetInactivityTimer);
  window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
};

onMounted(() => {
  initializeInactivityTimer();
});

onUnmounted(() => {
  clearTimeout(inactivityCheckTimer);
  // window.removeEventListener('mousemove', resetInactivityTimer);
  window.removeEventListener('keydown', resetInactivityTimer);
  window.removeEventListener('click', resetInactivityTimer);
    window.removeEventListener('scroll', resetInactivityTimer);
});
</script>