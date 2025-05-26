<template>
    <span>{{ presenceStore.onlineUserCount }} users online</span>
  </template>
  
  <script setup>
  import { usePresenceStore } from '@/stores/presenceStore';
  
  const presenceStore = usePresenceStore();
  </script>