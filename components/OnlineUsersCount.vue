<template>
    <span>{{ presenceStore.onlineUserCount }} {{ $t("pages.home.homeRow1.onlineUsersOnline") }}</span>
  </template>
  
  <script setup>
  import { usePresenceStore } from '@/stores/presenceStore';
  
  const presenceStore = usePresenceStore();
  </script>