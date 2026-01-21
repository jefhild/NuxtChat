export function useVoting() {
  const auth = useAuthStore()
  // accept either `authStatus` (your convention) or `status` (fallback)
  const authState = computed(() => auth.authStatus ?? auth.status ?? null)
  const canVote = computed(() =>
    ['authenticated', 'anon_authenticated'].includes(authState.value)
  )

  async function voteThread(threadId, value) {
    if (!canVote.value) throw new Error("Sign in to vote");
    return await $fetch("/api/votes/thread", {
      method: "POST",
      body: { threadId, value },
    });
  }

  async function voteMessage(messageId, value) {
    if (!canVote.value) throw new Error("Sign in to vote");
    return await $fetch("/api/votes/message", {
      method: "POST",
      body: { messageId, value },
    });
  }

  async function voteArticle(articleId, value) {
    if (!canVote.value) throw new Error("Sign in to vote");
    return await $fetch("/api/votes/article", {
      method: "POST",
      body: { articleId, value },
    });
  }

  return { canVote, voteThread, voteMessage, voteArticle };
}
