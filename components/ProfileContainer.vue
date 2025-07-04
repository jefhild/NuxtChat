<template>
  <v-card class="mx-auto mb-3" max-width="700">
    <v-card-title v-if="userProfile">
      <v-row no-gutters class="mb-0"
        ><v-col cols="3">
          <!-- <ProfilePhoto
            :editable="isEditable"
            :userId="userProfile.user_id"
            @updateAvatarUrl="updateAvatarUrl"
          /> -->

          <ProfilePhoto
            :editable="isEditable"
            :userId="userProfile.user_id"
            :avatarUrl="avatar"
            @updateAvatarUrl="updateAvatarUrl"
          />

          <!-- <img :src="avatar" alt="User Avatar" /> -->
          <v-btn variant="text" size="small" @click="previewAvatar">Shuffle Avatar</v-btn>
          <v-btn variant="text" size="small"  @click="confirmAvatar" color="primary">Use This Avatar</v-btn>
        </v-col>

        <v-col cols="9" class="d-flex flex-column align-center">
          <h3 class="font-weight-medium">
            {{ userProfile.displayname }}
          </h3>

          <h5 class="font-weight-thin">
            {{ userProfile.tagline }}
          </h5>
          <h5 class="font-weight-thin">
            {{ userProfile.site_url }}
          </h5>
          <p class="mt-3">
            <LookingForDisplay
              :key="displayKey"
              :userId="userProfile.user_id"
            />
          </p>
          <p class="mt-2">
            <LookingForMenu
              :userProfile="userProfile"
              :refreshLookingForMenu="refreshLookingForMenu"
              @lookingForUpdated="refreshLookingForDisplay"
            />
          </p>
        </v-col>
      </v-row>
    </v-card-title>
    <v-card-text v-if="userProfile">
      <v-row class="mt-6" v-if="isEditable">
        <v-col cols="12" md="4">
          <ProfileDisplayName2
            :displayName="userProfile.displayname"
            :isEditable="isEditable"
            @updateDisplayName="updateDisplayName"
            @validation="updateFormValidity"
          />
        </v-col>
        <v-col cols="12" md="4">
          <ProfileTagLine
            :tagLine="userProfile.tagline ?? '...'"
            :isEditable="isEditable"
            @updateTagLine="updateTagLine"
          />
        </v-col>
        <v-col cols="12" md="4">
          <ProfileSite
            :siteUrl="userProfile.site_url ?? ''"
            :isEditable="isEditable"
            @updateSite="updateSite"
          />
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-text v-if="userProfile">
      <v-row>
        <v-col cols="12" md="4">
          <v-row
            ><v-col v-if="!isEditable" cols="auto" class="mt-1">
              <label class="font-weight-bold">{{
                $t("components.profile-container.status")
              }}</label></v-col
            ><v-col>
              <StatusSelection
                :selectedStatus="userProfile?.status_id ?? 1"
                :status="status"
                :isEditable="isEditable"
                @updateStatus="updateStatus"
              /> </v-col
          ></v-row>
        </v-col>
        <v-col cols="12" md="4">
          <v-row
            ><v-col v-if="!isEditable" cols="auto" class="mt-1"
              ><label class="font-weight-bold">{{
                $t("components.profile-container.gender")
              }}</label></v-col
            ><v-col>
              <GenderSelection
                v-model="selectedGender"
                :genders="genders"
                :isEditable="isEditable"
                @validation="handleGenderValidation"
              /> </v-col
          ></v-row>
        </v-col>
        <v-col cols="12" md="4">
          <v-row
            ><v-col v-if="!isEditable" cols="auto" class="mt-1"
              ><label class="font-weight-bold">{{
                $t("components.profile-container.age")
              }}</label></v-col
            ><v-col>
              <ProfileAge
                :age="userProfile.age ?? 18"
                :isEditable="isEditable"
                @updateAge="updateAge"
              /> </v-col
          ></v-row>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <LocationSelection
            :selectedCountry="userProfile.country"
            :selectedState="userProfile.state"
            :selectedCity="userProfile.city"
            :countries="countries"
            :states="states"
            :cities="cities"
            :isEditable="isEditable"
            @updateCountry="updateCountry"
            @updateState="updateState"
            @updateCity="updateCity"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col
          ><label class="font-weight-bold">{{
            $t("components.profile-container.about-me")
          }}</label>
        </v-col>
        <v-col align="right">
          <v-btn
            v-if="isEditable"
            flat
            variant="text"
            class="text-link-btn"
            @click="openGenerateBioDialog"
            >Generate a bio</v-btn
          ></v-col
        > </v-row
      ><v-row no-gutters>
        <v-col>
          <ProfileBio
            :bio="userProfile.bio ?? ''"
            :isEditable="isEditable"
            @updateBio="updateBio"
          />
          <!-- <v-btn v-if="isEditable" flat variant="text" class="text-link-btn" @click="openGenerateBioDialog">Generate a bio</v-btn> -->
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="12">
          <v-switch
            v-model="soundNotificationsEnabled"
            :label="
              t('components.profile-container.sound-notifs') +
              `: ${
                soundNotificationsEnabled
                  ? t('components.profile-container.on')
                  : t('components.profile-container.off')
              }`
            "
            color="primary"
            hide-details
            inset
            @change="updateSoundNotifications"
          />
        </v-col>
      </v-row>

      <!-- <v-row>
        <v-col>
          <v-btn v-if="isEditable" flat variant="text" class="text-link-btn" @click="openGenerateBioDialog">Generate a bio</v-btn>
          </v-col>
          <v-col align="right">
          <v-btn v-if="!isFinished && isEditable" flat variant="text" class="text-link-btn" @click="openFinishProfileDialog">Finish
             Profile</v-btn>
        </v-col>
      </v-row> -->
    </v-card-text>
    <v-card-text v-if="userProfile">
      <v-row>
        <v-col cols="8">
          <v-btn
            color="primary"
            :disabled="!isFormValid"
            @click="toggleEditMode"
          >
            {{
              isEditable
                ? t("components.profile-container.save")
                : t("components.profile-container.edit")
            }}
          </v-btn>
          <v-btn
            class="ml-4"
            color="secondary"
            v-if="isEditable"
            @click="cancelEdit"
          >
            {{ $t("components.profile-container.cancel") }}
          </v-btn>
        </v-col>
        <v-col cols="4" class="d-flex justify-end">
          <v-btn color="primary" :disabled="!isFormValid" @click="gotoChat()">{{
            $t("components.profile-container.go-to-chat")
          }}</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn
            v-if="!isMarkedForDeletion"
            flat
            variant="text"
            @click="deleteDialog = true"
            class="text-link-btn"
          >
            {{ $t("components.profile-container.delete") }}
          </v-btn>
          <v-btn
            v-else
            flat
            variant="text"
            @click="deleteDialog = true"
            class="text-link-btn"
          >
            {{ $t("components.profile-container.restore") }}
          </v-btn>
        </v-col>

        <v-col class="d-flex justify-center">
          <v-btn
            v-if="!isFinished && isEditable"
            flat
            variant="text"
            class="text-link-btn"
            @click="openFinishProfileDialog"
            >{{ $t("components.profile-container.finish") }}</v-btn
          >
        </v-col>

        <v-col class="d-flex justify-center">
          <v-btn
            flat
            variant="text"
            color="blue"
            @click="
              router.push(
                localPath(`/profiles/${userProfile.gender}/${userProfile.slug}`)
              )
            "
            class="text-link-btn"
          >
            {{ $t("components.profile-container.public") }}
          </v-btn>

          <v-tooltip
            :text="t('components.profile-container.copy')"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                icon
                color="primary"
                size="small"
                class="ml-5"
                v-bind="tooltipProps"
                @click="copyPublicProfileLink"
              >
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>

        <!-- lets make this a claim account button to link an email -->
        <!-- <v-btn color="primary" @click="linkAccountDialog = true">
          Link an account
        </v-btn> -->
      </v-row>
    </v-card-text>
    <v-card-text v-else>
      <v-row>
        <v-col cols="12">
          <LoadingContainer
            :text="$t('components.profile-container.loading')"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <v-dialog v-model="deleteDialog" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-account-remove"
      title="Delete My Account"
    >
      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">{{
            $t("components.profile-container.delete-confirm")
          }}</v-col></v-row
        >
      </v-card-text>

      <template v-slot:actions>
        <v-btn
          v-if="!isMarkedForDeletion"
          color="primary"
          text
          @click="confirmDelete"
          >{{ $t("components.profile-container.confirm") }}</v-btn
        >
        <v-btn v-else color="primary" text @click="cancelDelete">{{
          $t("components.profile-container.restore")
        }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          class="ms-auto"
          :text="t('components.profile-container.cancel')"
          @click="deleteDialog = false"
        ></v-btn>
      </template>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="linkAccountDialog"
    width="auto"
    transition="dialog-transition"
  >
    <LinkAccount />
  </v-dialog>

  <v-dialog
    v-model="generateBioDialog"
    max-width="600"
    transition="dialog-transition"
  >
    <GenerateBioDialog v-model="generateBioDialog" @updateBio="updateBio" />
  </v-dialog>

  <v-dialog
    v-model="finishProfileDialog"
    :overlay="false"
    max-width="500px"
    transition="dialog-transition"
  >
    <FinishProfile
      :infoLeft="infoLeft"
      @closeDialog="closeFinishProfileDialog"
      @lookingForUpdated="refreshLookingForDisplay"
    />
  </v-dialog>

  <v-snackbar v-model="snackbar" :timeout="3000">
    {{ snackbarText }}

    <template v-slot:actions>
      <v-btn color="blue" variant="text" @click="snackbar = false">
        {{ $t("components.profile-container.close") }}
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useLocationManager } from "@/composables/useLocationManager";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const {
  getStatuses,
  getGenders,
  updateGender,
  updateSoundSetting,
  hasInterests,
  hasEmail,
  updateProfile,
  authUpdateProfile,
  saveAvatar,
} = useDb();

