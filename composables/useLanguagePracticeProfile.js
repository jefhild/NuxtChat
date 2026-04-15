const DEFAULT_LANGUAGE_PRACTICE_PREFERENCE = Object.freeze({
  is_active: false,
  native_language_code: null,
  target_language_code: null,
  target_language_level: "unsure",
  correction_preference: "light_corrections",
  language_exchange_mode: "practice_only",
});

export function useLanguagePracticeProfile() {
  const getDefaultLanguagePracticePreference = () => ({
    ...DEFAULT_LANGUAGE_PRACTICE_PREFERENCE,
  });

  const fetchLanguagePracticePreference = async () => {
    const response = await $fetch("/api/profile/language-preferences");
    return {
      ...getDefaultLanguagePracticePreference(),
      ...(response?.preference || {}),
    };
  };

  const saveLanguagePracticePreference = async (preference) => {
    const response = await $fetch("/api/profile/language-preferences", {
      method: "PATCH",
      body: preference,
    });

    return {
      ...getDefaultLanguagePracticePreference(),
      ...(response?.preference || {}),
    };
  };

  return {
    getDefaultLanguagePracticePreference,
    fetchLanguagePracticePreference,
    saveLanguagePracticePreference,
  };
}
