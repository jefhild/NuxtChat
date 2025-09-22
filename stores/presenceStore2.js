// stores/presenceStore2.js
import { defineStore } from "pinia";
import { useDb } from "@/composables/useDB";

function rnd() {
  return Math.random().toString(36).slice(2);
}

export const usePresenceStore2 = defineStore("presenceStore2", {
  state: () => ({
    channel: null, // RealtimeChannel
    presenceKey: null, // string
    status: "online", // "online" | "away" | etc
    onlineUsers: [], // [{ userId, status }]
  }),

  getters: {
    onlineUserIds: (s) => s.onlineUsers.map((u) => u.userId),
    isJoined: (s) => s.channel?.state === "joined",
  },

  actions: {
    _client() {
      // Single source of truth for the Supabase client
      const { getClient } = useDb();
      return getClient();
    },

    _mkChannel(name, opts) {
      const client = this._client();
      // Works for both client.channel(...) and client.realtime.channel(...)
      const maker =
        typeof client.channel === "function"
          ? client.channel.bind(client)
          : client?.realtime?.channel?.bind(client.realtime);

      if (!maker) throw new Error("Supabase client has no channel() method");
      return maker(name, opts);
    },

    _flatten(stateObj) {
      const out = [];
      for (const [uid, metas] of Object.entries(stateObj || {})) {
        if (!Array.isArray(metas) || metas.length === 0) continue;
        // last meta wins
        const m = metas[metas.length - 1];
        const meta = m?.metas?.[0] || m;
        out.push({ userId: String(uid), status: meta?.status || "online" });
      }
      return out;
    },

    _rebuild(fromChan) {
      const chan = fromChan || this.channel;
      if (!chan || typeof chan.presenceState !== "function") return;
      const raw = chan.presenceState() || {};
      this.onlineUsers = this._flatten(raw); // replace array to keep reactivity
    },

    async leave() {
      const chan = this.channel;
      this.channel = null;
      this.presenceKey = null;
      this.onlineUsers = [];
      if (!chan) return;

      try {
        await chan.untrack?.();
      } catch {}
      try {
        await chan.unsubscribe?.();
      } catch {}
    },

    // Tracked presence (real user with a userId)
    async connect({ userId }) {
      if (typeof window === "undefined") return;
      if (!userId) return;

      // exclusive mode: always start clean
      await this.leave();

      const key = String(userId);
      const chan = this._mkChannel("presence:global", {
        config: { presence: { key } },
      });

      // Wire presence events
      chan.on("presence", { event: "sync" }, () => this._rebuild(chan));
      chan.on("presence", { event: "join" }, () => this._rebuild(chan));
      chan.on("presence", { event: "leave" }, () => this._rebuild(chan));

      // Subscribe
      await new Promise((res) => {
        if (!chan.__didSubscribe) {
          chan.__didSubscribe = true;

          chan.subscribe((status) => {
            if (status === "SUBSCRIBED") res();
          });
        }
      });

      // Track self once
      try {
        await chan.track({
          status: this.status,
          online_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[presence] track error:", e?.message || e);
      }

      // Commit state and rebuild
      this.channel = chan;
      this.presenceKey = key;
      this._rebuild(chan);
    },

    // Read-only observer (guest/onboarding, no userId)
    async observe() {
      if (typeof window === "undefined") return;

      // exclusive mode: always start clean
      await this.leave();

      const key = "observer:" + rnd();
      const chan = this._mkChannel("presence:global", {
        config: { presence: { key } },
      });

      chan.on("presence", { event: "sync" }, () => this._rebuild(chan));
      chan.on("presence", { event: "join" }, () => this._rebuild(chan));
      chan.on("presence", { event: "leave" }, () => this._rebuild(chan));

      await new Promise((res) => {
        chan.subscribe((status) => {
          if (status === "SUBSCRIBED") res();
        });
      });

      // no track() here — observers never advertise themselves
      this.channel = chan;
      this.presenceKey = key;
      this._rebuild(chan);
    },

    // Optional helper to change status mid-session
    async setStatus(next) {
      this.status = next || "online";
      if (
        this.channel?.track &&
        this.presenceKey &&
        !this.presenceKey.startsWith("observer:")
      ) {
        try {
          await this.channel.track({
            status: this.status,
            online_at: new Date().toISOString(),
          });
        } catch {}
      }
    },
  },
});
