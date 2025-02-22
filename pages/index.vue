<template>
    <div v-if="!isAuthenticated">
      <!-- Screen transition -->
      <v-fade-transition mode="out-in">
        <v-container
          v-if="currentStep === 1"
          key="step1"
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <HomeStep1
            v-model="age"
            :isAgeConfirmed="isAgeConfirmed"
            @update:isAgeConfirmed="handleAgeConfirmation"
          />
        </v-container>

        <v-container
          v-else-if="currentStep === 2"
          key="step2"
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center">
              <h1 class="green--text-h1">Create a chat handle:</h1>
              <h2 class="text-h6">How would you like people to know you?</h2>
              <v-row no-gutters class="d-flex justify-center">
                <v-col cols="8" md="4" class="d-flex justify-center mt-5">
                  <v-row
                    ><v-col cols="7">
                      <DisplayNameField
                        :displayName="displayName"
                        :isEditable="!isProfileCreated"
                        @updateDisplayName="handleUpdateDisplayName"
                        @validation="handleValidation" /></v-col
                    ><v-col>
                      <GenderSelection
                        v-model="selectedGender"
                        :selectedGender="selectedGender"
                        :genders="genders"
                        :isEditable="true"
                        @validation="handleGenderValidation" /></v-col
                  ></v-row>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>

        <v-container
          v-else-if="currentStep === 3"
          key="step3"
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center">
              <h1 class="green--text-h1">Set the stage</h1>
              <!-- <h2 class="text-h6">2 more questions</h2> -->
              <!-- {{ displayName }} {{ selectedGender }} -->
              <div class="profile-photo">
                <!-- authStore: {{ authStore.userProfile }} avatarURL: {{ avatarUrl }} -->
                <div class="mt-4">
                  <LookingForDisplay2
                    :lookingForIcons="selectedLookingForIcons"
                  />
                </div>
                <div class="mt-3">
                  <LookingForMenu2
                    :lookingForOptions="lookingForOptions"
                    :userLookingForIds="userLookingForIds"
                    @update:userLookingForIds="updateUserLookingForIds"
                  />
                </div>
                <div class="mt-4">
                  <DescriptionDisplay2
                    :descriptionIcons="selectedDescriptionIcons"
                  />
                </div>
                <div class="mt-4">
                  <DescriptionMenu2
                    :descriptionOptions="descriptionOptions"
                    :userDescriptionIds="userDescriptionIds"
                    @update:userDescriptionIds="updateDescriptionIds"
                  />
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>

        <!-- Repeat for more steps -->
        <v-container
          v-else-if="currentStep === 4"
          key="step4"
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center">
              <h1 class="green--text-h1" v-if="!isLoading">Choose an avatar</h1>
              <div v-if="isLoading" class="loading-spinner">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="64"
                ></v-progress-circular>
                <p class="mt-3">Creating your profile...</p>
              </div>
              <div v-else class="profile-photo">
                <!-- authStore: {{ authStore.userProfile }} avatarURL: {{ avatarUrl }} -->
                <ProfilePhoto4
                  :selectedGender="selectedGender"
                  @updateAvatarUrl="handleUpdateAvatarUrl"
                />
              </div>
            </v-col>
          </v-row>
        </v-container>

        <v-container
          v-else-if="currentStep === 5"
          key="step5"
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center">
              <h1 class="green--text-h1">Start Chatting</h1>
              <h2 class="text-h6">
                Add a real photo & bio in
                <NuxtLink to="/settings"> settings.</NuxtLink>
              </h2>
              <div class="start-chatting mt-3">
                <HomeStep5 :userProfile="authStore.userProfile" />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-fade-transition>

      <!-- Progress dots -->
      <div class="d-flex justify-center mt-4">
        <v-icon
          v-for="step in totalSteps"
          :key="step"
          class="mx-2 small-dot"
          :class="currentStep === step ? 'active-dot' : 'grey--text'"
        >
          mdi-circle
        </v-icon>
      </div>

      <!-- Navigation buttons -->
      <div class="d-flex justify-center mt-4">
        <v-btn v-if="currentStep > 1" @click="prevStep"> Previous </v-btn>
        <v-btn
          @click="nextStep"
          class="ml-4"
          :disabled="!isFormValid || currentStep === totalSteps || isLoading"
          :loading="isLoading"
        >
          Next
          <v-icon right>mdi-arrow-right</v-icon>
        </v-btn>
      </div>
    <!-- </div> -->
  </div>
  <div v-else>
    <v-fade-transition mode="out-in">
      <v-container
        fluid
        class="d-flex align-center justify-center"
        style="min-height: 70vh"
      >
        <v-row>
          <v-col class="text-center d-flex flex-column align-center">
            <h1 class="green--text-h1">You're logged in as {{ loggedInUser }}</h1>
            <h2 class="text-h6">Where would you like to go?</h2>
            <v-row
              ><v-col>
                <v-btn to="/chat" class="mt-4"
                  >Chat <v-icon right>mdi-arrow-right</v-icon></v-btn
                ></v-col
              ><v-col>
                <v-btn to="/settings" class="mt-4"
                  >Settings <v-icon right>mdi-arrow-right</v-icon></v-btn
                ></v-col
              ></v-row
            >
          </v-col>
        </v-row>
      </v-container>
    </v-fade-transition>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";

