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
    updateProfile,
    insertProfileFromObject,
  } = useDb();

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      error.value = "User ID is required";
      return null;
    }

    const data = await getUserProfileFunctionFromId(userId);
    if (data && data.length > 0) {
      profile.value = data[0];
      editableProfile.value = { ...data[0] };
      return data[0];
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

    const data = await getUserProfileFromSlug(slug);
    if (data && data.length > 0) {
      profile.value = data[0];
      editableProfile.value = { ...data[0] };
      return data[0];
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
        editableProfile.value.preferred_locale
      );

      profile.value = { ...editableProfile.value };
      isEditable.value = false;
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
