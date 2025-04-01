<template>
  <v-menu offset-y v-if="!loading">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" size="small" :color="statusColor(userId)" :icon="statusIcon(userId)"></v-btn>
    </template>

    <v-list>
      <v-list-item v-for="option in statusOptions" :key="option.value" @click="setStatus(option.value)">
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
const loading = ref(false);
const userId = ref('');

const {statusOptions, statusColor, statusIcon } = usePresenceStatus();

const setStatus = async (newStatus) =>
{
  await presenceStore.updateUserStatus(newStatus);
};

onMounted(() =>
{
  userId.value = authStore.userProfile.user_id;
});
</script>
