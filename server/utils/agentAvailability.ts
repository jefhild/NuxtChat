import { snapshotPresenceState } from "~/server/utils/presenceSnapshot";

const ONLINE_HEARTBEAT_WINDOW_MS = 2 * 60 * 1000;

function normalizeStatus(value: unknown): string | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized || null;
}

function isRecentIsoDate(value: unknown, withinMs = ONLINE_HEARTBEAT_WINDOW_MS): boolean {
  if (!value) return false;
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= withinMs;
}

export async function loadAgentAvailabilityMap(supabase: any): Promise<Map<string, boolean>> {
  const presenceSnapshot = await snapshotPresenceState(supabase);
  const connectedUserIds = [...presenceSnapshot.keys()];

  const availability = new Map<string, boolean>();
  if (!connectedUserIds.length) return availability;

  const { data: presenceRows, error } = await supabase
    .from("presence")
    .select("user_id, manual_status, last_seen_at")
    .in("user_id", connectedUserIds);

  if (error) {
    console.error("[agentAvailability] presence lookup failed:", error.message);
  }

  const dbPresenceByUserId = new Map<string, any>();
  for (const row of presenceRows ?? []) {
    dbPresenceByUserId.set(String(row.user_id), row);
  }

  for (const userId of connectedUserIds) {
    const channelPresence = presenceSnapshot.get(userId);
    const dbPresence = dbPresenceByUserId.get(userId);

    const manualStatus =
      normalizeStatus(dbPresence?.manual_status) || normalizeStatus(channelPresence?.status);
    if (manualStatus === "away" || manualStatus === "offline") {
      availability.set(userId, false);
      continue;
    }

    const recentlySeen =
      isRecentIsoDate(dbPresence?.last_seen_at) ||
      isRecentIsoDate(channelPresence?.online_at);

    availability.set(userId, recentlySeen);
  }

  return availability;
}

export async function isAgentOwnerAvailable(
  supabase: any,
  userId: string
): Promise<boolean> {
  const availability = await loadAgentAvailabilityMap(supabase);
  return availability.get(String(userId)) === true;
}
