import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const MOBILE_MEDIA_QUERY = "(max-width: 959px)";

export function useResponsiveDisplay() {
  const matches = ref(false);
  let mediaQuery: MediaQueryList | null = null;

  const syncMatches = () => {
    matches.value = mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    if (!import.meta.client) return;

    mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    syncMatches();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMatches);
      return;
    }

    mediaQuery.addListener(syncMatches);
  });

  onBeforeUnmount(() => {
    if (!mediaQuery) return;

    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", syncMatches);
      return;
    }

    mediaQuery.removeListener(syncMatches);
  });

  const smAndDown = computed(() => matches.value);
  const mdAndUp = computed(() => !matches.value);

  return {
    smAndDown,
    mdAndUp,
  };
}
