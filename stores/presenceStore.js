import { defineStore } from 'pinia';

export const usePresenceStore = defineStore('presenceStore', {
  state: () => ({
    onlineUsers: [],
    presenceChanged: false,
    channel: null,
  }),

  actions: {
    setOnlineUsers(users)
    {
      // console.log("Setting online users in store:", users);
      this.onlineUsers = users;
    },

    triggerPresenceChange()
    {
      this.presenceChanged = true;
    },

    resetPresenceChange()
    {
      this.presenceChanged = false;
    },
    setChannel(c)
    {
      this.channel = c;
    },

    async leavePresenceChannel()
    {
      if (!this.channel) return;
      
      // console.log("Leaving presence channel");
      try {
        await this.channel.untrack();      
        await this.channel.unsubscribe();
      } catch (e) {
        console.error("Error while leaving presence channel:", e);
      } finally {
        this.channel = null;
        this.onlineUsers = [];
      }
      
    },
  },
});
