// composables/usePresenceStatus.js
import { usePresenceStore } from '@/stores/presenceStore';

export const statusOptions = [
  { label: 'Online', value: 'online', icon: 'mdi-checkbox-blank-circle', color: 'green' },
  { label: 'Away', value: 'away', icon: 'mdi-clock-outline', color: 'orange' },
  { label: 'Do Not Disturb', value: 'dnd', icon: 'mdi-minus-circle-outline', color: 'red' },
];

export const usePresenceStatus = () =>
{
  const presenceStore = usePresenceStore();

  const statusColor = (userId) =>
  {
    const status = presenceStore.userStatusMap[userId];
    const match = statusOptions.find(option => option.value === status);
    return match?.color || 'grey';
  };

  const statusIcon = (userId) =>
  {
    const status = presenceStore.userStatusMap[userId];
    const match = statusOptions.find(option => option.value === status);
    return match?.icon || 'mdi-circle';
  };

  return {
    statusOptions,
    statusColor,
    statusIcon,
  };
};
