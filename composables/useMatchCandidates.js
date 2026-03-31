import { ref, readonly, computed } from "vue";

// Module-level REACTIVE refs — shared across all composable instances.
// When any instance updates these, all consumers (Users.vue, index.vue, etc.)
// reactively see the change without polling.
const _sharedData = ref(null);
const _sharedLoading = ref(false);
const _sharedError = ref(null);
const _sharedMatchFilter = ref(null); // null | 'online' | 'offline' | 'ai'
// True from bustMatchCache() until next fetch completes — keeps the strip
// visible in a loading state so there's no flash of empty between Ezra
// completing and the fresh candidate data arriving.
const _sharedRefreshPending = ref(false);
let _cachedAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Call this after mood is saved to force a fresh fetch everywhere
export function bustMatchCache() {
  _sharedData.value = null;
  _cachedAt = 0;
  _sharedRefreshPending.value = true;
}

// Set the active filter from anywhere (e.g., index.vue after pill tap)
export function setMatchFilter(filter) {
  _sharedMatchFilter.value = filter || null;
}

export function useMatchCandidates() {
  const { locale } = useI18n();

  const normalizeLocale = (code) => {
    const c = String(code || "").trim().toLowerCase();
    if (c.startsWith("zh")) return "zh";
    if (c.startsWith("fr")) return "fr";
    if (c.startsWith("ru")) return "ru";
    return "en";
  };

  async function fetchCandidates(force = false) {
    const now = Date.now();
    if (!force && _sharedData.value && now - _cachedAt < TTL_MS) return;

    _sharedLoading.value = true;
    _sharedError.value = null;
    const localeCode = normalizeLocale(locale.value);
    try {
      if (force) {
        try {
          await $fetch("/api/match/snapshot", { method: "POST" });
        } catch {
          // Non-fatal
        }
      }
      const result = await $fetch("/api/match/candidates", {
        query: { locale: localeCode },
      });
      if (!result?.intake) {
        try {
          await $fetch("/api/match/snapshot", { method: "POST" });
          const refreshed = await $fetch("/api/match/candidates", {
            query: { locale: localeCode },
          });
          _sharedData.value = refreshed;
          _cachedAt = Date.now();
          return;
        } catch {
          // No live mood state yet — strip stays hidden until Ezra runs
        }
      }
      _sharedData.value = result;
      _cachedAt = Date.now();
    } catch (e) {
      _sharedError.value = e;
    } finally {
      _sharedLoading.value = false;
      _sharedRefreshPending.value = false;
    }
  }

  return {
    data: readonly(_sharedData),
    loading: readonly(_sharedLoading),
    error: readonly(_sharedError),
    refreshPending: readonly(_sharedRefreshPending),
    matchFilter: computed(() => _sharedMatchFilter.value),
    fetchCandidates,
  };
}
