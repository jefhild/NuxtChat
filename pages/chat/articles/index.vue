<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <HomeRow1 />

    <LoadingContainer
      v-if="isLoading || redirecting"
      :text="redirecting ? 'Opening latest discussion…' : $t('components.loadingContainer.loading')"
    />

    <ChatArticlesLayout
      v-else
      class="flex-grow-1 min-h-0" 
      :user="authStore.user"
      :userProfile="authStore.userProfile"
      :authStatus="authStore.authStatus"
      :topics="topics"
      :pending="pending"
      :formatDateTime="formatDateTime"
      @open-thread="openThread"
    />
  </v-container>
</template>







<script setup>
// PAGE: thin wrapper (SSR-safe redirect + data + auth) -> delegates UI to ChatArticlesLayout
const route = useRoute()
const router = useRouter()

// Auth (assumes Pinia store like your chat/index page)
const authStore = useAuthStore()
const isLoading = computed(() => authStore.loading) // adapt if your store differs

const ORDER = ['latest', 'oldest', 'pinned'].includes(String(route.query.order || '').toLowerCase())
  ? String(route.query.order).toLowerCase()
  : 'latest'

const { data: list, pending, error } = await useAsyncData(
  () => `articles:threads:list:${ORDER}`,
  () => $fetch('/api/articles/threads', { params: { order: ORDER, limit: 25 } }),
  { server: true }
)

const topics = computed(() => list.value || [])
const firstId = computed(() => list.value?.[0]?.id ?? null)

// Redirect policy (SSR 302 on server, replace on client)
const redirecting = ref(false)
if (firstId.value) {
  redirecting.value = true
  if (import.meta.server) {
    await navigateTo(`/chat/articles/${firstId.value}`, { replace: true, redirectCode: 302 })
  } else {
    navigateTo(`/chat/articles/${firstId.value}`, { replace: true })
  }
} else {
  redirecting.value = false
}

const openThread = (id) => router.push(`/chat/articles/${id}`)

// Date formatter (SSR-safe)
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})
const formatDateTime = (iso) => {
  try { return iso ? dateTimeFmt.format(new Date(iso)) : '' } catch { return '' }
}
</script>

