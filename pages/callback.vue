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
  let ensureResult = null
  try { ensureResult = await $fetch('/api/profile/ensure', { method: 'POST' }) } catch (e) {
    console.warn('[callback] /api/profile/ensure failed (non-fatal)', e)
  }

  // If profile is incomplete, route to Settings for completion.
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('age, gender_id, bio, country_id, avatar_url')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (!profileError && profile) {
      const created = !!ensureResult?.created
      const needsGender = profile.gender_id == null || (created && profile.gender_id === 3)
      const needsAge = profile.age == null
      const needsBio = !profile.bio
      const needsLocation = profile.country_id == null

      if (needsGender || needsAge || needsBio || needsLocation) {
        const completionPath = `/settings?complete=1&next=${encodeURIComponent(nextPath)}`
        return router.replace(localPath(completionPath))
      }
    }
  } catch (e) {
    console.warn('[callback] profile completeness check failed (non-fatal)', e)
  }

  router.replace(localPath(nextPath))
})
</script>
