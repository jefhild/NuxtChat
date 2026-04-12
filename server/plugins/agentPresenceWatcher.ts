/**
 * Agent Presence Watcher — Nitro server plugin
 *
 * Subscribes to the same `presence:global` Supabase Realtime channel the
 * client uses. When a real user joins, we immediately pick one eligible away
 * agent and send a greeting — no cron delay.
 *
 * Only one agent contacts the user per join event. The proactive cron task
 * acts as a fallback (e.g. for users who were already online when the server
 * started, or when this plugin restarts mid-session).
 */
import { createClient } from "@supabase/supabase-js";
import { greetTargetUser, handOffAgentConversations } from "~/server/utils/agentEngine";

// Small random jitter so simultaneous joins don't all hit the DB at once
const MAX_JITTER_MS = 3_000;
// How long to wait before retrying when a brand-new user's profile isn't ready yet
const PROFILE_RETRY_MS = 15_000;

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();
  const supabaseUrl = config.public?.SUPABASE_URL as string | undefined;
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!supabaseUrl || !serviceKey) {
    console.warn("[agentPresenceWatcher] Missing Supabase config — plugin disabled");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Must subscribe to the same channel name clients use (see presenceStore2.js)
  const channel = supabase.channel("presence:global");

  channel.on("presence", { event: "sync" }, () => {});

  channel.on(
    "presence",
    { event: "join" },
    ({ key, newPresences: _newPresences }: { key: string; newPresences: any[] }) => {
      const userId = key;
      if (!userId || userId.startsWith("observer:")) return;

      const jitter = Math.random() * MAX_JITTER_MS;
      setTimeout(async () => {
        try {
          const { data: joinedProfile } = await supabase
            .from("profiles")
            .select("id, agent_enabled")
            .eq("user_id", userId)
            .maybeSingle();

          if (joinedProfile?.agent_enabled) {
            await handOffAgentConversations(supabase, joinedProfile.id);
          }

          let sent = await greetTargetUser(supabase, userId, config);
          if (!sent) {
            await new Promise((r) => setTimeout(r, PROFILE_RETRY_MS));
            sent = await greetTargetUser(supabase, userId, config);
          }
          if (sent) {
            console.log(`[agentPresenceWatcher] Greeted user ${userId}`);
          }
        } catch (err: any) {
          console.error("[agentPresenceWatcher] Error greeting user:", err?.message ?? err);
        }
      }, jitter);
    }
  );

  channel.on("presence", { event: "leave" }, () => {});

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      console.log("[agentPresenceWatcher] Listening on presence:global");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error("[agentPresenceWatcher] Channel error:", status);
    }
  });
});
