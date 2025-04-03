import { defineStore } from 'pinia';

export const usePresenceStore = defineStore('presenceStore', {
  state: () => ({
    onlineUsers: [], // [{ userId: 'user1', status: 'online' }, ...]
    presenceRefs: {}, // { userId: presence_ref }
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
      this.onlineUsers = users;
    },

    async addOnlineUser(user, presenceRef)
    {
      //find the index of the user in the onlineUsers array
      const index = this.onlineUsers.findIndex(u => u.userId === user.userId);

      //if the user is already in the array, update their status
      if (index !== -1)
      {
        this.onlineUsers[index].status = user.status;
      } else //add to the array
      {
        this.onlineUsers.push(user);
      }

      // console.log("presnce refs befor ejoin:", this.presenceRefs);
      
      //if the user is already in the presenceRefs object, update their presence_ref
      this.presenceRefs[user.userId] = presenceRef;
      
      // console.log("Presence refs join:", this.presenceRefs);
    },

    async removeOnlineUser(userId)
    {
      this.onlineUsers = this.onlineUsers.filter(u => u.userId !== userId);
      // console.log("presnce refs befor leave:", this.presenceRefs);
      
      delete this.presenceRefs[userId];
      // console.log("Presence refs leave:", this.presenceRefs);

    },

    async updateUserStatus(status){
      if (this.channel)
      {
        this.status = status;

        // console.log("Tracking user with status:", status);
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
        this.presenceRefs = {};
      }
      
    },
  },
});
