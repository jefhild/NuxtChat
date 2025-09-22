import { onMounted, onBeforeUnmount, watch } from "vue";
import { useAuthStore } from "~/stores/authStore1";
import { useDb } from "~/composables/useDB";

export function usePresenceHeartbeat() {
  const auth = useAuthStore();
  const { updateLastActive } = useDb();
  let t = null;

  async function tick() {
    const allowed = ["anon_authenticated", "authenticated"].includes(
      auth.authStatus
    );
    if (allowed && auth.user?.id) {
      try {
        await updateLastActive(auth.user.id);
      } catch {}
    }
  }

  function start() {
    if (t) return;
    t = setInterval(tick, 5 * 60 * 1000);
    tick();
  }
  function stop() {
    if (t) clearInterval(t);
    t = null;
  }

  onMounted(() => start());
  onBeforeUnmount(() => stop());
  watch(
    () => auth.authStatus,
    () => {
      const allowed = ["anon_authenticated", "authenticated"].includes(
        auth.authStatus
      );
      if (allowed) start();
      else stop();
    }
  );
}
