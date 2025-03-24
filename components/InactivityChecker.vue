<template>
  <div></div>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { onMounted, onUnmounted } from "vue";

const authStore = useAuthStore();

const resetInactivityTimer = async () =>
{ 
  if (authStore.user)
  {
    await authStore.updatePresence(authStore.user.id, "online");
  }
};

const initializeInactivityTimer = () =>
{
  resetInactivityTimer();
  window.addEventListener("mousemove", resetInactivityTimer);
  window.addEventListener("keydown", resetInactivityTimer);
  window.addEventListener("click", resetInactivityTimer);
  window.addEventListener("scroll", resetInactivityTimer);
};

onMounted(() =>
{
  initializeInactivityTimer();
  if (authStore.user?.id)
  {
    authStore.trackPresence(authStore.user.id);
  }
});

onUnmounted(() =>
{
  window.removeEventListener("mousemove", resetInactivityTimer);
  window.removeEventListener("keydown", resetInactivityTimer);
  window.removeEventListener("click", resetInactivityTimer);
  window.removeEventListener("scroll", resetInactivityTimer);
  authStore.stopTracking();
});
</script>
