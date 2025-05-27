<template>
  <!-- <v-container fluid class="pa-0"> -->
    <v-row>
      <v-col cols="12" sm="auto">
        <v-menu v-model="menu" :close-on-content-click="false" location="end">
          <template v-slot:activator="{ props }">
            <v-btn variant="tonal" color="primary" v-bind="props" class="rounded-lg">
              <v-icon start>mdi-filter-variant</v-icon>
              Filters
              <v-badge v-if="selectedGender !== null || selectedAge[0] !== 18 || selectedAge[1] !== 100" color="red" dot
                overlap class="ml-2" />
            </v-btn>
          </template>

          <v-card class="pa-4" :width="$vuetify.display.smAndDown ? '100%' : 400" max-height="90vh"
            style="overflow-y: auto;" rounded="lg" elevation="4">
            <!-- User Info -->
            <v-row class="mb-4 mt-2" align="center" no-gutters>
              <div class="d-flex flex-column justify-center">
                <span class="text-body-1 font-weight-medium">{{ userProfile.displayname }}</span>
                <span class="text-caption text-grey">{{ userProfile.tagline }}</span>
              </div>
            </v-row>

            <v-divider class="my-2" />

            <!-- Gender -->
            <v-list-subheader>
              <v-icon size="18" class="mr-1">mdi-gender-male-female</v-icon> Gender
            </v-list-subheader>
            <v-select v-model="selectedGender" :items="genders" item-title="text" item-value="value" density="compact"
              variant="outlined" class="mb-4" @change="applyFilters">
              <template #selection="{ item }">
                <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                {{ item.raw.text }}
              </template>

              <!-- Dropdown list items -->
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon size="small" class="mr-2">{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-select>


            <!-- Statuses -->
            <v-list-subheader>
              <v-icon size="18" class="mr-1">mdi-ring</v-icon> Status
            </v-list-subheader>
            <v-select v-model="selectedStatus" :items="statuses" item-title="name" item-value="id" density="compact"
              variant="outlined" class="mb-4" label="Select a status" @change="applyFilters">
              <template #selection="{ item }">
                <v-icon start size="small">{{ item.raw.icon }}</v-icon>
                {{ item.raw.name }}
              </template>

              <!-- Dropdown list items -->
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon size="small" class="mr-2">{{ item.raw.icon }}</v-icon>
                  </template>
                  <v-list-item-title>{{ item.raw.text }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-select>

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

            <!-- Country -->
            <v-list-subheader>
              <v-icon size="18" class="mr-1">mdi-flag</v-icon> Country
            </v-list-subheader>
            <v-select v-model="selectedCountry" :items="countries" item-title="name" item-value="id" density="compact"
              variant="outlined" class="mb-4" label="Select a country" @change="applyFilters" />

            <!-- Actions -->
            <v-divider class="my-3" />
            <v-card-actions>
              <v-btn variant="text" color="error" @click="clearFilters">
                <v-icon start size="small">mdi-close-circle</v-icon>
                Clear
              </v-btn>
              <v-spacer />
              <v-btn variant="text" @click="menu = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" @click="saveFilters">Apply</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </v-col>

      <!-- <v-col class="text-caption text-medium-emphasis mt-2">
        <OnlineUsersCount />
      </v-col> -->
    </v-row>
  <!-- </v-container> -->
</template>



<script setup>
import { usePresenceStore } from '@/stores/presenceStore';

const { getInterests, getCountries, getStatuses } = useDb();

const presenceStore = usePresenceStore();
// const rowCount = ref(presenceStore.onlineUsers.length); // Initialize with the current online users count
// watch(() => presenceStore.userIdsOnly, (newVal) =>
// {
//   rowCount.value = newVal.length;
// });
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
});

const emit = defineEmits(["filter-changed"]);
const genders = [
  { text: "Male", value: 1, icon: "mdi-gender-male"},
  { text: "Female", value: 2, icon: "mdi-gender-female" },
  { text: "Other", value: 3, icon: "mdi-gender-male-female" },
  { text: "All", value: null, icon: "mdi-all-inclusive"},
];

const anonymity = [
  { text: "All", value: null },
  { text: "Only Registered Users", value: false },
  { text: "Only Anonymous Users", value: true },
];

const statuses = ref([]);
const selectedStatus = ref(null);

const countries = ref([]);
const selectedCountry = ref(null);

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
    selectedInterests.value,
    "and country:",
    selectedCountry.value,
    "and status:",
    selectedStatus.value
  );

  if (selectedInterests.value?.length === 0) {
    selectedInterests.value = null;
    
  }
  emit("filter-changed", {
    gender_id: selectedGender.value,
    age_range: selectedAge.value,
    is_anonymous: selectedAnonymous.value,
    interests: selectedInterests.value,
    country_id: selectedCountry.value,
    status_id: selectedStatus.value,
  });
};

const clearFilters = () =>
{
  selectedGender.value = null;
  selectedStatus.value = null;
  selectedAge.value = [18, 100];
  selectedAnonymous.value = null;
  selectedInterests.value = null;
  selectedCountry.value = null;

  applyFilters(); // emit cleared values
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

  const rawCountries = await getCountries();
  countries.value = [
    { id: null, name: "All Countries"},
    ...rawCountries,
  ];

  const rawStatuses = await getStatuses();
  statuses.value = [
    { id: null, name: "All Statuses", icon: "mdi-account-question" },
    ...rawStatuses,
  ];
});
</script>

<style scoped>
@media (max-width: 600px) {
  .v-menu__content {
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: none !important;
  }
}

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
