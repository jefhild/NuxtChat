import { ref, computed } from "vue";
import { useDb } from "@/composables/useDB";

export function useUserProfile() {
  const profile = ref(null);
  const editableProfile = ref(null);
  const error = ref(null);
  const isEditable = ref(false);
  const isFormValid = ref(true);

  const {
    getUserProfileFunctionFromId,
    getUserProfileFromSlug,
    getUserProfileFromId,
    updateProfile,
    insertProfileFromObject,
    getProfileTranslations,
  } = useDb();

  const ensurePreferredLocale = async (baseProfile) => {
    if (!baseProfile?.user_id || baseProfile?.preferred_locale) {
      return baseProfile;
    }
    const { data, error: profileError } = await getUserProfileFromId(
      baseProfile.user_id
    );
    if (profileError) return baseProfile;
    if (!data?.preferred_locale) return baseProfile;
    return { ...baseProfile, preferred_locale: data.preferred_locale };
  };

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      error.value = "User ID is required";
      return null;
    }

    const data = await getUserProfileFunctionFromId(userId);
    if (data && data.length > 0) {
      let baseProfile = data[0];
      baseProfile = await ensurePreferredLocale(baseProfile);
      const { data: translations } = await getProfileTranslations(
        baseProfile?.user_id
      );
      profile.value = {
        ...baseProfile,
        profile_translations: translations || [],
      };
      editableProfile.value = { ...profile.value };
      return profile.value;
    } else {
      error.value = "Error fetching user profile";
      return null;
    }
  };

  const fetchUserProfileFromSlug = async (slug) => {
    if (!slug) {
      error.value = "Slug is required";
      return null;
    }

    const isUuid = (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(value)
      );

    const data = await getUserProfileFromSlug(slug);
    if (process.dev) {
      const preview = Array.isArray(data) ? data[0] : data;
      console.log("[useUserProfile] slug fetch", {
        slug,
        user_id: preview?.user_id,
        avatar_url: preview?.avatar_url,
      });
    }
    if ((!data || data.length === 0) && isUuid(slug)) {
      return await fetchUserProfile(slug);
    }
    if (data && data.length > 0) {
      let baseProfile = data[0];
      baseProfile = await ensurePreferredLocale(baseProfile);
      const { data: translations } = await getProfileTranslations(
        baseProfile?.user_id
      );
      profile.value = {
        ...baseProfile,
        profile_translations: translations || [],
      };
      editableProfile.value = { ...profile.value };
      return profile.value;
    } else {
      error.value = "Error fetching user profile";
      return null;
    }
  };

  // Minimal create used by onboarding
  const createMinimalProfile = async ({
    user_id,
    displayname,
    age,
    gender_id,
    bio,
    provider = "anonymous",
  }) => {
    error.value = null;
    const { error: err } = await insertProfileFromObject({
      user_id,
      displayname,
      age,
      gender_id,
      bio,
      provider,
    });
    if (err) {
      // allow duplicate-profile case to pass (profile already exists)
      const isDuplicate =
        err.code === "23505" ||
        String(err.message || "").includes("duplicate key");
      if (!isDuplicate) {
        error.value = err.message;
        console.error("[useUserProfile] createMinimalProfile error:", err);
        return null;
      }
    }
    // fetch fresh profile
    return await fetchUserProfile(user_id);
  };

  const startEditing = () => {
    editableProfile.value = { ...profile.value };
    isEditable.value = true;
  };

  const cancelEditing = () => {
    editableProfile.value = { ...profile.value };
    isEditable.value = false;
    isFormValid.value = true;
  };

  const saveChanges = async () => {
    if (!editableProfile.value) return;

    try {
      const prev = profile.value || {};
      const next = editableProfile.value || {};
      const nameChanged = prev.displayname !== next.displayname;
      const bioChanged = prev.bio !== next.bio;
      const taglineChanged = prev.tagline !== next.tagline;
      await updateProfile(
        editableProfile.value.user_id,
        editableProfile.value.displayname,
        editableProfile.value.tagline,
        editableProfile.value.gender_id,
        editableProfile.value.status_id,
        editableProfile.value.age,
        editableProfile.value.bio,
        editableProfile.value.country_id,
        editableProfile.value.state_id,
        editableProfile.value.city_id,
        editableProfile.value.avatar_url,
        editableProfile.value.site_url,
        editableProfile.value.preferred_locale,
        editableProfile.value.is_private
      );

      profile.value = { ...editableProfile.value };
      isEditable.value = false;

      if ((nameChanged || bioChanged || taglineChanged) && next.user_id) {
        try {
          await $fetch("/api/profile/translate", {
            method: "POST",
            body: {
              userId: next.user_id,
              displayname: next.displayname,
              bio: next.bio,
              tagline: next.tagline || null,
              sourceLocale: next.preferred_locale || "en",
              targetLocales: ["en", "fr", "ru", "zh"].filter(
                (locale) => locale !== (next.preferred_locale || "en")
              ),
            },
          });
        } catch (err) {
          console.warn("[profile] auto-translate failed:", err);
        }
      }
    } catch (err) {
      error.value = err.message;
      console.error("Error saving profile changes:", err);
    }
  };

  return {
    profile,
    editableProfile,
    isEditable,
    isFormValid,
    error,
    fetchUserProfile,
    fetchUserProfileFromSlug,
    createMinimalProfile,
    startEditing,
    cancelEditing,
    saveChanges,
  };
}
