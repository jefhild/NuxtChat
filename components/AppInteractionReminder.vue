<template>
  <Teleport to="body">
    <div
      v-if="reminder.open"
      class="interaction-reminder-layer"
      aria-live="polite"
      aria-atomic="true"
    >
      <Transition name="interaction-reminder-fade">
        <div
          v-if="reminder.open"
          class="interaction-reminder"
          :class="`interaction-reminder--${resolvedTone}`"
          role="status"
        >
          <div
            class="interaction-reminder__accent"
            :class="`interaction-reminder__accent--${resolvedTone}`"
            aria-hidden="true"
          />
          <div class="interaction-reminder__lead" :class="`interaction-reminder__lead--${resolvedTone}`">
            <i :class="iconClass" aria-hidden="true" />
          </div>
          <div class="interaction-reminder__body">
            <span class="interaction-reminder__message">{{ reminder.message }}</span>
          </div>
          <div class="interaction-reminder__actions">
            <button
              v-if="reminder.actionLabel"
              type="button"
              class="interaction-reminder__action"
              @click="runReminderAction"
            >
              {{ reminder.actionLabel }}
            </button>
            <button
              type="button"
              class="interaction-reminder__close"
              aria-label="Dismiss reminder"
              @click="dismissReminder"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";

const { reminder, dismissReminder, runReminderAction } = useInteractionReminder();

const resolvedTone = computed(() => {
  const tone = String(reminder.value?.tone || "info").trim().toLowerCase();
  if (["error", "danger", "red"].includes(tone)) return "danger";
  if (["warning", "amber"].includes(tone)) return "warning";
  if (["success", "green"].includes(tone)) return "success";
  return "info";
});

const iconClass = computed(() => {
  if (resolvedTone.value === "danger") return "mdi mdi-alert-circle-outline";
  if (resolvedTone.value === "warning") return "mdi mdi-alert-outline";
  if (resolvedTone.value === "success") return "mdi mdi-check-circle-outline";
  return "mdi mdi-information-outline";
});
</script>

<style scoped>
.interaction-reminder-layer {
  position: fixed;
  inset: auto 0 1.25rem;
  z-index: 3200;
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: 0 1rem;
}

.interaction-reminder {
  position: relative;
  min-width: min(100%, 360px);
  max-width: min(100%, 560px);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  background-color: rgb(17, 24, 39);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.06), transparent 30%),
    linear-gradient(135deg, rgba(28, 41, 68, 0.98), rgba(14, 21, 36, 0.99));
  box-shadow:
    0 26px 54px rgba(2, 6, 23, 0.42),
    0 8px 22px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: rgb(var(--color-heading));
  display: flex;
  align-items: center;
  gap: 0.95rem;
  justify-content: space-between;
  overflow: hidden;
  padding: 1rem 1rem 1rem 0.95rem;
  pointer-events: auto;
  backdrop-filter: blur(14px);
}

.interaction-reminder--info {
  border-color: rgba(96, 165, 250, 0.3);
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(26, 43, 74, 0.98), rgba(13, 22, 40, 0.99));
}

.interaction-reminder--success {
  border-color: rgba(34, 197, 94, 0.3);
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.17), transparent 34%),
    linear-gradient(135deg, rgba(19, 42, 37, 0.98), rgba(11, 24, 25, 0.99));
}

.interaction-reminder--warning {
  border-color: rgba(251, 191, 36, 0.36);
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(61, 37, 16, 0.98), rgba(29, 22, 17, 0.99));
}

.interaction-reminder--danger {
  border-color: rgba(239, 68, 68, 0.34);
  background:
    radial-gradient(circle at top left, rgba(239, 68, 68, 0.2), transparent 34%),
    linear-gradient(135deg, rgba(61, 25, 31, 0.98), rgba(28, 15, 22, 0.99));
}

.interaction-reminder__accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  border-radius: 999px;
}

.interaction-reminder__accent--info {
  background: linear-gradient(180deg, rgb(96, 165, 250), rgb(59, 130, 246));
}

.interaction-reminder__accent--success {
  background: linear-gradient(180deg, rgb(74, 222, 128), rgb(34, 197, 94));
}

.interaction-reminder__accent--warning {
  background: linear-gradient(180deg, rgb(253, 224, 71), rgb(245, 158, 11));
}

.interaction-reminder__accent--danger {
  background: linear-gradient(180deg, rgb(248, 113, 113), rgb(239, 68, 68));
}

.interaction-reminder__lead {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 1.15rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.interaction-reminder__lead--info {
  background: rgba(var(--color-primary), 0.18);
  color: rgb(var(--color-primary));
}

.interaction-reminder__lead--success {
  background: rgba(34, 197, 94, 0.18);
  color: rgb(74, 222, 128);
}

.interaction-reminder__lead--warning {
  background: rgba(245, 158, 11, 0.18);
  color: rgb(251, 191, 36);
}

.interaction-reminder__lead--danger {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.interaction-reminder__body {
  flex: 1 1 auto;
  min-width: 0;
}

.interaction-reminder__message {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.38;
}

.interaction-reminder__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex: 0 0 auto;
}

.interaction-reminder__action,
.interaction-reminder__close {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.interaction-reminder__action {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgb(var(--color-heading));
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0.52rem 0.9rem;
  transition:
    background-color 140ms ease,
    transform 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.interaction-reminder--info .interaction-reminder__action {
  background: rgb(59, 130, 246);
  border-color: rgba(147, 197, 253, 0.42);
  color: white;
}

.interaction-reminder--warning .interaction-reminder__action {
  background: rgb(245, 158, 11);
  border-color: rgba(253, 224, 71, 0.42);
  color: rgb(32, 22, 8);
}

.interaction-reminder--success .interaction-reminder__action {
  background: rgb(34, 197, 94);
  border-color: rgba(134, 239, 172, 0.4);
  color: rgb(8, 28, 16);
}

.interaction-reminder--danger .interaction-reminder__action {
  background: rgb(239, 68, 68);
  border-color: rgba(252, 165, 165, 0.38);
  color: white;
}

.interaction-reminder__action:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 18px rgba(2, 6, 23, 0.18);
  transform: translateY(-1px);
}

.interaction-reminder__close {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--color-text), 0.72);
  transition: background-color 140ms ease, color 140ms ease;
}

.interaction-reminder__close:hover {
  background: rgba(var(--color-text), 0.08);
  color: rgb(var(--color-heading));
}

.interaction-reminder-fade-enter-active,
.interaction-reminder-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.interaction-reminder-fade-enter-from,
.interaction-reminder-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 640px) {
  .interaction-reminder {
    align-items: flex-start;
    flex-direction: column;
    min-width: 0;
    gap: 0.8rem;
    padding-right: 0.9rem;
  }

  .interaction-reminder__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .interaction-reminder__close {
    align-self: flex-end;
    margin-top: -2.9rem;
  }
}
</style>
