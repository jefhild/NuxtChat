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
    const { updatePresence } = useDb();
    await updatePresence(authStore.user.id, "online");
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

onMounted(async () =>
{
  initializeInactivityTimer();
  if (authStore.user?.id)
  {
    const { trackPresence } = useDb();
    await trackPresence(authStore.user.id);
  }
});

onUnmounted(async () =>
{
  window.removeEventListener("mousemove", resetInactivityTimer);
  window.removeEventListener("keydown", resetInactivityTimer);
  window.removeEventListener("click", resetInactivityTimer);
  window.removeEventListener("scroll", resetInactivityTimer);

  const { stopTracking } = useDb();
  await stopTracking();
});
</script>
