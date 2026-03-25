export function useVoting() {
  const auth = useAuthStore()
  // accept either `authStatus` (your convention) or `status` (fallback)
  const authState = computed(() => auth.authStatus ?? auth.status ?? null)
  const canVote = computed(() =>
    ['authenticated', 'anon_authenticated'].includes(authState.value)
  )

  async function voteMessage(messageId, value) {
    if (!canVote.value) throw new Error("Sign in to vote");
    return await $fetch("/api/votes/message", {
      method: "POST",
      body: { messageId, value },
    });
  }

  return { canVote, voteMessage };
}
