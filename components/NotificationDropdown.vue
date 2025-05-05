<template>
	<v-menu v-model="menu" offset-y>
		<template #activator="{ props }" class="text-center">
			<v-badge v-if="notificationStore.unreadCount > 0" :content="notificationStore.unreadCount" color="red"
				overlap v-bind="props" :class="!mdAndUp ? 'mr-4 mt-3' : 'mr-2 ml-2'">
				<v-icon>
					mdi-bell
				</v-icon>
			</v-badge>
			<v-list-item v-else overlap v-bind="props">
				<v-icon>
					mdi-bell
				</v-icon>
			</v-list-item>
		</template>

		<v-list class="notification-list" style="max-height: 400px; overflow-y: auto;">
			<v-list-item v-for="notification in notificationStore.notifications.slice(0,4)" :key="notification.id"
				class="notification-item">
				<v-list-item-title>{{ notification.message }}</v-list-item-title>
				<v-list-item-subtitle class="text-caption">
					{{ new Date(notification.created_at).toLocaleString() }}
				</v-list-item-subtitle>
			</v-list-item>

			<v-list-item v-if="notificationStore.notifications.length === 0">
				<v-list-item-title>No notifications</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-menu>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notificationStore';

import { useDisplay } from 'vuetify';
const { mdAndUp } = useDisplay();

const notificationStore = useNotificationStore();
const menu = ref(false);

// Mark non-message notifications as read when dropdown is opened
watch(menu, (isOpen) =>
{
	if (isOpen)
	{
		notificationStore.markAllNonMessageAsRead()
	}
})
</script>

<style scoped>
.notification-list {
	min-width: 300px;
}

.notification-item {
	white-space: normal;
	line-height: 1.2;
}
</style>
