export const AI_DAILY_LIMITS = Object.freeze({
  unauthenticated: 0,
  guest: 2,
  onboarding: 10,
  anon_authenticated: 50,
  authenticated: 250,
});

export function getAiDailyLimitByStatus(status) {
  return AI_DAILY_LIMITS[status || "unauthenticated"] ?? 0;
}