const supabase = useSupabaseClient();
// Track the current step
const authStore = useAuthStore();
const currentStep = ref(1);
const avatarUrl = ref(
  authStore.userProfile?.avatar_url || "/images/avatars/ai/male_avatar_1.webp"
);
const loggedInUser = ref(authStore.userProfile?.displayname || "??");
const isFormValid = ref(false);
const isDisplayNameValid = ref(false);
const isGenderValid = ref(false);
const age = ref(18);
const isAgeConfirmed = ref(false); // New reactive variable for the age checkbox
const displayName = ref("");
const isLoading = ref(false);
const isProfileCreated = ref(false); // New flag to track profile creation status
const isAuthenticated = ref(false);
const selectedGender = ref(null);
const genders = ref([
  { id: null, name: "Please select a gender" },
  { id: 1, name: "Male" },
  { id: 2, name: "Female" },
  { id: 3, name: "Other" },
]);

const lookingForOptions = ref([]);
const descriptionOptions = ref([]);

// Initialize userLookingForIds with default selections
const userLookingForIds = ref([]);
const userDescriptionIds = ref([]);
// Total number of steps
const totalSteps = 5;

// Define and update default selections based on gender
const updateDefaultSelections = () => {
  if (selectedGender.value === 1) {
    // Male
    userLookingForIds.value = [5, 3, 2];
    userDescriptionIds.value = [5, 3, 2];
  } else if (selectedGender.value === 2) {
    // Female
    userLookingForIds.value = [4, 3, 2];
    userDescriptionIds.value = [4, 3, 2];
  } else if (selectedGender.value === 3) {
    // other
    userLookingForIds.value = [6, 3, 2];
    userDescriptionIds.value = [6, 3, 2];
  }
};

// Validate the entire form based on the current step
const updateFormValidity = () => {
  if (currentStep.value === 1) {
    isFormValid.value = isAgeConfirmed.value; // Only age matters in step 1
  } else if (currentStep.value === 2) {
    isFormValid.value = isDisplayNameValid.value && isGenderValid.value; // Check display name and gender in step 2
  } else {
    isFormValid.value = true; // For other steps, assume form is valid
  }
};

// Validate the display name
const updateNameValidity = () => {
  isDisplayNameValid.value = displayName.value.trim().length >= 4;
  updateFormValidity();
};

// Handle display name updates
const handleUpdateDisplayName = (newDisplayName) => {
  displayName.value = newDisplayName;
  updateNameValidity();
};

// Handle gender validation
const handleGenderValidation = (isValid) => {
  isGenderValid.value = isValid;
  updateFormValidity();
};

// This method should handle validation from the DisplayNameField component
const handleValidation = (isValid) => {
  isDisplayNameValid.value = isValid;
  updateFormValidity();
};

const handleAgeConfirmation = (newValue) => {
  isAgeConfirmed.value = newValue;
  updateFormValidity(); // Update form validity on checkbox change
};

// Method to handle profile creation (assuming checkAuthAnony handles that)
const handleProfileCreation = async () => {
  isLoading.value = true;

  try {
    await authStore.checkAuthAnony({
      displayName: displayName.value,
      age: age.value,
      selectedGender: selectedGender.value,
      avatarUrl: avatarUrl.value,
      userLookingForIds: userLookingForIds.value, // Assuming userLookingForIds is reactive
      userDescriptionIds: userDescriptionIds.value, // Assuming userDescriptionIds is reactive
    });

    isProfileCreated.value = true;
  } catch (error) {
    console.error("Error during profile creation:", error);
  }
};

