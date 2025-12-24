<template>
  <v-card class="mx-auto mb-3" flat v-if="authStateUI.showForm">
    <SettingsProfileHeader
      v-if="editableProfile?.user_id"
      :userProfile="editableProfile"
      :avatar="localAvatar"
       :isEditable="isEditable"
      :displayKey="displayKey"
      :refreshLookingForMenu="refreshLookingForMenu"
      @refreshLookingForDisplay="displayKey++"
      @updateAvatarUrl="updateAvatarUrl"
      @previewAvatar="previewAvatar"
      @confirmAvatar="confirmAvatar"
    />

    <SettingsProfileFormContent
      :userProfile="editableProfile"
      :isEditable="isEditable"
      :statuses="statuses"
      :genders="genders"
      :locationProps="locationProps"
      :showEmailLinkPrompt="shouldOfferEmailLinkPrompt"
      @update:country="onUpdateCountry"
      @update:state="onUpdateState"
      @update:city="onUpdateCity"
      @update:displayName="(val) => (editableProfile.displayname = val)"
      @update:tagLine="(val) => (editableProfile.tagline = val)"
      @update:siteUrl="(val) => (editableProfile.site_url = val)"
      @update:statusId="(val) => (editableProfile.status_id = val)"
      @update:age="(val) => (editableProfile.age = val)"
      @update:genderId="(val) => (editableProfile.gender_id = val)"
      @update:bio="(val) => (editableProfile.bio = val)"
      @save="saveChanges"
      @startEdit="startEditing"
      @cancelEdit="cancelEditing"
      @linkAnonEmail="openLinkEmailDialog"
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
  </v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useI18n } from "vue-i18n";
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

const {
  getStatuses,
  getGenders,
  saveAvatar,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  updateProfile,
  hasEmail,
  updateUserEmail,
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

const editableProfile = ref({ ...props.userProfile });
const appliedGeoDefaults = ref(false);

const { getDefaults } = useGeoLocationDefaults();


// Watch for updates from parent and reset the local copy
watch(
  () => props.userProfile,
  (newProfile) => {
    editableProfile.value = { ...newProfile };
  }
);

const displayKey = ref(0);
const refreshLookingForMenu = ref(false);

const authStore = useAuthStore();
const { t } = useI18n();
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

const cancelEditing = () => {
  editableProfile.value = { ...props.userProfile };
  isEditable.value = false;
};

const startEditing = () => {
  isEditable.value = true;
};

const saveChanges = async () => {
  if (!editableProfile.value?.user_id) return;

  saving.value = true;

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
      editableProfile.value.site_url
    );
    console.info("Profile updated successfully.");
    isEditable.value = false;
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
    await refreshLinkedEmailState();
  } catch (err) {
    console.error("Error linking email:", err);
    linkEmailError.value =
      err?.message || t("components.profile-email-link.generic-error");
  } finally {
    linkEmailSubmitting.value = false;
  }
};

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

const isEditable = ref(false); // default to false for safety

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


const avatar = ref(props.userProfile.avatar_url);
const localAvatar = avatar;

const updateAvatarUrl = (newUrl) => {
  localAvatar.value = newUrl;

  if (editableProfile.value) {
    editableProfile.value.avatar_url = newUrl;
  }

  if (!props.adminMode && authStore.userProfile) {
    authStore.userProfile.avatar_url = newUrl;
  }
};

const { generateAvatar, getRandomStyle, getPreviewAvatarUrl } =
  useAvatarGenerator();

const currentSeed = ref(null);
const currentStyle = ref(null);

const previewAvatar = () => {
  if (!props.userProfile?.displayname || !props.userProfile?.gender_id) {
    console.warn("Missing displayname or gender_id for avatar preview");
    return;
  }

  const seed = `${props.userProfile.displayname}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
  const style = getRandomStyle(props.userProfile.gender_id);
  const url = getPreviewAvatarUrl(seed, style);

  avatar.value = url;

  // watch(avatar, (newVal) => {
  //   console.log("avatar.value updated to:", newVal);
  // });

  currentSeed.value = seed;
  currentStyle.value = style;

  // console.log("Preview avatar:", { seed, style, url });
};

const saving = ref(false);

const confirmAvatar = async () => {
  if (!props.userProfile?.user_id || !avatar.value || saving.value) return;

  saving.value = true;

  const success = await saveAvatar(props.userProfile.user_id, avatar.value);

  saving.value = false;

  if (success) {
    updateAvatarUrl(avatar.value);
  }
};


onMounted(async () => {
  try {
    statuses.value = await getStatuses();
    genders.value = await getGenders();
    countries.value = await getCountries();
     isEditable.value = authStateUI.value.editable;
    if (authStore.authStatus === "anon_authenticated") {
      await refreshLinkedEmailState();
    }




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
</style>
