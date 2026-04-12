export async function snapshotPresenceUserIds(supabase: any): Promise<Set<string>> {
  return new Promise<Set<string>>((resolve) => {
    const TIMEOUT_MS = 5_000;
    let settled = false;

    const done = (ids: Set<string>) => {
      if (settled) return;
      settled = true;
      channel.unsubscribe().catch(() => {});
      resolve(ids);
    };

    const channel = supabase.channel("presence:global");

    channel.on("presence", { event: "sync" }, () => {
      const state: Record<string, unknown[]> = channel.presenceState() ?? {};
      done(
        new Set(
          Object.keys(state).filter((key) => key && !String(key).startsWith("observer:"))
        )
      );
    });

    channel.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        done(new Set());
      }
    });

    setTimeout(() => {
      done(new Set());
    }, TIMEOUT_MS);
  });
}
