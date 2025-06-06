// composables/usePresenceStatus.js
import { usePresenceStore } from '@/stores/presenceStore';
import { useI18n } from "vue-i18n";

export const usePresenceStatus = () =>
{
  const { t } = useI18n();
  const presenceStore = usePresenceStore();

  const statusOptions = computed(() => [
      { label: t('composables.presenceStatus.online'), value: 'online', icon: 'mdi-checkbox-blank-circle', color: 'green' },
      { label: t('composables.presenceStatus.away'), value: 'away', icon: 'mdi-clock', color: 'orange' },
      { label: t('composables.presenceStatus.dnd'), value: 'dnd', icon: 'mdi-minus-circle', color: 'red' },
  ]);

  const statusColor = (userId) =>
  {
    const status = presenceStore.userStatusMap[userId];
    const match = statusOptions.value.find(option => option.value === status);
    return match?.color || 'grey';
  };

  const statusIcon = (userId) =>
  {
    const status = presenceStore.userStatusMap[userId];
    const match = statusOptions.value.find(option => option.value === status);
    return match?.icon || 'mdi-circle';
  };

  return {
    statusOptions,
    statusColor,
    statusIcon,
  };
};
