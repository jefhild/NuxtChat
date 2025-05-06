<template>
  <v-row>
    <v-col cols="auto">
      <v-menu v-model="menu" :close-on-content-click="false" location="end">
        <template v-slot:activator="{ props }">
          <v-btn variant="tonal" color="primary" v-bind="props" class="rounded-lg">
            <v-icon start>mdi-filter-variant</v-icon>
            Filters
            <v-badge v-if="selectedGender !== null || selectedAge[0] !== 18 || selectedAge[1] !== 100" color="red" dot
              overlap class="ml-2" />
          </v-btn>
        </template>

        <v-card class="pa-4" width="400" rounded="lg" elevation="4">
          <!-- User Info -->
          <v-row class="mb-4 mt-2" align="center" no-gutters>
            <div class="d-flex flex-column justify-center">
              <span class="text-body-1 font-weight-medium">{{ userProfile.displayname }}</span>
              <span class="text-caption text-grey">{{ userProfile.tagline }}</span>
            </div>
          </v-row>

          <v-divider class="my-2" />

          <!-- AI Toggle  -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-robot</v-icon> Show AI Users
          </v-list-subheader>
          <v-switch :model-value="showAIUsers" @update:model-value="handleToggleUsers" color="primary" hide-details
            inset class="mr-10" style="margin-top: -4px" />

          <!-- Gender -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-gender-male-female</v-icon> Gender
          </v-list-subheader>
          <v-select v-model="selectedGender" :items="genders" item-title="text" item-value="value" density="compact"
            variant="outlined" class="mb-4" @change="applyFilters" />

          <!-- Age Range -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-calendar-range</v-icon> Age Range
          </v-list-subheader>
          <v-range-slider v-model="selectedAge" :min="18" :max="80" step="1" class="mb-4" color="deep-purple"
            @change="applyFilters">
            <template #prepend>
              <v-chip size="small" color="grey-lighten-1" text-color="black">{{ selectedAge[0] }}</v-chip>
            </template>
            <template #append>
              <v-chip size="small" color="grey-lighten-1" text-color="black">{{ selectedAge[1] }}</v-chip>
            </template>
          </v-range-slider>

          <!-- Anonymity -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-incognito</v-icon> Anonymity
          </v-list-subheader>
          <v-select v-model="selectedAnonymous" :items="anonymity" item-title="text" item-value="value"
            density="compact" variant="outlined" class="mb-4" @change="applyFilters" />

          <!-- Interests -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-heart-multiple</v-icon> Interests
          </v-list-subheader>
          <v-select v-model="selectedInterests" :items="interests" item-title="name" item-value="id"
            label="Choose interests" multiple chips closable-chips variant="outlined" density="compact" class="mb-4"
            @change="applyFilters">
            <!-- Selection Chip -->
            <template #selection="{ item }">
              <v-chip :color="item.raw.color" size="small" class="ma-1">
                <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                <span class="mr-1">{{ item.raw.emoji }}</span>
                {{ item.raw.name }}
              </v-chip>
            </template>

            <!-- Dropdown Item List -->
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon size="small" :color="item.raw.color" class="mr-2">{{ item.raw.icon }}</v-icon>
                  <span class="mr-2">{{ item.raw.emoji }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Actions -->
          <v-divider class="my-3" />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="menu = false">Cancel</v-btn>
            <v-btn color="primary" variant="flat" @click="saveFilters">Apply</v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-col>

    <v-col class="text-caption text-medium-emphasis mt-2">
      {{ rowCount }} users online
    </v-col>
  </v-row>
</template>



<script setup>


import { usePresenceStore } from '@/stores/presenceStore';

const { getInterests } = useDb();

const presenceStore = usePresenceStore();
const rowCount = ref(presenceStore.onlineUsers.length); // Initialize with the current online users count
watch(() => presenceStore.userIdsOnly, (newVal) =>
{
  rowCount.value = newVal.length;
});
const menu = ref(false);
const selectedGender = ref(null);
const selectedAge = ref([18, 100]); // Default age range
const selectedAnonymous = ref(null); // Default to null (All)

const props = defineProps({
  userProfile: {
      type: Object,
    required: true,
    validator(value) {
      return value && value.user_id !== undefined && value.user_id !== null;
    },
  },
  showAIUsers: Boolean, // Accept the current state as a prop
});

const localShowAIUsers = ref(props.showAIUsers);

const emit = defineEmits(["filter-changed","toggle-users"]);
const genders = [
  { text: "Male", value: 1 },
  { text: "Female", value: 2 },
  { text: "Other", value: 3 },
  { text: "All", value: null },
];

const anonymity = [
  { text: "All", value: null },
  { text: "Only Registered Users", value: false },
  { text: "Only Anonymous Users", value: true },
];

const interests = ref([]);
const selectedInterests = ref([]);

const applyFilters = () => {
  console.log(
    "Applying filters with gender:",
    selectedGender.value,
    "and age range:",
    selectedAge.value,
    "and anonymity:",
    selectedAnonymous.value,
    "and interests:",
    selectedInterests.value
  );
  emit("filter-changed", {
    gender_id: selectedGender.value,
    age_range: selectedAge.value,
    is_anonymous: selectedAnonymous.value,
    interests: selectedInterests.value,
  });
};
const handleToggleUsers = () => {
  // Toggle the state and emit an event to the parent
  emit("toggle-users", !props.showAIUsers);
};

const saveFilters = () => {
  applyFilters();
  menu.value = false; // Close the menu
};

onMounted(async () =>
{
  const {data} = await getInterests();
  interests.value = data;
  selectedInterests.value = interests.value.map((interest) => interest.id); // Select all interests by default
  console.log("userprofile", props.userProfile);  
});
</script>

<style scoped>
.exclamation-badge {
  position: absolute;
  top: 3px;
  right: 3px;
}

.slider-label {
  font-size: 13px;
  font-weight: 100;
}

/* Custom styles for the slider */
.custom-slider .v-slider-track-fill {
  background-color: #ff5722 !important; /* Change track fill color */
}

.custom-slider .v-slider-thumb {
  background-color: #673ab7 !important; /* Change thumb color */
  border: 2px solid #ffffff !important; /* Optional: Change thumb border color */
}

.custom-slider .v-slider-track-container {
  background-color: #bdbdbd !important; /* Change track container color */
}
</style>
