<template>
  <div v-if="showStrip" class="match-strip px-2">
    <span class="strip-label">{{ $t("components.matchStrip.label") }}</span>

    <div class="strip-pills">
      <button
        class="pill pill-online"
        :class="{ active: activeFilter === 'online', empty: counts.online === 0 }"
        :disabled="counts.online === 0"
        :title="$t('components.matchStrip.online')"
        @click="counts.online > 0 && $emit('filter-change', activeFilter === 'online' ? null : 'online')"
      >
        <span class="dot dot-online" />{{ counts.online }}
      </button>

      <button
        class="pill pill-offline"
        :class="{ active: activeFilter === 'offline', empty: counts.offline === 0 }"
        :disabled="counts.offline === 0"
        :title="$t('components.matchStrip.offline')"
        @click="counts.offline > 0 && $emit('filter-change', activeFilter === 'offline' ? null : 'offline')"
      >
        <span class="dot dot-offline" />{{ counts.offline }}
      </button>

      <button
        v-if="counts.ai > 0"
        class="pill pill-ai"
        :class="{ active: activeFilter === 'ai' }"
        :title="$t('components.matchStrip.ai')"
        @click="$emit('filter-change', activeFilter === 'ai' ? null : 'ai')"
      >
        🤖 {{ counts.ai }}
      </button>

      <button
        v-if="hasAny"
        class="pill pill-random"
        :title="$t('components.matchStrip.random')"
        @click="$emit('random-pick')"
      >
        🎲
      </button>
    </div>

    <button
      class="refresh-btn"
      :disabled="loading"
      :title="$t('components.matchStrip.refresh')"
      @click="$emit('refresh')"
    >
      <i class="mdi mdi-refresh refresh-btn__icon" :class="{ spinning: loading }" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  data:         { type: Object,  default: null  },
  loading:      { type: Boolean, default: false },
  activeFilter: { type: String,  default: null  },
});

defineEmits(["refresh", "filter-change", "random-pick"]);

const counts = computed(() => props.data?.counts ?? { online: 0, offline: 0, ai: 0 });
const hasIntake = computed(() => !!props.data?.intake);
const hasAny    = computed(() => counts.value.online > 0 || counts.value.ai > 0);
const showStrip = computed(() => props.data !== null && hasIntake.value);
</script>

<style scoped>
.match-strip {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-height: 26px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface-variant), 0.04);
}

.strip-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
  margin-right: 2px;
}

.strip-pills {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  line-height: 1;
}
.pill:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);
  color: #93c5fd;
}
.pill.empty {
  opacity: 0.35;
  cursor: default;
}
.pill.active {
  background: rgba(59, 130, 246, 0.22);
  border-color: rgba(59, 130, 246, 0.55);
  color: #dbeafe;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.dot-online  { background: #20c997; }
.dot-offline { background: #94a3b8; }

.pill-random { font-size: 12px; padding: 0 4px; }

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  flex: 0 0 auto;
  transition: color 0.15s;
}
.refresh-btn:hover { color: #94a3b8; }
.refresh-btn:disabled { opacity: 0.4; cursor: default; }

.refresh-btn__icon {
  font-size: 12px;
  line-height: 1;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spinning { animation: spin 0.7s linear infinite; }
</style>
