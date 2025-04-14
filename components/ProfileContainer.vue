<template>
  <v-card class="mx-auto mb-3" max-width="700">
    <v-card-title v-if="userProfile">
      <v-row no-gutters class="mb-0"
        ><v-col cols="3">
          <!-- {{ userProfile}} -->
          <ProfilePhoto2
            :editable="isEditable"
            :userId="userProfile.user_id"
            @updateAvatarUrl="updateAvatarUrl"
          />
          <!-- <LookingForMenu
            :userProfile="userProfile"
            @lookingForUpdated="refreshLookingForDisplay"
          /> -->
          <!-- <OnlineStatus :userId="userProfile.user_id" />  -->
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
              <label class="font-weight-bold">Status:</label></v-col
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
              ><label class="font-weight-bold">Gender:</label></v-col
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
              ><label class="font-weight-bold">Age:</label></v-col
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
      <v-row >
        <v-col><label class="font-weight-bold">About Me:</label> </v-col>
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
            {{ isEditable ? "Save" : "Edit" }}
          </v-btn>
          <v-btn
            class="ml-4"
            color="secondary"
            v-if="isEditable"
            @click="cancelEdit"
          >
            Cancel
          </v-btn>
        </v-col>
        <v-col cols="4" class="d-flex justify-end">
          <v-btn color="primary" :disabled="!isFormValid" @click="gotoChat()"
            >Go to Chat</v-btn
          >
        </v-col>
      </v-row>
      <v-row>
        <v-col class="d-flex justify-center">
          <v-btn
            v-if="!isMarkedForDeletion"
            flat
            variant="text"
            @click="deleteDialog = true"
            class="text-link-btn"
          >
            Delete My Account
          </v-btn>
          <v-btn
            v-else
            flat
            variant="text"
            @click="deleteDialog = true"
            class="text-link-btn"
          >
            Restore Account
          </v-btn>
        </v-col>

        <v-col class="d-flex justify-center">
          <v-btn
            v-if="!isFinished && isEditable"
            flat
            variant="text"
            class="text-link-btn"
            @click="openFinishProfileDialog"
            >Finish Profile</v-btn
          >
        </v-col>

        <v-col class="d-flex justify-center">
          <v-btn
            flat
            variant="text"
            color="blue"
            @click="router.push(`/profiles/${userProfile.displayname}`)"
            class="text-link-btn"
            >Public Profile
          </v-btn>
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
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
          <span>Loading...</span>
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
          <v-col class="text-center"
            >Are you sure you want to delete your account? This action cannot be
            undone.</v-col
          ></v-row
        >
      </v-card-text>

      <template v-slot:actions>
        <v-btn
          v-if="!isMarkedForDeletion"
          color="primary"
          text
          @click="confirmDelete"
          >Confirm</v-btn
        >
        <v-btn v-else color="primary" text @click="cancelDelete"
          >Restore Account</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          class="ms-auto"
          text="Cancel"
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
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useLocationManager } from "@/composables/useLocationManager";

const {
  getStatuses,
  getGenders,
  updateGender,
  hasInterests,
  hasEmail,
  updateProfile,
  authUpdateProfile,
} = useDb();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const user = ref(authStore.user);
const userProfile = ref(authStore.userProfile);

// const genders = ref([]);

const genders = ref([
  { id: null, name: "Please select a gender" },
  { id: 1, name: "Male" },
  { id: 2, name: "Female" },
  { id: 3, name: "Other" },
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
    router.push("/chat");
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

  isFinished.value = userProfile.value.tagline && userHasInterests && userHasEmail;
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
      await updateProfile( userProfile.value.user_id,
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
                    userProfile.value.site_url);

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
    await authUpdateProfile(true, null);
    isMarkedForDeletion.value = true;
  } catch (error) {
    console.error("Error deleting account:", error.message);
  }
};

const cancelDelete = async () => {
  try {
    await authUpdateProfile(false, new Date().toISOString());
    isMarkedForDeletion.value = false;
  } catch (error) {
    console.error("Error deleting account:", error.message);
  }
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