const localPath = useLocalePath();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const user = ref(authStore.user);
const userProfile = ref(authStore.userProfile);
const avatar = ref("");

// const genders = ref([]);

const genders = ref([
  { id: null, name: t("components.gender-selection.select-gender") },
  { id: 1, name: t("components.profile-container.gender-male") },
  { id: 2, name: t("components.profile-container.gender-female") },
  { id: 3, name: t("components.profile-container.gender-other") },
]);

const status = ref([]);

const isEditable = ref(false);
const isFinished = ref(false);
const infoLeft = ref([{}]);
const refreshLookingForMenu = ref(false);
const originalGenderId = ref(null);
const originalStatusId = ref(null);
const originalAge = ref(null);
const originalBio = ref(null);
const originalDisplayName = ref(null);
const originalTagLine = ref(null);
const originalCountryId = ref(null);
const originalStateId = ref(null);
const originalCityId = ref(null);
const originalAvatarUrl = ref(null);
const originalSiteUrl = ref(null);
const defaultGenderId = 2; // Default to Female
const defaultStatusId = 1; // Default to Single
const selectedGender = ref(userProfile.value.gender_id);
const {
  countries,
  states,
  cities,
  selectedCountry,
  selectedState,
  selectedCity,
  fetchCountries,
  fetchCities,
  fetchStates,
} = useLocationManager(userProfile.value.country, userProfile.value.state);

