import { usePresenceStore } from '@/stores/presenceStore';

export const usePresenceChannel = (userId) =>
{
	const supabase = useSupabaseClient();
	const presenceStore = usePresenceStore();
	let lastOnlineUsers = [];

	const channel = supabase.channel("presence:global", {
		config: {
			presence: { key: userId },
		},
	});

	channel
		.on("presence", { event: "sync" }, () =>
		{
			const state = channel.presenceState();

			// Get the current online users and their statuses
			const usersWithStatus = Object.entries(state).map(([userId, metas]) =>
			{
				return {
					userId,
					status: metas[0]?.status || "online", // fallback to 'online'
				};
			});

			// Check if the online user IDs have changed
			const hasChanged = JSON.stringify(usersWithStatus) !== JSON.stringify(lastOnlineUsers);
			if (hasChanged)
			{
				presenceStore.setOnlineUsers(usersWithStatus); // full data, not just IDs
				lastOnlineUsers = usersWithStatus;
			}
			
		})
		.on("presence", { event: "join" }, ({ key }) =>
		{
			if (key !== userId)
			{ 
				presenceStore.triggerPresenceChange();
			}
		})
		.on("presence", { event: "leave" }, ({ key }) =>
		{
			if (key !== userId)
			{
				presenceStore.triggerPresenceChange();
			}
		})
		.subscribe(async (status) =>
		{
			if (status === "SUBSCRIBED")
			{
				await channel.track({ 
					online_at: new Date().toISOString(),
					status: 'online'
				});
			}
		});

	presenceStore.setChannel(channel);
};
