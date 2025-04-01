import { usePresenceStore } from '@/stores/presenceStore';

export const usePresenceChannel = (userId) =>
{
	const supabase = useSupabaseClient();
	const presenceStore = usePresenceStore();

	const channel = supabase.channel("presence:global", {
		config: {
			presence: { key: userId },
		},
	});

	let isFirstSync = true;
	channel
		.on("presence", { event: "sync" }, () =>
		{
			const state = channel.presenceState();

			//We ignore the first sync event because the current user isn't tracked yet
			if(isFirstSync){
				isFirstSync = false;
				return;
			} 

			// Get the current online users and their statuses
			const usersWithStatus = Object.entries(state).map(([userId, metas]) =>
			{
				return {
					userId,
					status: metas[0]?.status || "online", // fallback to 'online'
				};
			});

			presenceStore.setOnlineUsers(usersWithStatus); // full data, not just IDs
		})
		.on("presence", { event: "join" }, ({ key, newPresences }) =>
		{
			if (key !== userId)
			{ 
				const status = newPresences[0]?.status || 'online';
				presenceStore.addOnlineUser({ userId: key, status });
			}
		})
		.on("presence", { event: "leave" }, async  ({ key }) =>
		{
			if (key !== userId)
			{
				await presenceStore.removeOnlineUser(key);
			}
		})
		.subscribe(async (status) =>
		{
			if (status === "SUBSCRIBED")
			{
				console.log("Subscribed to presence channel");
				await channel.track({ 
					online_at: new Date().toISOString(),
					status: 'online'
				});
			}
		});

	presenceStore.setChannel(channel);
};
