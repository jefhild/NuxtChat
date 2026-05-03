import { computed } from "vue";

const DEFAULT_DURATION = 3200;

let hideTimer = null;
let reminderAction = null;

export const useInteractionReminder = () => {
  const reminderState = useState("interaction-reminder", () => ({
    open: false,
    message: "",
    tone: "info",
    actionLabel: "",
  }));

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const dismissReminder = () => {
    clearHideTimer();
    reminderAction = null;
    reminderState.value = {
      ...reminderState.value,
      open: false,
    };
  };

  const showReminder = ({
    message = "",
    tone = "info",
    actionLabel = "",
    onAction = null,
    duration = DEFAULT_DURATION,
  } = {}) => {
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) return;

    clearHideTimer();
    reminderAction = typeof onAction === "function" ? onAction : null;
    reminderState.value = {
      open: true,
      message: normalizedMessage,
      tone,
      actionLabel: String(actionLabel || "").trim(),
    };

    hideTimer = setTimeout(() => {
      dismissReminder();
    }, Math.max(1200, Number(duration) || DEFAULT_DURATION));
  };

  const runReminderAction = () => {
    const action = reminderAction;
    dismissReminder();
    if (typeof action === "function") action();
  };

  return {
    reminder: computed(() => reminderState.value),
    showReminder,
    dismissReminder,
    runReminderAction,
  };
};
