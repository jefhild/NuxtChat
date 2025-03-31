<template>
  <v-tooltip text="Toggle online status" location="top" v-if="!loading">
    <template v-slot:activator="{ props }">
      <!-- <v-btn v-bind="props">Tooltip</v-btn> -->
      <v-btn
        v-bind="props"
        size="small"
        :color="isOnline ? 'green' : 'red'"
        :icon="
          isOnline ? 'mdi-power-plug-outline' : 'mdi-power-plug-off-outline'
        "
       @click=""
   
      ></v-btn> 
      <!-- @click="toggleStatus"-->
    </template>
  </v-tooltip>
</template>

<script setup>

import { usePresenceStore } from '@/stores/presenceStore';

const presenceStore = usePresenceStore();
const authStore = useAuthStore();

const isOnline = ref(false);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  await fetchStatus();
  loading.value = false;
});


watch(() => presenceStore.onlineUsers, async () => 
{
  loading.value = true;
  await fetchStatus();
  loading.value = false;
});

const fetchStatus = async () => {
  const data = presenceStore.onlineUsers.includes(authStore.user.id);

  if (data) {
    data ? (isOnline.value = true) : (isOnline.value = false);
  }
};

/*
const toggleStatus = async () => {
  isOnline.value = !isOnline.value;
  await updateStatusInDatabase(isOnline.value);
};

const updateStatusInDatabase = async (status) => {
  await updateStatus(props.userId, status);
};*/
</script>
