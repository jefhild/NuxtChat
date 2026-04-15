export function useLanguagePracticeSession() {
  const fetchActiveLanguagePracticeSession = async (partnerUserId) => {
    if (!partnerUserId) return null;
    const response = await $fetch("/api/language-practice/session", {
      query: { partnerUserId },
    });
    return response?.session || null;
  };

  const createOrResumeLanguagePracticeSession = async ({
    partner_user_id,
    source = "language_directory",
    ...rest
  }) => {
    const response = await $fetch("/api/language-practice/session", {
      method: "POST",
      body: {
        partner_user_id,
        source,
        ...rest,
      },
    });

    return response?.session || null;
  };

  const endLanguagePracticeSession = async (partner_user_id) => {
    const response = await $fetch("/api/language-practice/session/end", {
      method: "POST",
      body: {
        partner_user_id,
      },
    });

    return Number(response?.ended_count || 0);
  };

  return {
    fetchActiveLanguagePracticeSession,
    createOrResumeLanguagePracticeSession,
    endLanguagePracticeSession,
  };
}