// Method to update the avatar URL in the profile
const updateAvatarUrl = async () => {
  if (authStore.userProfile?.avatar_url !== avatarUrl.value) {
    try {
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl.value })
        .eq("user_id", authStore.user?.id);
      authStore.userProfile.avatar_url = avatarUrl.value; // Update local state
    } catch (error) {
      console.error("Error updating avatar URL:", error);
    }
  }
};

// Update avatar URL when child emits the event
const handleUpdateAvatarUrl = (newUrl) => {
  avatarUrl.value = newUrl;
};

// Methods to navigate between steps

const nextStep = async () => {
  // Perform validations specific to each step
  if (currentStep.value === 1 && !isAgeConfirmed.value) {
    console.error("You must confirm your age");
    return;
  }

  if (currentStep.value === 2) {
    if (!isDisplayNameValid.value) {
      console.error("Display Name must be at least 4 characters");
      return;
    }
    if (!isGenderValid.value) {
      console.error("You must select a gender");
      return;
    }
  }
  if (currentStep.value === 4) {
    isLoading.value = true; // Start loading state
    await handleProfileCreation();
    setTimeout(() => {
      currentStep.value++;
      isLoading.value = false; // End loading state after moving steps
    }, 300);

    return;
  }

  // If everything is valid, move to the next step
  if (currentStep.value < totalSteps) {
    currentStep.value++;
    updateFormValidity(); // Recalculate form validity after step change
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    if (currentStep.value === 3 && authStore.userProfile) {
      avatarUrl.value = authStore.userProfile.avatar_url || "";
    }
  }
};

function updateUserLookingForIds(updatedIds) {
  userLookingForIds.value = updatedIds;
}

const selectedLookingForIcons = computed(() =>
  lookingForOptions.value.filter((option) =>
    userLookingForIds.value.includes(option.id)
  )
);

function updateDescriptionIds(updatedIds) {
  userDescriptionIds.value = updatedIds;
}

const selectedDescriptionIcons = computed(() =>
  descriptionOptions.value.filter((option) =>
    userDescriptionIds.value.includes(option.id)
  )
);

// Watch for changes in gender to set default selections
watch(selectedGender, () => {
  updateDefaultSelections();
});

// Initialize authentication status
onMounted(async () => {
  isLoading.value = true; // Set loading to true initially
  await authStore.checkAuth();
  // console.log("User:", authStore.user); // Debug to see if the user is correctly fetched
  isAuthenticated.value = authStore.user !== null;
  // console.log("isAuthenticated:", isAuthenticated.value); // Debug to check if this evaluates correctly

  const { data: lookingForOptionsData, optionsError } = await supabase
    .from("looking_for")
    .select("*");

  const { data: descriptionOptionsData, descriptionsError } = await supabase
    .from("descriptions")
    .select("*");

  if (!optionsError || !descriptionsError) {
    lookingForOptions.value = lookingForOptionsData;
    descriptionOptions.value = descriptionOptionsData;
    updateDefaultSelections(); // Set default selections after fetching options
  }
  isLoading.value = false;
  loggedInUser.value = authStore.userProfile?.displayname || "??";
});

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com",
    },
  ],
  title: "Free Anonymous Real or AI Chat",
}));

useSeoMeta({
  title: "Free Anonymous Chat (Real or AI)",
  description:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  ogTitle: "Real & AI Chat Profiles",
  ogDescription:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Female Profiles",
  twitterDescription:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  // twitterImage: popularProfiles[0].value.avatar_url,
});
</script>

<style scoped>
.start-chatting {
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.green--text-h2 {
  font-family: "poppins", sans-serif;
  font-size: 1.2rem;
  font-weight: 100;
  color: rgb(51, 90, 78);
}

.imchattyLogo {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgb(80, 51, 90);
}

.small-dot {
  font-size: 10px; /* Adjust the size of the dots */
  width: 12px;
  height: 12px;
}

.active-dot {
  color: #1976d2; /* Active dot color */
}

.grey--text {
  color: #ccc; /* Inactive dot color */
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
