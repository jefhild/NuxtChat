type PresenceSnapshotMeta = {
  status: string;
  online_at: string | null;
};

type PresenceSnapshot = Map<string, PresenceSnapshotMeta>;

function normalizePresenceMeta(entry: any): PresenceSnapshotMeta {
  const meta = entry?.metas?.[0] || entry || {};
  const status = String(meta?.status || "online")
    .trim()
    .toLowerCase();
  const onlineAt = meta?.online_at ? String(meta.online_at) : null;
  return {
    status: status || "online",
    online_at: onlineAt,
  };
}

export async function snapshotPresenceState(
  supabase: any
): Promise<PresenceSnapshot> {
  return new Promise<PresenceSnapshot>((resolve) => {
    const TIMEOUT_MS = 5_000;
    let settled = false;

    const done = (snapshot: PresenceSnapshot) => {
      if (settled) return;
      settled = true;
      channel.unsubscribe().catch(() => {});
      resolve(snapshot);
    };

    const channel = supabase.channel("presence:global");

    channel.on("presence", { event: "sync" }, () => {
      const state: Record<string, unknown[]> = channel.presenceState() ?? {};
      const snapshot = new Map<string, PresenceSnapshotMeta>();

      for (const [key, entries] of Object.entries(state)) {
        const normalizedKey = String(key || "").trim();
        if (!normalizedKey || normalizedKey.startsWith("observer:")) continue;
        if (!Array.isArray(entries) || !entries.length) continue;
        snapshot.set(normalizedKey, normalizePresenceMeta(entries[entries.length - 1]));
      }

      done(snapshot);
    });

    channel.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        done(new Map());
      }
    });

    setTimeout(() => {
      done(new Map());
    }, TIMEOUT_MS);
  });
}

export async function snapshotPresenceUserIds(supabase: any): Promise<Set<string>> {
  const snapshot = await snapshotPresenceState(supabase);
  return new Set(snapshot.keys());
}
