const STORAGE_PREFIX = "moodFeedPromptState:";
const DAY_MS = 24 * 60 * 60 * 1000;

function getStorageKey(userId) {
  const normalizedUserId = String(userId || "").trim();
  return normalizedUserId ? `${STORAGE_PREFIX}${normalizedUserId}` : "";
}

function parseStoredState(raw) {
  if (!raw) {
    return {
      disabled: false,
      snoozeUntil: null,
      lastShownAt: 0,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      disabled: parsed?.disabled === true,
      snoozeUntil:
        typeof parsed?.snoozeUntil === "string" && parsed.snoozeUntil.trim()
          ? parsed.snoozeUntil
          : null,
      lastShownAt: Number.isFinite(Number(parsed?.lastShownAt))
        ? Number(parsed.lastShownAt)
        : 0,
    };
  } catch {
    return {
      disabled: false,
      snoozeUntil: null,
      lastShownAt: 0,
    };
  }
}

export function readMoodFeedPromptState(userId) {
  if (!import.meta.client) {
    return {
      disabled: false,
      snoozeUntil: null,
      lastShownAt: 0,
    };
  }

  const key = getStorageKey(userId);
  if (!key) {
    return {
      disabled: false,
      snoozeUntil: null,
      lastShownAt: 0,
    };
  }

  try {
    return parseStoredState(localStorage.getItem(key));
  } catch {
    return {
      disabled: false,
      snoozeUntil: null,
      lastShownAt: 0,
    };
  }
}

export function writeMoodFeedPromptState(userId, patch = {}) {
  if (!import.meta.client) return null;

  const key = getStorageKey(userId);
  if (!key) return null;

  const current = readMoodFeedPromptState(userId);
  const next = {
    disabled:
      typeof patch.disabled === "boolean" ? patch.disabled : current.disabled,
    snoozeUntil:
      patch.snoozeUntil === undefined
        ? current.snoozeUntil
        : typeof patch.snoozeUntil === "string" && patch.snoozeUntil.trim()
        ? patch.snoozeUntil
        : null,
    lastShownAt:
      patch.lastShownAt === undefined
        ? current.lastShownAt
        : Number.isFinite(Number(patch.lastShownAt))
        ? Number(patch.lastShownAt)
        : 0,
  };

  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}

  return next;
}

export function syncMoodFeedPromptPreferences(userId, { enabled, snoozeUntil } = {}) {
  return writeMoodFeedPromptState(userId, {
    disabled: enabled === false,
    snoozeUntil,
  });
}

export function markMoodFeedPromptShown(userId, shownAt = Date.now()) {
  return writeMoodFeedPromptState(userId, {
    lastShownAt: shownAt,
  });
}

export function shouldSuppressMoodFeedPrompt(userId, now = Date.now()) {
  const state = readMoodFeedPromptState(userId);
  if (state.disabled) return true;

  if (state.snoozeUntil) {
    const snoozeUntilMs = new Date(state.snoozeUntil).getTime();
    if (Number.isFinite(snoozeUntilMs) && snoozeUntilMs > now) {
      return true;
    }
  }

  return Boolean(state.lastShownAt && now - state.lastShownAt < DAY_MS);
}
