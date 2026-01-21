import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notificationStore', {
	state: () => ({
		notifications: [], // Array of all notifications
	}),

	getters: {
		unreadCount: (state) =>
			state.notifications.filter((n) => !n.read).length,
	},

	actions: {
		addNotification(type, message, userId, meta = {})
		{
			this.notifications.unshift({
				id: crypto.randomUUID(), // unique ID for local tracking
				type,                    // 'message', 'favorited', 'favorite_online'
				message,                 // text to display
				userId,                    // e.g., { id, displayname }
				meta,
				read: false,
				created_at: new Date().toISOString()
			});
		},

		markAllAsRead()
		{
			this.notifications.forEach((n) =>
			{
				n.read = true;
			});
		},

		markAllNonMessageAsRead()
		{
			this.notifications.forEach((n) =>
			{
				if (n.type !== 'message')
				{
					n.read = true;
				}
			});
		},

		markMessageNotificationAsRead(senderId)
		{
			// console.log('markMessageNotificationAsRead', senderId);
			// console.log('notifications', this.notifications);
			this.notifications.forEach((n) =>
			{
				if (n.type === "message" && n.userId === senderId)
				{
					n.read = true;
				}
			});
			// console.log('notifications', this.notifications);

		},
	},
});
