/**
 * Maps the home page / feeds mood chip keys to structured signals used by
 * live_mood_states, match_intakes, and the candidate scoring algorithm.
 *
 * Taxonomy values must stay in sync with LIVE_MOOD_TAXONOMY in botPlatform.ts.
 */
export interface MoodPreset {
  key: string;
  labelKey: string; // i18n key under pages.match.presets.*
  emotion: string;
  intent: string;
  energy: string;
  time_horizon: string;
  /** Icon shown on the chip */
  icon: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    key: "bored",
    labelKey: "pages.match.presets.bored",
    emotion: "playful",
    intent: "distract_me",
    energy: "normal",
    time_horizon: "right_now",
    icon: "mdi-lightning-bolt-outline",
  },
  {
    key: "cant_sleep",
    labelKey: "pages.match.presets.cant_sleep",
    emotion: "calm",
    intent: "casual_chat",
    energy: "wired",
    time_horizon: "right_now",
    icon: "mdi-moon-waning-crescent",
  },
  {
    key: "want_advice",
    labelKey: "pages.match.presets.want_advice",
    emotion: "curious",
    intent: "be_heard",
    energy: "normal",
    time_horizon: "right_now",
    icon: "mdi-comment-question-outline",
  },
  {
    key: "light_chat",
    labelKey: "pages.match.presets.light_chat",
    emotion: "playful",
    intent: "casual_chat",
    energy: "normal",
    time_horizon: "right_now",
    icon: "mdi-chat-outline",
  },
];

/** Look up a preset by key, returns null if not found. */
export function getPreset(key: string | null | undefined): MoodPreset | null {
  if (!key) return null;
  return MOOD_PRESETS.find((p) => p.key === key) ?? null;
}
