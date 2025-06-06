<template>
  <v-menu offset-y v-if="!loading">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" size="small" :color="statusColorVal" :icon="statusIconVal"></v-btn>
    </template>
    <v-list>
      <v-list-item v-for="option in statusOptions" :key="option.value" @click="() => setStatus(option.value)">
        <v-list-item-title>
          <v-icon :color="option.color" size="small" class="mr-2">{{ option.icon }}</v-icon>
          {{ option.label }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>

import { usePresenceStore } from '@/stores/presenceStore';
import { usePresenceStatus } from '@/composables/usePresenceStatus';

const authStore = useAuthStore();
const presenceStore = usePresenceStore();
const { statusOptions, statusColor, statusIcon } = usePresenceStatus();

const loading = ref(false);
const userId = computed(() => authStore.userProfile?.user_id || '');

const statusColorVal = computed(() => statusColor(userId.value));
const statusIconVal = computed(() => statusIcon(userId.value));

const setStatus = async (newStatus) =>
{
  await presenceStore.updateUserStatus(newStatus);
};


onMounted(() =>
{
  loading.value = false;
});
</script>
