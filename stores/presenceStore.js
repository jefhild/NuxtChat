import { defineStore } from 'pinia';

export const usePresenceStore = defineStore('presenceStore', {
  state: () => ({
    onlineUsers: [],
    presenceChanged: false,
    channel: null,
    status: 'online', 
  }),

  getters: {
    userIdsOnly: (state) => state.onlineUsers.map(user => user.userId),

    userStatusMap: (state) =>
      Object.fromEntries(state.onlineUsers.map(u => [u.userId, u.status])),
  },

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

    async updateUserStatus(status){
      if (this.channel)
      {
        this.status = status;
        await this.channel.track({
          online_at: new Date().toISOString(),
          status: status
        });
      }
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
