<template>
  <LoadingContainer />
</template>

<script setup>
definePageMeta({ ssr: false })

const router = useRouter()
const route = useRoute()
const localPath = useLocalePath()
const supabase = useSupabaseClient()

// sanitize ?next
const rawNext = route.query.next
const nextPath =
  typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/'

onMounted(async () => {
  // Facebook sometimes adds "#_=_"
  if (location.hash === '#_=_') {
    history.replaceState(null, '', location.pathname + location.search)
  }

  // With detectSessionInUrl: true, the SDK already exchanged the code when this page loaded
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    console.error('[callback] no user after auto-exchange', error)
    return router.replace(localPath('/signin?error=oauth'))
  }

  // Ensure a profile exists (idempotent)
  try { await $fetch('/api/profile/ensure', { method: 'POST' }) } catch (e) {
    console.warn('[callback] /api/profile/ensure failed (non-fatal)', e)
  }

  router.replace(localPath(nextPath))
})
</script>