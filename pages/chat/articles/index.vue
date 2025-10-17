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
console.log('list error:', list.value)

const topics = computed(() => list.value || [])
// const firstId = computed(() => list.value?.[0]?.id ?? null)
const firstSlug = computed(() => list.value?.[0]?.slug ?? null)
console.log('First slug:', firstSlug.value);

// Redirect policy (SSR 302 on server, replace on client)
const redirecting = ref(false)
 // SSR: do the 302 when data is already available server-side
 if (import.meta.server && firstSlug.value) {
   redirecting.value = true
   await navigateTo(`/chat/articles/${firstSlug.value}`, { replace: true, redirectCode: 302 })
 }
 // Client: watch for data becoming available and then navigate
 if (import.meta.client) {
   watch(firstSlug, (s) => {
     if (!s) return
     if (route.params?.slug === s) return // avoid self-redirect if already on slug route
     redirecting.value = true
     navigateTo(`/chat/articles/${s}`, { replace: true })
   }, { immediate: true })
 }

// const openThread = (id) => router.push(`/chat/articles/${id}`)
const openThread = (slug) => router.push(`/chat/articles/${slug}`)

// Date formatter (SSR-safe)
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})
const formatDateTime = (iso) => {
  try { return iso ? dateTimeFmt.format(new Date(iso)) : '' } catch { return '' }
}
</script>

