import { useState } from "#imports";
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useDisplay } from "vuetify";

type ScrollKey = string;

interface TouchState {
  y: number | null;
}

interface ScrollState {
  positions: Record<ScrollKey, number>;
  touch: Record<ScrollKey, TouchState>;
}

/**
 * Shared footer visibility controller used across pages.
 * - Hides on downward scroll/drag to free space.
 * - Shows on upward scroll/drag, focus, or handle tap.
 */
export function useFooterVisibility() {
  const { smAndDown } = useDisplay();

  const visible = useState("footer-visible", () => true);
  const scrollState = useState<ScrollState>("footer-scroll-state", () => ({
    positions: {},
    touch: {},
  }));

  const isVisible = computed(() => {
    if (!smAndDown.value) return true; // desktop/tablet: always show
    return visible.value;
  });

  const peekOffset = 8; // px left visible when hidden on mobile

  const showFooter = () => {
    visible.value = true;
  };

  const hideFooter = () => {
    visible.value = false;
  };

  const applyDelta = (delta: number) => {
    if (!smAndDown.value) return;
    if (Math.abs(delta) < 8) return; // ignore micro-movements
    if (delta > 0) hideFooter();
    else showFooter();
  };

  const createScrollHandler = (key: ScrollKey) => {
    return (nextPosition: number) => {
      const prev = scrollState.value.positions[key] ?? nextPosition;
      scrollState.value.positions[key] = nextPosition;
      const delta = nextPosition - prev;
      applyDelta(delta);
    };
  };

  const setTouchStart = (key: ScrollKey, y: number | null) => {
    scrollState.value.touch[key] = { y };
  };

  const handleTouchMove = (key: ScrollKey, nextY: number) => {
    const state = scrollState.value.touch[key] || { y: null };
    const prevY = state.y;
    scrollState.value.touch[key] = { y: nextY };
    if (prevY == null) return;
    const delta = nextY - prevY; // positive = dragging down, negative = dragging up
    applyDelta(delta);
  };

  // Optional window scroll wiring (useful for standard pages)
  let windowHandler: ((e: Event) => void) | null = null;
  const bindWindowScroll = () => {
    if (typeof window === "undefined") return;
    if (windowHandler) return;
    const handleScroll = createScrollHandler("window");
    windowHandler = () => handleScroll(window.scrollY || 0);
    window.addEventListener("scroll", windowHandler, { passive: true });
  };

  const unbindWindowScroll = () => {
    if (windowHandler && typeof window !== "undefined") {
      window.removeEventListener("scroll", windowHandler);
      windowHandler = null;
    }
  };

  onMounted(() => {
    if (smAndDown.value) {
      hideFooter(); // start hidden on mobile
      bindWindowScroll();
    }
  });

  watch(
    () => smAndDown.value,
    (isMobile) => {
      if (isMobile) {
        hideFooter();
        bindWindowScroll();
      } else {
        showFooter();
        unbindWindowScroll();
      }
    }
  );

  onBeforeUnmount(() => {
    unbindWindowScroll();
  });

  return {
    isVisible,
    showFooter,
    hideFooter,
    createScrollHandler,
    setTouchStart,
    handleTouchMove,
    peekOffset,
  };
}
