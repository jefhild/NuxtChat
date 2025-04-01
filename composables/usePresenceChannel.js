import { usePresenceStore } from '@/stores/presenceStore';

export const usePresenceChannel = (userId) =>
{
	const supabase = useSupabaseClient();
	const presenceStore = usePresenceStore();
	let lastOnlineUserIds = [];

	const channel = supabase.channel("presence:global", {
		config: {
			presence: { key: userId },
		},
	});

	channel
		.on("presence", { event: "sync" }, () =>
		{
			const state = channel.presenceState();
			const online = Object.keys(state || {});

			const hasChanged = JSON.stringify(online) !== JSON.stringify(lastOnlineUserIds);
			if (hasChanged)
			{
				presenceStore.setOnlineUsers(online);
				lastOnlineUserIds = online;
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
				await channel.track({ online_at: new Date().toISOString() });
			}
		});

	presenceStore.setChannel(channel);
};
