<template>
  <section
    v-if="authStateUI.showForm"
    class="mb-3 w-full settings-form-root"
  >
    <SettingsProfileHeader
      v-if="editableProfile?.user_id"
      :userProfile="editableProfile"
      :avatar="localAvatar"
      :avatarDecorationUrl="editableProfile?.avatar_decoration_url || ''"
      :showDecorationControl="showDecorationControl"
      :decorationLocked="decorationLocked"
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
      @openDecorationPicker="openDecorationPicker"
      @refreshLookingForDisplay="displayKey++"
      @updateAvatarUrl="updateAvatarUrl"
      @randomAvatar="pickRandomAvatar"
      @uploadAvatar="uploadAvatar"
    />
    <div v-if="shouldOfferEmailLinkPrompt" class="mt-0">
      <div class="settings-inline-alert settings-inline-alert--info">
        <div
          class="flex flex-col items-center justify-between gap-2 sm:flex-row"
        >
          <span class="text-body-2">
            {{ t("components.profile-email-link.prompt") }}
          </span>
          <span
            class="text-link-btn sm:mt-0"
            role="button"
            tabindex="0"
            @click="openLinkEmailDialog"
            @keydown.enter.prevent="openLinkEmailDialog"
          >
            {{ t("components.profile-email-link.cta") }}
          </span>
        </div>
      </div>
    </div>

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
      :showTranslateButton="props.adminMode"
      :translateLoading="translateProfileLoading"
      :translateStatus="translateProfileStatus"
      :translateError="translateProfileError"
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
      @translateProfile="manuallyTranslateProfile"
    />

    <Teleport to="body">
      <Transition name="settings-modal-fade">
        <div
          v-if="linkEmailDialogVisible"
          class="settings-modal"
          role="presentation"
        >
          <button
            type="button"
            class="settings-modal__scrim"
            aria-label="Close link email dialog"
            @click="closeLinkEmailDialog"
          />
          <div class="settings-modal__panel settings-modal__panel--sm">
            <h2 class="settings-modal__title">
              {{ t("components.profile-email-link.dialog-title") }}
            </h2>
            <p class="settings-modal__body">
              {{ t("components.profile-email-link.dialog-description") }}
            </p>

            <label class="settings-modal__field">
              <span>{{ t("components.profile-email-link.email-label") }}</span>
              <input
                v-model="linkEmailForm.email"
                type="email"
                autocomplete="email"
                class="settings-modal__input"
              >
            </label>
            <label class="settings-modal__field">
              <span>{{ t("components.profile-email-link.confirm-label") }}</span>
              <input
                v-model="linkEmailForm.confirmEmail"
                type="email"
                autocomplete="email"
                class="settings-modal__input"
              >
            </label>

            <div
              v-if="linkEmailError"
              class="settings-inline-alert settings-inline-alert--error mt-2"
            >
              {{ linkEmailError }}
            </div>
            <div
              v-else-if="linkEmailSuccess"
              class="settings-inline-alert settings-inline-alert--success mt-2"
            >
              {{ linkEmailSuccess }}
            </div>

            <div class="settings-modal__actions">
              <button
                type="button"
                class="settings-modal__btn"
                @click="closeLinkEmailDialog"
              >
                {{ t("components.profile-email-link.cancel") }}
              </button>
              <button
                type="button"
                class="settings-modal__btn settings-modal__btn--primary"
                :disabled="linkEmailSubmitting"
                @click="submitLinkEmail"
              >
                <span v-if="linkEmailSubmitting" class="settings-modal__spinner" aria-hidden="true" />
                {{ t("components.profile-email-link.submit") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="settings-modal-fade">
        <div
          v-if="decorationDialogVisible"
          class="settings-modal"
          role="presentation"
        >
          <button
            type="button"
            class="settings-modal__scrim"
            aria-label="Close decoration dialog"
            @click="decorationDialogVisible = false"
          />
          <div class="settings-modal__panel settings-modal__panel--lg">
            <SelectAvatarDecorationDialog
              v-if="editableProfile?.user_id"
              :userId="editableProfile.user_id"
              :photopath="localAvatar"
              :currentDecorationUrl="editableProfile?.avatar_decoration_url || ''"
              @selected="handleDecorationSelected"
              @closeDialog="decorationDialogVisible = false"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="settings-modal-fade">
        <div
          v-if="decorationLockedDialogVisible"
          class="settings-modal"
          role="presentation"
        >
          <button
            type="button"
            class="settings-modal__scrim"
            aria-label="Close decoration locked dialog"
            @click="decorationLockedDialogVisible = false"
          />
          <div class="settings-modal__panel settings-modal__panel--sm">
            <h2 class="settings-modal__title">
              {{ t("components.select-avatar-decoration.title") }}
            </h2>
            <p class="settings-modal__body">
              Link your email to unlock avatar decorations.
            </p>
            <div class="settings-modal__actions">
              <button
                type="button"
                class="settings-modal__btn"
                @click="decorationLockedDialogVisible = false"
              >
                {{ t("components.profile-email-link.cancel") }}
              </button>
              <button
                type="button"
                class="settings-modal__btn settings-modal__btn--primary"
                @click="openLinkEmailFromDecorationLock"
              >
                {{ t("components.profile-email-link.cta") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="settings-modal-fade">
        <div
          v-if="aiBioDialogVisible"
          class="settings-modal"
          role="presentation"
        >
          <button
            type="button"
            class="settings-modal__scrim"
            aria-label="Close AI bio dialog"
            @click="closeAiBioDialog"
          />
          <div class="settings-modal__panel settings-modal__panel--md">
            <h2 class="settings-modal__title">Generate a bio</h2>
            <p class="settings-modal__body">
              Enter at least 4 words that describe you. The AI will craft a short
              bio you can edit.
            </p>
            <label class="settings-modal__field">
              <span>Keywords</span>
              <textarea
                v-model="aiBioKeywords"
                rows="3"
                class="settings-modal__input settings-modal__textarea"
                placeholder="curious, optimistic, hiking, espresso"
              ></textarea>
            </label>
            <div class="settings-modal__caption">
              Remaining uses: {{ aiBioRemaining }}
            </div>
            <div
              v-if="aiBioError"
              class="settings-inline-alert settings-inline-alert--error mt-3"
            >
              {{ aiBioError }}
            </div>
            <div class="settings-modal__actions">
              <button type="button" class="settings-modal__btn" @click="closeAiBioDialog">
                Cancel
              </button>
              <button
                type="button"
                class="settings-modal__btn settings-modal__btn--primary"
                :disabled="aiBioLoading || aiBioDisabled"
                @click="generateAiBio"
              >
                <span v-if="aiBioLoading" class="settings-modal__spinner" aria-hidden="true" />
                Generate
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
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
  saveAvatar,
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

const isViewingOwnProfile = computed(() => {
  if (props.adminMode) return true;
  const profileUserId = editableProfile.value?.user_id;
  const authUserId = authStore.user?.id;
  return !!profileUserId && !!authUserId && profileUserId === authUserId;
});

const showPhotoLibrary = computed(() => {
  return (
    props.adminMode ||
    authStore.authStatus === "authenticated" ||
    authStore.authStatus === "anon_authenticated"
  );
});
const showDecorationControl = computed(() => {
  if (props.adminMode) return false;
  return ["authenticated", "anon_authenticated"].includes(authStore.authStatus);
});
const decorationLocked = computed(() => {
  if (props.adminMode) return false;
  return authStore.authStatus === "anon_authenticated";
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
  if (
    !showPhotoLibrary.value ||
    isPhotoLibraryDisabled.value ||
    !isViewingOwnProfile.value
  ) {
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
  localAvatar.value = buildAvatarDisplayUrl(props.userProfile?.avatar_url);
  ensurePreferredLocale();
  if (needsProfileCompletion.value) {
    isEditable.value = true;
  } else {
    isEditable.value = false;
  }
  avatarError.value = "";
  taglineError.value = "";
  bioTouched.value = false;
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
      editableProfile.value.is_private,
      undefined,
      undefined,
      editableProfile.value.profile_card_theme
    );
    console.info("Profile updated successfully.");
    isEditable.value = false;
    if ((nameChanged || bioChanged || taglineChanged) && next.user_id) {
      try {
        await translateProfileFields({ profile: next });
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

const decorationDialogVisible = ref(false);
const decorationLockedDialogVisible = ref(false);

const openDecorationPicker = () => {
  if (!showDecorationControl.value) return;
  if (decorationLocked.value) {
    decorationLockedDialogVisible.value = true;
    return;
  }
  if (!editableProfile.value?.user_id) return;
  decorationDialogVisible.value = true;
};

const handleDecorationSelected = (url) => {
  if (!editableProfile.value) return;
  editableProfile.value.avatar_decoration_url = url || null;
  if (!props.adminMode && authStore.userProfile) {
    authStore.userProfile.avatar_decoration_url = url || null;
  }
};

const openLinkEmailFromDecorationLock = () => {
  decorationLockedDialogVisible.value = false;
  openLinkEmailDialog();
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
  () => [
    editableProfile.value?.user_id,
    authStore.user?.id,
    authStore.authStatus,
  ],
  () => {
    loadPhotoLibraryPreview();
  }
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

const applyAvatarUrl = (cleanUrl) => {
  localAvatar.value = buildAvatarDisplayUrl(cleanUrl);
  avatarError.value = "";

  if (editableProfile.value) {
    editableProfile.value.avatar_url = cleanUrl;
  }

  if (!props.adminMode && authStore.userProfile) {
    authStore.userProfile.avatar_url = cleanUrl;
  }
};

const resolveAvatarFromSelection = async (payload) => {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" ? payload : "";
  }
  if (payload.source !== "library" || !payload.photoId) {
    return typeof payload.url === "string" ? payload.url : "";
  }
  try {
    const result = props.adminMode
      ? await $fetch("/api/admin/profile/avatar-from-library", {
          method: "POST",
          body: {
            photoId: payload.photoId,
            userId: editableProfile.value?.user_id,
          },
        })
      : await $fetch("/api/profile/avatar-from-library", {
          method: "POST",
          body: { photoId: payload.photoId },
        });
    return result?.avatarUrl || "";
  } catch (err) {
    console.error("[settings] avatar from library failed:", err);
    return "";
  }
};

const updateAvatarUrl = async (payload) => {
  const incomingUrl = await resolveAvatarFromSelection(payload);
  if (!incomingUrl) {
    avatarError.value = "Could not save that photo. Please try again.";
    return;
  }
  const cleanUrl = stripAvatarQuery(incomingUrl);
  if (!cleanUrl) {
    avatarError.value = "Could not save that photo. Please try again.";
    return;
  }
  const prevUrl = stripAvatarQuery(editableProfile.value?.avatar_url);
  applyAvatarUrl(cleanUrl);

  const shouldPersistImmediately =
    !props.adminMode && !isEditable.value && !!editableProfile.value?.user_id;

  if (!shouldPersistImmediately || cleanUrl === prevUrl) {
    return;
  }

  const saved = await saveAvatar(editableProfile.value.user_id, cleanUrl);
  if (!saved) {
    applyAvatarUrl(prevUrl || "");
    avatarError.value = "Could not save that photo. Please try again.";
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
    const result = props.adminMode
      ? await $fetch("/api/admin/profile/avatar-random", {
          method: "POST",
          body: buildRandomAvatarPayload(),
        })
      : await $fetch("/api/profile/avatar-random", {
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
    const result = props.adminMode
      ? await $fetch("/api/admin/profile/avatar-upload", {
          method: "POST",
          body: {
            userId: editableProfile.value.user_id,
            dataUrl,
          },
        })
      : await $fetch("/api/profile/avatar-upload", {
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
const translateProfileLoading = ref(false);
const translateProfileStatus = ref("");
const translateProfileError = ref(false);

const translateProfileFields = async ({
  profile = editableProfile.value,
  showStatus = false,
} = {}) => {
  const next = profile || {};
  if (!next?.user_id || !(next.displayname || next.bio || next.tagline)) {
    if (showStatus) {
      translateProfileError.value = true;
      translateProfileStatus.value = "No profile text to translate.";
    }
    return false;
  }

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

  if (showStatus) {
    translateProfileError.value = false;
    translateProfileStatus.value = "Profile translations refreshed.";
  }
  return true;
};

const manuallyTranslateProfile = async () => {
  translateProfileLoading.value = true;
  translateProfileStatus.value = "";
  translateProfileError.value = false;
  try {
    await translateProfileFields({ showStatus: true });
  } catch (err) {
    console.warn("[settings] manual profile translate failed:", err);
    translateProfileError.value = true;
    translateProfileStatus.value =
      err?.data?.error || "Profile translation failed.";
  } finally {
    translateProfileLoading.value = false;
  }
};


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
  top: 10px;
  right: 10px;
  background-color: rgb(var(--color-surface));
  border-radius: 50%;
  padding: 5px;
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
  background: transparent;
  border: none;
  box-shadow: none;
}

.settings-inline-alert {
  padding: 0.9rem 1rem;
  border: 1px solid transparent;
  border-radius: 14px;
  line-height: 1.6;
}

.settings-inline-alert--info {
  background: rgb(var(--color-info) / 0.12);
  border-color: rgb(var(--color-info) / 0.22);
  color: rgb(var(--color-info));
}

.settings-inline-alert--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.settings-inline-alert--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 2400;
}

.settings-modal__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.72);
}

.settings-modal__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  max-height: calc(100vh - 2rem);
  overflow: auto;
  transform: translate(-50%, -50%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(15 23 42 / 0.28);
}

.settings-modal__panel--sm {
  width: min(92vw, 480px);
}

.settings-modal__panel--md {
  width: min(92vw, 520px);
}

.settings-modal__panel--lg {
  width: min(92vw, 720px);
}

.settings-modal__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: rgb(var(--color-foreground));
}

.settings-modal__body,
.settings-modal__caption {
  color: rgb(var(--color-foreground) / 0.72);
  line-height: 1.6;
}

.settings-modal__body {
  margin: 0.75rem 0 1rem;
}

.settings-modal__field {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.85rem;
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
}

.settings-modal__input {
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
}

.settings-modal__textarea {
  resize: vertical;
}

.settings-modal__caption {
  margin-top: 0.65rem;
  font-size: 0.82rem;
}

.settings-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1rem;
}

.settings-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.35rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 10px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
  font: inherit;
  font-weight: 600;
}

.settings-modal__btn--primary {
  border-color: transparent;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-background));
}

.settings-modal__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.settings-modal__spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: settings-modal-spin 0.7s linear infinite;
}

.settings-modal-fade-enter-active,
.settings-modal-fade-leave-active {
  transition: opacity 160ms ease;
}

.settings-modal-fade-enter-from,
.settings-modal-fade-leave-to {
  opacity: 0;
}

@keyframes settings-modal-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
