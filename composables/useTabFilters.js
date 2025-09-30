// composables/useTabFilters.js
import { reactive, computed } from "vue";

/**
 * @typedef {'online'|'offline'|'active'|'articles'} TabKind
 */

/**
 * @typedef {{ online: boolean, offline: boolean, active: boolean, articles: boolean }} TabFilters
 */

export function useTabFilters() {
  /** @type {TabFilters} */
  const tabFilters = reactive({
    online: true,
    offline: true,
    active: true,
    articles: false,
  });

  /** @param {TabKind} kind */
  const canShow = (kind) => !!tabFilters[kind];

  const selectedKinds = computed(
    () =>
      /** @type {TabKind[]} */ (
        Object.entries(tabFilters)
          .filter(([, v]) => v)
          .map(([k]) => k)
      )
  );

  const hasAnySelected = computed(() => selectedKinds.value.length > 0);

  /** @param {Partial<TabFilters>} next */
  const setMany = (next) => Object.assign(tabFilters, next);

  const reset = () => {
    setMany({ online: true, offline: true, active: true, articles: false });
  };

  return { tabFilters, canShow, selectedKinds, hasAnySelected, setMany, reset };
}
