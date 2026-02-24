export const AI_DAILY_LIMITS = Object.freeze({
  unauthenticated: 0,
  guest: 2,
  onboarding: 6,
  anon_authenticated: 10,
  authenticated: 200,
});

export function getAiDailyLimitByStatus(status) {
  return AI_DAILY_LIMITS[status || "unauthenticated"] ?? 0;
}
