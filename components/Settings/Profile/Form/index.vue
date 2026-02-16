<template>
  <v-card
    class="mx-auto mb-3 settings-form-root"
    variant="flat"
    elevation="0"
    v-if="authStateUI.showForm"
  >
    <SettingsProfileHeader
      v-if="editableProfile?.user_id"
      :userProfile="editableProfile"
      :avatar="localAvatar"
      :isEditable="isEditable"
      :randomLoading="randomAvatarLoading"
      :uploadLoading="avatarUploadLoading"
      :errorMessage="avatarError"
      :displayKey="displayKey"
      :refreshLookingForMenu="refreshLookingForMenu"
      :showPhotoLibrary="showPhotoLibrary"
      :photoLibraryDisabled="isPhotoLibraryDisabled"
      :photoLibraryPhotos="photoLibraryPreview"
      @openPhotoLibrary="emit('openPhotoLibrary')"
      @openLinkEmail="openLinkEmailDialog"
      @refreshLookingForDisplay="displayKey++"
      @updateAvatarUrl="updateAvatarUrl"
      @randomAvatar="pickRandomAvatar"
      @uploadAvatar="uploadAvatar"
    />
    <v-row v-if="shouldOfferEmailLinkPrompt" class="ma-0 pa-0" dense>
      <v-col cols="12">
        <v-alert variant="tonal" type="info" density="comfortable">
          <div
            class="d-flex flex-column flex-sm-row align-center justify-space-between"
          >
            <span class="text-body-2">
              {{ t("components.profile-email-link.prompt") }}
            </span>
            <span
              class="text-link-btn mt-2 mt-sm-0"
              role="button"
              tabindex="0"
              @click="openLinkEmailDialog"
              @keydown.enter.prevent="openLinkEmailDialog"
            >
              {{ t("components.profile-email-link.cta") }}
            </span>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <SettingsProfileFormContent
      :userProfile="editableProfile"
      :isEditable="isEditable"
      :isSiteEditable="isSiteEditable"
      :statuses="statuses"
      :genders="genders"
      :locales="supportedLocales"
      :presenceStatus="presenceStatus"
      :presenceDisabled="presenceDisabled"
      :presenceLoading="presenceUpdating"
      :locationProps="locationProps"
      :isMarkedForDeletion="isMarkedForDeletion"
      :deleteBusy="deleteBusy"
      :showEmailLinkPrompt="shouldOfferEmailLinkPrompt"
      :showAiBioButton="showAiBioButton"
      :aiBioDisabled="aiBioDisabled"
      :aiBioLoading="aiBioLoading"
      :aiBioRemaining="aiBioRemaining"
      :bioMinLength="MIN_BIO_LENGTH"
      :bioErrorMessage="bioErrorMessage"
      :tagLineErrorMessage="taglineError"
      @update:country="onUpdateCountry"
      @update:state="onUpdateState"
      @update:city="onUpdateCity"
      @update:displayName="(val) => (editableProfile.displayname = val)"
      @update:tagLine="(val) => (editableProfile.tagline = val)"
      @update:siteUrl="(val) => (editableProfile.site_url = val)"
      @update:statusId="(val) => (editableProfile.status_id = val)"
      @update:age="(val) => (editableProfile.age = val)"
      @update:genderId="(val) => (editableProfile.gender_id = val)"
      @update:preferredLocale="(val) => (editableProfile.preferred_locale = val)"
      @update:presenceStatus="onPresenceStatusChange"
      @update:bio="(val) => (editableProfile.bio = val)"
      @save="saveChanges"
      @startEdit="startEditing"
      @cancelEdit="cancelEditing"
      @toggleDeletionMark="toggleDeletionMark"
      @linkAnonEmail="openLinkEmailDialog"
      @openAiBio="openAiBioDialog"
    />

    <v-dialog
      v-model="linkEmailDialogVisible"
      max-width="480"
      :retain-focus="false"
    >
      <v-card>
        <v-card-title class="text-h6">
          {{ t("components.profile-email-link.dialog-title") }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            {{ t("components.profile-email-link.dialog-description") }}
          </p>

          <v-text-field
            v-model="linkEmailForm.email"
            type="email"
            :label="t('components.profile-email-link.email-label')"
            autocomplete="email"
            variant="outlined"
          />
          <v-text-field
            v-model="linkEmailForm.confirmEmail"
            type="email"
            :label="t('components.profile-email-link.confirm-label')"
            autocomplete="email"
            variant="outlined"
          />

          <v-alert
            v-if="linkEmailError"
            type="error"
            variant="tonal"
            class="mt-2"
          >
            {{ linkEmailError }}
          </v-alert>
          <v-alert
            v-else-if="linkEmailSuccess"
            type="success"
            variant="tonal"
            class="mt-2"
          >
            {{ linkEmailSuccess }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeLinkEmailDialog">
            {{ t("components.profile-email-link.cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="linkEmailSubmitting"
            @click="submitLinkEmail"
          >
            {{ t("components.profile-email-link.submit") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="aiBioDialogVisible" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Generate a bio</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Enter at least 4 words that describe you. The AI will craft a short
            bio you can edit.
          </p>
          <v-textarea
            v-model="aiBioKeywords"
            rows="3"
            variant="outlined"
            label="Keywords"
            placeholder="curious, optimistic, hiking, espresso"
          />
          <div class="text-caption text-medium-emphasis">
            Remaining uses: {{ aiBioRemaining }}
          </div>
          <v-alert
            v-if="aiBioError"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ aiBioError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeAiBioDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="aiBioLoading"
            :disabled="aiBioDisabled"
            @click="generateAiBio"
          >
            Generate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useDb } from "@/composables/useDB";
import { useLocationManager } from "@/composables/useLocationManager";
import { useGeoLocationDefaults } from "@/composables/useGeoLocationDefaults";

const props = defineProps({
  userProfile: {
    type: Object,
    required: true,
  },
  displayKey: {
    type: Number,
    default: 0,
  },
  adminMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["openPhotoLibrary"]);

const {
  getStatuses,
  getGenders,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  updateProfile,
  getPresenceStatus,
  setPresenceStatus,
  hasEmail,
  updateUserEmail,
  markUserForDeletion,
  unmarkUserForDeletion,
} = useDb();

const {
  countries,
  states,
  cities,
  selectedCountry,
  selectedState,
  selectedCity,
  fetchCountries,
  fetchStates,
  fetchCities,
  locationProps,
} = useLocationManager(
  props.userProfile?.country_id,
  props.userProfile?.state_id,
  props.userProfile?.city_id
);

const statuses = ref([]);
const genders = ref([]);
const photoLibraryPreview = ref([]);
const presenceStatus = ref("auto");
const presenceUpdating = ref(false);

const editableProfile = ref({ ...props.userProfile });
const appliedGeoDefaults = ref(false);

const { getDefaults } = useGeoLocationDefaults();

const supportedLocales = computed(() => [
  { code: "en", label: t("components.profile-language.options.en") },
  { code: "fr", label: t("components.profile-language.options.fr") },
  { code: "ru", label: t("components.profile-language.options.ru") },
  { code: "zh", label: t("components.profile-language.options.zh") },
]);

const ensurePreferredLocale = () => {
  if (!editableProfile.value) return;
  if (!editableProfile.value.preferred_locale) {
    editableProfile.value.preferred_locale = "en";
  }
};

ensurePreferredLocale();


// Watch for updates from parent and reset the local copy
watch(
  () => props.userProfile,
  (newProfile) => {
    editableProfile.value = { ...newProfile };
    localAvatar.value = buildAvatarDisplayUrl(newProfile?.avatar_url);
    avatarError.value = "";
    ensurePreferredLocale();
    syncEditableState();
    loadPhotoLibraryPreview(newProfile?.user_id);
  }
);

watch(
  () => editableProfile.value?.tagline,
  (val) => {
    if (taglineError.value && String(val || "").trim()) {
      taglineError.value = "";
    }
  }
);

const displayKey = ref(0);
const refreshLookingForMenu = ref(false);

const authStore = useAuthStore();
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const linkEmailDialogVisible = ref(false);
const linkEmailSubmitting = ref(false);
const linkEmailError = ref("");
const linkEmailSuccess = ref("");
const linkEmailForm = reactive({
  email: "",
  confirmEmail: "",
});
const hasLinkedEmail = ref(authStore.authStatus !== "anon_authenticated");
const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_AI_BIO_USES = 3;
const MIN_BIO_LENGTH = 45;
const bioTouched = ref(false);
const aiBioDialogVisible = ref(false);
const aiBioKeywords = ref("");
const aiBioError = ref("");
const aiBioLoading = ref(false);
const aiBioUses = ref(0);
const randomAvatarLoading = ref(false);
const avatarUploadLoading = ref(false);
const avatarError = ref("");
const taglineError = ref("");
const isEditable = ref(false); // default to false for safety

const completionMode = computed(() => {
  return route.query.complete === "1" || route.query.complete === "true";
});

const completionNext = computed(() => {
  const raw = route.query.next;
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
});

const completionReady = computed(() => {
  if (!completionMode.value) return true;
  const profile = editableProfile.value || {};
  const hasGender = profile.gender_id !== null && profile.gender_id !== undefined;
  const hasLocation = profile.country_id !== null && profile.country_id !== undefined;
  const hasAvatar = !!profile.avatar_url;
  return hasGender && hasLocation && hasAvatar;
});

const aiBioStorageKey = computed(() => {
  const id = editableProfile.value?.user_id || authStore.user?.id || "anon";
  return `aiBioUses:${id}`;
});

const aiBioRemaining = computed(() => {
  return Math.max(0, MAX_AI_BIO_USES - aiBioUses.value);
});

const aiBioDisabled = computed(() => {
  return aiBioRemaining.value <= 0;
});

const showAiBioButton = computed(() => {
  return isEditable.value;
});

const isSiteEditable = computed(() => {
  if (!isEditable.value) return false;
  return props.adminMode || authStore.authStatus === "authenticated";
});

const isPhotoLibraryDisabled = computed(() => {
  return authStore.authStatus === "anon_authenticated";
});

const showPhotoLibrary = computed(() => {
  return (
    props.adminMode ||
    authStore.authStatus === "authenticated" ||
    authStore.authStatus === "anon_authenticated"
  );
});

const presenceDisabled = computed(() => {
  if (!editableProfile.value?.user_id) return true;
  if (!isEditable.value) return true;
  if (props.adminMode) return true;
  return !["anon_authenticated", "authenticated"].includes(authStore.authStatus);
});

const normalizePresenceValue = (value) => {
  if (value === "away" || value === "offline") return value;
  return "auto";
};

const loadPresenceStatus = async (userId) => {
  if (!userId || presenceDisabled.value) return;
  try {
    const { data } = await getPresenceStatus(userId);
    presenceStatus.value = normalizePresenceValue(data?.manual_status);
  } catch (err) {
    console.warn("[settings] presence load failed:", err);
  }
};

const onPresenceStatusChange = async (val) => {
  const next = normalizePresenceValue(val);
  presenceStatus.value = next;
  const userId = editableProfile.value?.user_id;
  if (!userId || presenceDisabled.value) return;
  presenceUpdating.value = true;
  try {
    await setPresenceStatus(userId, next === "auto" ? null : next);
  } finally {
    presenceUpdating.value = false;
  }
};

const loadPhotoLibraryPreview = async (
  userId = editableProfile.value?.user_id
) => {
  if (!showPhotoLibrary.value || isPhotoLibraryDisabled.value) {
    photoLibraryPreview.value = [];
    return;
  }

  try {
    let result;
    if (props.adminMode) {
      if (!userId) {
        photoLibraryPreview.value = [];
        return;
      }
      result = await $fetch("/api/admin/profile-photos/list", {
        query: { user_id: userId, limit: 6 },
      });
    } else {
      result = await $fetch("/api/profile/photos");
    }
    const items = Array.isArray(result?.photos) ? result.photos : [];
    photoLibraryPreview.value = items.slice(0, 6);
  } catch (err) {
    console.warn("[settings] load photo library preview failed:", err);
    photoLibraryPreview.value = [];
  }
};

const loadAiBioUses = () => {
  if (!import.meta.client) return;
  const key = aiBioStorageKey.value;
  try {
    const raw = localStorage.getItem(key);
    aiBioUses.value = raw ? Number(raw) || 0 : 0;
  } catch {
    aiBioUses.value = 0;
  }
};

const saveAiBioUses = () => {
  if (!import.meta.client) return;
  const key = aiBioStorageKey.value;
  try {
    localStorage.setItem(key, String(aiBioUses.value));
  } catch {}
};

const openAiBioDialog = () => {
  if (aiBioDisabled.value || !isEditable.value) return;
  aiBioError.value = "";
  aiBioKeywords.value = "";
  aiBioDialogVisible.value = true;
};

const closeAiBioDialog = () => {
  aiBioDialogVisible.value = false;
};

const parseKeywords = (input) => {
  return String(input || "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const resolveGenderLabel = () => {
  const genderId = editableProfile.value?.gender_id;
  const match = genders.value?.find((g) => g.id === genderId)?.name;
  if (match) return match;
  if (genderId === 1) return "Male";
  if (genderId === 2) return "Female";
  return "Other";
};

const generateAiBio = async () => {
  if (aiBioLoading.value || aiBioDisabled.value) return;
  aiBioError.value = "";
  const words = parseKeywords(aiBioKeywords.value);
  if (words.length < 4) {
    aiBioError.value = "Please enter at least 4 words that describe you.";
    return;
  }

  aiBioLoading.value = true;
  try {
    const response = await $fetch("/api/aiGenerateBio", {
      method: "POST",
      body: {
        displayname: editableProfile.value?.displayname ?? "",
        age: editableProfile.value?.age ?? "",
        gender: resolveGenderLabel(),
        keywords: words.slice(0, 8),
        locale: locale.value,
      },
    });
    if (response?.bio) {
      editableProfile.value.bio = response.bio;
      bioTouched.value = true;
      aiBioUses.value += 1;
      saveAiBioUses();
      aiBioDialogVisible.value = false;
    } else {
      aiBioError.value = "Could not generate a bio. Please try again.";
    }
  } catch (err) {
    console.error("[settings] ai bio failed:", err);
    aiBioError.value = "Could not generate a bio. Please try again.";
  } finally {
    aiBioLoading.value = false;
  }
};

const cancelEditing = () => {
  editableProfile.value = { ...props.userProfile };
  syncEditableState();
  avatarError.value = "";
};

const startEditing = () => {
  isEditable.value = true;
};

const saveChanges = async () => {
  if (!editableProfile.value?.user_id) return;

  saving.value = true;
  const prev = props.userProfile || {};
  const next = editableProfile.value || {};
  const nameChanged = prev.displayname !== next.displayname;
  const bioChanged = prev.bio !== next.bio;
  const taglineChanged = prev.tagline !== next.tagline;
  bioTouched.value = true;
  if (bioTooShort.value) {
    saving.value = false;
    return;
  }
  if (!String(editableProfile.value?.tagline || "").trim()) {
    taglineError.value = t("components.profile-tagline.required");
    saving.value = false;
    return;
  }
  taglineError.value = "";
  if (!editableProfile.value?.avatar_url) {
    avatarError.value = "Please add a profile photo before saving.";
    saving.value = false;
    return;
  }

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
      editableProfile.value.preferred_locale,
      editableProfile.value.is_private
    );
    console.info("Profile updated successfully.");
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
        console.warn("[settings] auto-translate failed:", err);
      }
    }
    if (completionMode.value && completionNext.value && completionReady.value) {
      router.push(localPath(completionNext.value));
    }
  } catch (err) {
    console.error("Error saving profile changes:", err);
  } finally {
    saving.value = false;
  }
};

const authStateUI = computed(() => {
  switch (authStore.authStatus) {
    case "unauthenticated":
      return {
        editable: false,
        showForm: false,
        showLoader: false,
        showError: true,
      };
    case "guest":
      return {
        editable: true,
        showForm: false,
        showLoader: false,
        showError: false,
      };
    case "onboarding":
      return {
        editable: true,
        showForm: true,
        showLoader: false,
        showError: false,
      };
    case "anon_authenticated":
      return {
        editable: false,
        showForm: true,
        showLoader: false,
        showError: false,
      };
    case "authenticated":
      return {
        editable: true,
        showForm: true,
        showLoader: false,
        showError: false,
      };
    default:
      return {
        editable: false,
        showForm: false,
        showLoader: true,
        showError: false,
      };
  }
});

const shouldOfferEmailLinkPrompt = computed(() => {
  return (
    !props.adminMode &&
    authStore.authStatus === "anon_authenticated" &&
    authStateUI.value.showForm &&
    !hasLinkedEmail.value
  );
});

const refreshLinkedEmailState = async () => {
  if (!import.meta.client) return;
  if (authStore.authStatus !== "anon_authenticated") {
    hasLinkedEmail.value = true;
    return;
  }

  try {
    hasLinkedEmail.value = await hasEmail(authStore.user?.id);
  } catch (err) {
    console.warn("Error checking linked email status:", err);
    hasLinkedEmail.value = false;
  }
};

const resetLinkEmailForm = () => {
  const existingEmail = authStore.user?.email ?? "";
  linkEmailForm.email = existingEmail;
  linkEmailForm.confirmEmail = existingEmail;
  linkEmailError.value = "";
  linkEmailSuccess.value = "";
};

const openLinkEmailDialog = () => {
  resetLinkEmailForm();
  linkEmailDialogVisible.value = true;
};

const closeLinkEmailDialog = () => {
  linkEmailDialogVisible.value = false;
};

const submitLinkEmail = async () => {
  linkEmailError.value = "";
  linkEmailSuccess.value = "";

  const email = linkEmailForm.email.trim().toLowerCase();
  const confirm = linkEmailForm.confirmEmail.trim().toLowerCase();

  if (!emailPattern.test(email)) {
    linkEmailError.value = t("components.profile-email-link.invalid");
    return;
  }

  if (email !== confirm) {
    linkEmailError.value = t("components.profile-email-link.mismatch");
    return;
  }

  linkEmailSubmitting.value = true;

  try {
    const { error } = await updateUserEmail(email);
    if (error) {
      throw error;
    }
    linkEmailSuccess.value = t("components.profile-email-link.success");
    await authStore.checkAuth();
    await refreshLinkedEmailState();
    linkEmailDialogVisible.value = false;
  } catch (err) {
    console.error("Error linking email:", err);
    linkEmailError.value =
      err?.message || t("components.profile-email-link.generic-error");
  } finally {
    linkEmailSubmitting.value = false;
  }
};

const linkEmailQueryOpened = ref(false);
watch(
  () => route.query.linkEmail,
  (val) => {
    if (!import.meta.client || linkEmailQueryOpened.value) return;
    if (val === "1" || val === "true") {
      openLinkEmailDialog();
      linkEmailQueryOpened.value = true;
    }
  },
  { immediate: true }
);

watch(
  () => authStore.authStatus,
  (status) => {
    if (!import.meta.client) return;
    if (status === "anon_authenticated") {
      refreshLinkedEmailState();
    } else {
      hasLinkedEmail.value = true;
      linkEmailDialogVisible.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => [editableProfile.value?.user_id, presenceDisabled.value],
  ([userId, disabled]) => {
    if (!disabled) loadPresenceStatus(userId);
  },
  { immediate: true }
);

watch(
  () => aiBioStorageKey.value,
  () => {
    loadAiBioUses();
  },
  { immediate: true }
);

const needsProfileCompletion = computed(() => {
  const profile = editableProfile.value || {};
  return !profile.avatar_url;
});
const syncEditableState = () => {
  if (needsProfileCompletion.value) {
    isEditable.value = true;
    return;
  }
  isEditable.value = authStateUI.value.editable;
};
const deleteBusy = ref(false);

const bioText = computed(() => {
  return String(editableProfile.value?.bio || "").trim();
});

const bioTooShort = computed(() => {
  return bioText.value.length < MIN_BIO_LENGTH;
});

const bioErrorMessage = computed(() => {
  if (!bioTouched.value) return "";
  if (bioTooShort.value) {
    return `Bio must be at least ${MIN_BIO_LENGTH} characters.`;
  }
  return "";
});

const isMarkedForDeletion = computed(() => {
  return !!editableProfile.value?.marked_for_deletion_at;
});

const onUpdateCountry = (val) => {
  selectedCountry.value = val;
  editableProfile.value.country_id = val;
};

const onUpdateState = (val) => {
  selectedState.value = val;
  editableProfile.value.state_id = val;
};

const onUpdateCity = (val) => {
  selectedCity.value = val;
  editableProfile.value.city_id = val;
};


const updateDeletionState = (markedAt) => {
  if (editableProfile.value) {
    editableProfile.value.marked_for_deletion_at = markedAt;
  }

  if (!props.adminMode && authStore.userProfile) {
    authStore.userProfile.marked_for_deletion_at = markedAt;
  }
};

const toggleDeletionMark = async () => {
  const userId = editableProfile.value?.user_id;
  if (!userId || deleteBusy.value) return;

  deleteBusy.value = true;
  try {
    if (isMarkedForDeletion.value) {
      await unmarkUserForDeletion(userId);
      updateDeletionState(null);
    } else {
      const markedAt = new Date().toISOString();
      await markUserForDeletion(userId);
      updateDeletionState(markedAt);
    }
  } catch (err) {
    console.error("Error updating deletion status:", err);
  } finally {
    deleteBusy.value = false;
  }
};


const stripAvatarQuery = (url) => {
  if (!url) return "";
  return String(url).split("?")[0];
};

const buildAvatarDisplayUrl = (url) => {
  const clean = stripAvatarQuery(url);
  if (!clean) return "";
  return `${clean}?v=${Date.now()}`;
};

const localAvatar = ref(buildAvatarDisplayUrl(props.userProfile.avatar_url));

const updateAvatarUrl = (newUrl) => {
  const cleanUrl = stripAvatarQuery(newUrl);
  localAvatar.value = buildAvatarDisplayUrl(cleanUrl);
  avatarError.value = "";

  if (editableProfile.value) {
    editableProfile.value.avatar_url = cleanUrl;
  }

  if (!props.adminMode && authStore.userProfile) {
    authStore.userProfile.avatar_url = cleanUrl;
  }
};

const buildRandomAvatarPayload = () => ({
  userId: editableProfile.value?.user_id,
  genderId: editableProfile.value?.gender_id ?? null,
});

const pickRandomAvatar = async () => {
  if (!editableProfile.value?.user_id) return false;
  if (randomAvatarLoading.value) return false;

  randomAvatarLoading.value = true;
  avatarError.value = "";
  let success = false;

  try {
    const result = await $fetch("/api/profile/avatar-random", {
      method: "POST",
      body: buildRandomAvatarPayload(),
    });
    if (result?.avatarUrl) {
      updateAvatarUrl(result.avatarUrl);
      success = true;
    } else {
      avatarError.value = "Could not pick a photo. Please try again.";
    }
  } catch (err) {
    console.error("[settings] random avatar failed:", err);
    avatarError.value = "Could not pick a photo. Please try again.";
  } finally {
    randomAvatarLoading.value = false;
  }

  return success;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const uploadAvatar = async (file) => {
  if (!editableProfile.value?.user_id || !file) return;
  if (avatarUploadLoading.value) return;

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    avatarError.value = "Please upload an image under 2MB.";
    return;
  }

  avatarUploadLoading.value = true;
  avatarError.value = "";

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const result = await $fetch("/api/profile/avatar-upload", {
      method: "POST",
      body: {
        userId: editableProfile.value.user_id,
        dataUrl,
      },
    });
    if (result?.avatarUrl) {
      updateAvatarUrl(result.avatarUrl);
    } else {
      avatarError.value = "Could not upload that image. Please try again.";
    }
  } catch (err) {
    console.error("[settings] avatar upload failed:", err);
    avatarError.value = "Could not upload that image. Please try again.";
  } finally {
    avatarUploadLoading.value = false;
  }
};

const autoAvatarStorageKey = computed(() => {
  const id = editableProfile.value?.user_id || authStore.user?.id || "anon";
  return `autoAvatarGenerated:${id}`;
});

const maybeAutoSelectAvatar = async () => {
  if (!import.meta.client) return;
  if (editableProfile.value?.avatar_url) return;
  if (!editableProfile.value?.user_id) return;
  const key = autoAvatarStorageKey.value;
  if (localStorage.getItem(key)) return;
  const success = await pickRandomAvatar();
  if (success) {
    try {
      localStorage.setItem(key, "1");
    } catch {}
  }
};

const saving = ref(false);


onMounted(async () => {
  try {
    statuses.value = await getStatuses();
    genders.value = await getGenders();
    countries.value = await getCountries();
    syncEditableState();
    if (authStore.authStatus === "anon_authenticated") {
      await refreshLinkedEmailState();
    }
    await loadPhotoLibraryPreview();




    // 🔹 Prefill location only if missing and not already applied
    if (!editableProfile.value?.country_id && !appliedGeoDefaults.value) {
      try {
        const { countryId, stateId, cityId /*, ip*/ } = await getDefaults();
        // Only set values we actually resolved; never overwrite existing
        if (countryId) {
          selectedCountry.value = countryId;
          editableProfile.value.country_id = countryId;
          // If we have a state for that country, set it
          if (stateId) {
            selectedState.value = stateId;
            editableProfile.value.state_id = stateId;
            // If we have a city for that state, set it
            if (cityId) {
              selectedCity.value = cityId;
              editableProfile.value.city_id = cityId;
            }
          }
          appliedGeoDefaults.value = true;
        }
      } catch (e) {
        console.warn("[geo-defaults] failed to prefill location", e);
      }
    }
    await maybeAutoSelectAvatar();
  } catch (err) {
    console.error("Error loading profile reference data:", err);
  }

  // console.log("Initial userProfile", props.userProfile);
  // console.log("Selected Country:", selectedCountry.value);
  // console.log("Selected State:", selectedState.value);
  // console.log("Selected City:", selectedCity.value);
  // console.log("LocationProps:", locationProps.value);
});
</script>

<style scoped>
.position-relative {
  position: relative;
}

.online-status-overlay {
  position: absolute;
  top: 10px; /* Adjust as needed */
  right: 10px; /* Adjust as needed */
  background-color: white; /* Optional: Add a background color to make it stand out */
  border-radius: 50%; /* Optional: Adjust for a round status indicator */
  padding: 5px; /* Optional: Adjust padding as needed */
}

.text-link-btn {
  padding: 0;
  min-width: 0;
  background: none;
  border: none;
  box-shadow: none;
  color: #007bff; /* You can adjust this color to match your link color */
  cursor: pointer;
  text-decoration: none;
  font-size: inherit; /* Ensure the font size matches surrounding text */
  text-transform: none;
}

.text-link-btn:hover {
  text-decoration: underline;
}

.settings-form-root {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>
