<template>
  <v-container
    fluid
    v-if="!isAuthenticated"
    class="d-flex flex-column align-center justify-center fill-height"
  >
    <div class="w-100">
      <HomeRow1 />
    </div>
    <v-row justify="center" align="center">
      <v-col cols="auto">
        <LoginAi />
      </v-col>
    </v-row>
  </v-container>
  <v-container fluid v-else>
    <div class="w-100">
      <HomeRow1 />
    </div>
    <v-fade-transition mode="out-in">
      <v-container
        fluid
        class="d-flex align-center justify-center"
        style="min-height: 70vh"
      >
        <v-row>
          <v-col class="text-center d-flex flex-column align-center">
            <h1 class="green--text-h1">
              You're logged in as {{ loggedInUser }}
            </h1>
            <h2 class="text-h6">Where would you like to go?</h2>
            <v-row>
              <v-col>
                <v-btn to="/chat" class="mt-4"
                  >Chat <v-icon right>mdi-arrow-right</v-icon></v-btn
                >
              </v-col>
              <v-col>
                <v-btn to="/settings" class="mt-4"
                  >Settings <v-icon right>mdi-arrow-right</v-icon></v-btn
                >
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-fade-transition>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";

const { getInterests, getDescriptions, updateProfilePhoto } = useDb();
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
      await updateProfilePhoto(avatarUrl.value, authStore.user?.id);
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

  const { data: lookingForOptionsData, optionsError } = await getInterests();

  const { data: descriptionOptionsData, descriptionsError } = await getDescriptions();

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
  font-size: 10px;
  /* Adjust the size of the dots */
  width: 12px;
  height: 12px;
}

.active-dot {
  color: #1976d2;
  /* Active dot color */
}

.grey--text {
  color: #ccc;
  /* Inactive dot color */
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
