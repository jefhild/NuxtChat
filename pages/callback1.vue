<template>
  <LoadingContainer />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useLocalePath } from "#imports";
import { useAuthStore } from "@/stores/authStore1"; // ✅ Your new auth store
import { useDb } from "@/composables/useDB";
import LoadingContainer from "~/components/LoadingContainer.vue";

// Composables and stores
const router = useRouter();
const route = useRoute();
const localPath = useLocalePath();
const authStore = useAuthStore();
const { authGetUser } = useDb();

// 🔒 Normalize and sanitize the next path (query param)
const rawNext = route.query.next;
const nextPath: string =
  typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/";

const isSafePath = (path: string): path is string =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//");

const safeNextPath = isSafePath(nextPath) ? nextPath : "/";

// 🚀 Run after redirect from OAuth
onMounted(async () => {
  try {
    const { data, error } = await authGetUser();

    if (error) {
      console.error("[callback1] Supabase error during auth check:", error.message);
    }

    if (data?.user) {
      // console.log("[callback1] Session exists. Bootstrapping auth store...");
      // await authStore.checkAuth(); 
      router.replace(localPath(safeNextPath));
    } else {
      console.warn("[callback1] No session found. Redirecting to /signin1.");
      router.replace(localPath("/signin1"));
    }
  } catch (err) {
    console.error("[callback1] Unexpected error during login redirect:", err);
    router.replace(localPath("/signin1"));
  }
});
</script>

<style scoped>
/* Optional loading container style */
</style>