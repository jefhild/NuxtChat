<template>
  <LoadingContainer/>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useDb } from "@/composables/useDB";
import LoadingContainer from "~/components/LoadingContainer.vue";

const route = useRoute();
const nextPath = route.query.next || "/";
const router = useRouter();
const authStore = useAuthStore();
const { authGetUser } = useDb();
const localPath = useLocalePath();

onMounted(async () => {
  try {
    // Only attempt auth session on client
    const { data: user } = await authGetUser();

    if (user?.user) {
      await authStore.checkAuth(); // updates state
      // router.replace(localPath("/")); 
      router.replace(localPath(nextPath as string));
    } else {
      console.warn("No session found — redirecting to login");
      // router.replace(localPath("/login"));
      router.replace(localPath("/signin"));
    }
  } catch (err) {
    console.error("Auth callback error:", err);
    // router.replace(localPath("/login"));
    router.replace(localPath("/signin"));
  }
});
</script>

<style scoped>
/* Optional: center spinner */
</style>