<template>
  <LoadingContainer />
</template>

<script setup>
import { useOnboardingDraftStore } from '@/stores/onboardingDraftStore'

definePageMeta({ ssr: false })

const router = useRouter()
const route = useRoute()
const localPath = useLocalePath()
const supabase = useSupabaseClient()
const draft = useOnboardingDraftStore()

useHead({
  meta: [{ name: "robots", content: "noindex, nofollow" }],
})

// sanitize ?next
const rawNext = route.query.next
const nextPath =
  typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/chat?userslug=imchatty'

onMounted(async () => {
  // Facebook sometimes adds "#_=_"
  if (location.hash === '#_=_') {
    history.replaceState(null, '', location.pathname + location.search)
  }

  // PKCE magic links can race the auto-exchange; try exchange explicitly if needed
  const code = typeof route.query.code === 'string' ? route.query.code : null
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session && code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('[callback] exchangeCodeForSession failed', exchangeError)
    }
  }

  // With detectSessionInUrl: true, the SDK may have already exchanged the code
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    console.error('[callback] no user after auto-exchange', error)
    return router.replace(localPath('/signin?error=oauth'))
  }

  // Ensure a profile exists (idempotent)
  try { await $fetch('/api/profile/ensure', { method: 'POST' }) } catch (e) {
    console.warn('[callback] /api/profile/ensure failed (non-fatal)', e)
  }

  // If profile is incomplete, route to onboarding (skip consent).
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('displayname, age, gender_id, bio, country_id, state_id, city_id, avatar_url')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (!profileError && profile) {
      const needsOnboarding =
        !profile.displayname ||
        !profile.age ||
        !profile.gender_id ||
        !profile.bio

      if (needsOnboarding) {
        // Skip consent for OAuth users and jump straight into onboarding.
        draft.setConsent?.(true)
        draft.setStage?.('collecting')
        if (profile.displayname) draft.setField?.('displayName', profile.displayname)
        if (profile.age != null) draft.setField?.('age', profile.age)
        if (profile.gender_id != null) draft.setField?.('genderId', profile.gender_id)
        if (profile.bio) draft.setField?.('bio', profile.bio)
        if (profile.country_id != null) draft.setField?.('countryId', profile.country_id)
        if (profile.state_id != null) draft.setField?.('stateId', profile.state_id)
        if (profile.city_id != null) draft.setField?.('cityId', profile.city_id)

        return router.replace(localPath('/chat'))
      }
    }
  } catch (e) {
    console.warn('[callback] profile completeness check failed (non-fatal)', e)
  }

  router.replace(localPath(nextPath))
})
</script>
