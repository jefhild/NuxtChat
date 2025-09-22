// stores/messagesStore.js
import { defineStore } from "pinia";
// import { shallowRef } from "vue";
import { useDb } from "@/composables/useDB";

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    unreadByPeer: {},
    _me: null,
    _db: null,
    incoming: null, // most recent incoming message (for notifications)
    // incoming: shallowRef(null), 
  }),
  getters: {
    totalUnread: (s) =>
      Object.values(s.unreadByPeer).reduce((a, b) => a + (b || 0), 0),
    getUnreadFor: (s) => (peerId) => s.unreadByPeer?.[peerId] || 0,
  },
  actions: {
    async init(me) {
      if (!me) return;

      // if user changes, clean old subscription first
      if (this._me && this._me !== me && this._db) {
        await this._db.unsubscribeMessages().catch(() => {});
      }

      if (this._me === me && this._db) return; // already wired

      this._me = me;
      this._db = useDb();

      try {
        this.unreadByPeer = await this._db.fetchUnreadCounts(me);
      } catch {
        this.unreadByPeer = {};
      }

      // SINGLE place that subscribes
      await this._db.subscribeToMessages(me, {
        onInsert: (m) => {
          // expose to UI
          this.incoming = m;

          // unread counts (only for incoming from others)
          if (!m?.sender_id || m.sender_id === this._me || m.read) return;
          const cur = this.unreadByPeer[m.sender_id] || 0;
          this.unreadByPeer = { ...this.unreadByPeer, [m.sender_id]: cur + 1 };
        },
        onUpdate: ({ old: before, new: after }) => {
          if (
            before?.read === false &&
            after?.read === true &&
            after?.sender_id
          ) {
            const cur = this.unreadByPeer[after.sender_id] || 0;
            this.unreadByPeer = {
              ...this.unreadByPeer,
              [after.sender_id]: Math.max(0, cur - 1),
            };
          }
        },
        onDelete: (m) => {
          if (m?.read === false && m?.sender_id) {
            const cur = this.unreadByPeer[m.sender_id] || 0;
            this.unreadByPeer = {
              ...this.unreadByPeer,
              [m.sender_id]: Math.max(0, cur - 1),
            };
          }
        },
      });
    },

    async dispose() {
      try {
        if (this._db) await this._db.unsubscribeMessages();
      } catch {}
      this._me = null;
      this._db = null;
      this.unreadByPeer = {};
      this.incoming = null;
    },

    async markThreadAsRead(peerId) {
      if (!peerId || !this._me || !this._db) return;
      try {
        await this._db.markThreadAsRead(this._me, peerId);
      } catch {}
      this.unreadByPeer = { ...this.unreadByPeer, [peerId]: 0 };
    },
  },
});