const displayKey = ref(Date.now());
const isFormValid = ref(true);
const deleteDialog = ref(false);
const linkAccountDialog = ref(false);
const generateBioDialog = ref(false);
const finishProfileDialog = ref(false);
const isMarkedForDeletion = ref(false);
const snackbar = ref(false);
const snackbarText = ref("");
const soundNotificationsEnabled = ref(
  userProfile.value?.sound_notifications_enabled ?? true
);

const { generateAvatar, getRandomStyle, getPreviewAvatarUrl } =
  useAvatarGenerator();

const currentSeed = ref(null);
const currentStyle = ref(null);

const previewAvatar = () => {
  const seed = `${userProfile.value.displayname}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
  const style = getRandomStyle(userProfile.value.gender_id);
  avatar.value = getPreviewAvatarUrl(seed, style);
  currentSeed.value = seed;
  currentStyle.value = style;
};

const confirmAvatar = async () => {
  const userId = userProfile.value.user_id;
  const success = await saveAvatar(userId, avatar.value);
  if (success) {
    updateAvatarUrl(avatar.value);
  }
};

const updateFormValidity = (isValid) => {
  // console.log("Form validity updated:", isValid);
  isFormValid.value = isValid;
};

const refreshLookingForDisplay = async () => {
  // console.log("refreshLookingForDisplay called");
  refreshLookingForMenu.value = !refreshLookingForMenu.value;
  displayKey.value = Date.now(); // Change key to force refresh
  checkIfFinished();
};

const requiredAgeRule = (value) => {
  return value !== null && value !== undefined && value !== "";
};

const gotoChat = async () => {
  // console.log(
  //   "requiredAgeRule(userProfile.value.age):",
  //   requiredAgeRule(userProfile.value.age)
  // );
  if (
    userProfile.value.displayname === "" ||
    userProfile.value.displayname === null ||
    requiredAgeRule(userProfile.value.age) === false
  ) {
    console.log("userProfile is null, blank or anonymous an age problem");
    isEditable.value = true;
  } else {
    toggleEditMode();
    router.push(localPath("/chat"));
  }
};

const fetchGenders = async () => {
  try {
    const data = await getGenders();

    // Check if data is null or empty and set the default value if necessary
    if (data && data.length > 0) {
      genders.value = data;
      // console.log("genders.value ", genders.value)
    } else {
      genders.value = defaultGenderId; // Replace with your actual default gender value
    }
  } catch (error) {
    console.error("Error fetching genders:", error);
    // Optionally set default value on error
    genders.value = defaultGenderId; // Replace with your actual;
  }
};

const fetchStatus = async () => {
  try {
    const data = await getStatuses();

    // Check if data is null or empty and set the default value if necessary
    if (data && data.length > 0) {
      status.value = data;
    } else {
      status.value = defaultStatusId; // Replace with your actual default gender value
    }
  } catch (error) {
    console.error("Error fetching status:", error);
    // Optionally set default value on error
    status.value = defaultStatusId; // Replace with your actual;
  }
};

const loadData = async () => {
  try {
    // await fetchGenders();
    await fetchStatus();
    await fetchCountries(); // Fetch countries first

    // Now update userProfile from the store
    userProfile.value = authStore.userProfile;
    avatar.value = userProfile.value.avatar_url || "";

    if (userProfile.value) {
      const { country_id, state_id, city_id, gender_id } = userProfile.value;

      selectedGender.value = gender_id;
      // Find the country name based on the country ID
      const selectedCountryObj = countries.value.find(
        (country) => country.id === country_id
      );
      if (selectedCountryObj) {
        selectedCountry.value = selectedCountryObj.name; // Set the selected country name

        // Fetch states based on the country name
        await fetchStates(selectedCountryObj.name); // Pass the country name
      }

      // Find the state name based on the state ID
      const selectedStateObj = states.value.find(
        (state) => state.id === state_id
      );
      if (selectedStateObj) {
        selectedState.value = selectedStateObj.name; // Set the selected state name

        // Fetch cities based on the state name
        await fetchCities(selectedStateObj.name); // Pass the state name
      }

      // Find the city name based on the city ID
      const selectedCityObj = cities.value.find((city) => city.id === city_id);
      if (selectedCityObj) {
        selectedCity.value = selectedCityObj.name; // Set the selected city name
      }

      // Store original values for cancelation purposes
      originalCountryId.value = country_id;
      originalStateId.value = state_id;
      originalCityId.value = city_id;
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
};

// onMounted(loadData);
onMounted(async () => {
  await loadData();
  // Check for the edit query parameter after loading data
  if (route.query.edit === "true") {
    isEditable.value = true;
  }

  await checkIfFinished();
  finishProfileDialog.value = !isFinished.value;
  // console.log("userprofile.value: ", userProfile.value);
});

const openFinishProfileDialog = async () => {
  finishProfileDialog.value = true;
};

const openGenerateBioDialog = async () => {
  generateBioDialog.value = true;
};

const checkIfFinished = async () => {
  const userHasInterests = await hasInterests(userProfile.value.user_id);
  const userHasEmail = await hasEmail(userProfile.value.user_id);
  // console.log("userHasInterests: ", userHasInterests);
  // console.log("userHasEmail: ", userHasEmail);

  isFinished.value =
    userProfile.value.tagline && userHasInterests && userHasEmail;
  infoLeft.value = []; // Clear the array

  const skipSiteURL = localStorage.getItem("skipSiteURLPrompt") === "true";

  const fields = {
    tagline: userProfile.value.tagline,
    site_url: skipSiteURL ? true : userProfile.value.site_url,
    interests: userHasInterests,
    email: userHasEmail,
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (!value) infoLeft.value.push(key);
  });
};

const updateCountry = (newCountryName) => {
  selectedCountry.value = newCountryName;

  // Find the country name based on the selected country ID
  const selectedCountryObj = countries.value.find(
    (country) => country.name === newCountryName
  );

  // console.log("selectedCountryObj: ", selectedCountryObj);
  // Save the corresponding ID in the profile
  userProfile.value.country_id = selectedCountryObj?.id || null;
};

const updateState = (newStateName) => {
  selectedState.value = newStateName;

  // Find the state ID based on the selected state name
  const selectedStateObj = states.value.find(
    (state) => state.name === newStateName
  );

  // Save the corresponding ID in the profile
  userProfile.value.state_id = selectedStateObj?.id || null;
};

const updateCity = (newCityName) => {
  selectedCity.value = newCityName;

  // Find the city ID based on the selected city name
  const selectedCityObj = cities.value.find(
    (city) => city.name === newCityName
  );

  // Save the corresponding ID in the profile
  userProfile.value.city_id = selectedCityObj?.id || null;
};

// const updateGender = (newGenderId) => {
//   userProfile.value.gender_id = newGenderId;
// };

const handleGenderValidation = (isValid) => {
  //
  console.log("handleGenderValidation: ", isValid);
};

const updateTheGender = async (newGenderId) => {
  userProfile.value.gender_id = newGenderId;

  // Update database only if editable
  if (isEditable.value) {
    await updateGender(newGenderId, userProfile.value.user_id);
  }
};

watch(selectedGender, (newGenderId) => {
  updateTheGender(newGenderId);
});

const updateSoundNotifications = async () => {
  const { error } = await updateSoundSetting(
    userProfile.value.user_id,
    soundNotificationsEnabled.value
  );

  // console.log("Sound setting updated successfully", soundNotificationsEnabled.value);
};

const updateStatus = (newStatusId) => {
  userProfile.value.status_id = newStatusId;
};

const updateBio = (newBio) => {
  userProfile.value.bio = newBio;
  generateBioDialog.value = false;
};

const closeFinishProfileDialog = async () => {
  finishProfileDialog.value = false;
  await refreshLookingForDisplay();
  await checkIfFinished();
};

const updateDisplayName = (newDisplayName) => {
  userProfile.value.displayname = newDisplayName;
};

const updateAvatarUrl = (newAvatarUrl) => {
  userProfile.value.avatar_url = newAvatarUrl;
};

const updateSite = (newSiteUrl) => {
  userProfile.value.site_url = newSiteUrl;
};

const updateTagLine = (newTagLine) => {
  userProfile.value.tagline = newTagLine;
};

const updateAge = (newAge) => {
  userProfile.value.age = newAge;
};

const toggleEditMode = async () => {
  if (isEditable.value) {
    try {
      await updateProfile(
        userProfile.value.user_id,
        userProfile.value.displayname,
        userProfile.value.tagline,
        userProfile.value.gender_id,
        userProfile.value.status_id,
        userProfile.value.age,
        userProfile.value.bio,
        userProfile.value.country_id,
        userProfile.value.state_id,
        userProfile.value.city_id,
        userProfile.value.avatar_url,
        userProfile.value.site_url
      );

      originalGenderId.value = userProfile.value.gender_id;
      originalStatusId.value = userProfile.value.status_id;
      originalAge.value = userProfile.value.age;
      originalBio.value = userProfile.value.bio;
      originalDisplayName.value = userProfile.value.displayname;
      originalTagLine.value = userProfile.value.tagline;
      originalCountryId.value = userProfile.value.country_id;
      originalStateId.value = userProfile.value.state_id;
      originalCityId.value = userProfile.value.city_id;
      originalAvatarUrl.value = userProfile.value.avatar_url;
      originalSiteUrl.value = userProfile.value.site_url;
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  } else {
    originalGenderId.value = userProfile.value.gender_id;
    originalStatusId.value = userProfile.value.status_id;
    originalAge.value = userProfile.value.age;
    originalBio.value = userProfile.value.bio;
    originalDisplayName.value = userProfile.value.displayname;
    originalTagLine.value = userProfile.value.tagline;
    originalCountryId.value = userProfile.value.country_id;
    originalStateId.value = userProfile.value.state_id;
    originalCityId.value = userProfile.value.city_id;
    originalAvatarUrl.value = userProfile.value.avatar_url;
    originalSiteUrl.value = userProfile.value.site_url;

    await fetchCountries();
    if (userProfile.value.country_id) {
      await fetchStates(userProfile.value.country_id);
    }
    if (userProfile.value.state_id) {
      await fetchCities(userProfile.value.state_id);
    }
  }
  isEditable.value = !isEditable.value;
  await checkIfFinished();
};

const cancelEdit = () => {
  userProfile.value.gender_id = originalGenderId.value;
  userProfile.value.status_id = originalStatusId.value;
  userProfile.value.bio = originalBio.value;
  userProfile.value.displayname = originalDisplayName.value;
  userProfile.value.tagline = originalTagLine.value;
  userProfile.value.country_id = originalCountryId.value;
  userProfile.value.state_id = originalStateId.value;
  userProfile.value.city_id = originalCityId.value;
  userProfile.value.avatar_url = originalAvatarUrl.value;
  userProfile.value.site_url = originalSiteUrl.value;
  isEditable.value = false;
  isFormValid.value = true;
};

const confirmDelete = async () => {
  try {
    await authUpdateProfile(true, new Date().toISOString());
    isMarkedForDeletion.value = true;
  } catch (error) {
    console.error("Error deleting account:", error.message);
  }
};

const cancelDelete = async () => {
  try {
    await authUpdateProfile(false, null);
    isMarkedForDeletion.value = false;
  } catch (error) {
    console.error("Error deleting account:", error.message);
  }
};

const copyPublicProfileLink = async () => {
  try {
    const publicUrl = `${window.location.origin}/profiles/${userProfile.value.gender}/${userProfile.value.slug}`;
    await navigator.clipboard.writeText(publicUrl);
    snackbarText.value = t("components.profile-container.snackbar-copy-text");
  } catch (err) {
    console.error("Failed to copy:", err);
  }

  // Show snackbar notification
  snackbar.value = true;
};
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
