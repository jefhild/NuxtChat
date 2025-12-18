<template>
  <HomeMain v-if="['unauthenticated','guest','onboarding'].includes(auth.authStatus)" />
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore1'
const auth = useAuthStore()

useSeoI18nMeta("signin");
</script>
