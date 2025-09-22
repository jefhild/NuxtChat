<template>
  <v-row>
    <!-- {{ props.authStatus }} -->
    <v-col cols="12" sm="auto">
      <!-- {{ showAIUsers }} -->
      <v-menu v-model="menu" :close-on-content-click="false" location="end">
        <template v-slot:activator="{ props }">
          <v-btn
            variant="tonal"
            color="primary"
            v-bind="props"
            class="rounded-lg"
            :disabled="disableToggle"
          >
            <v-icon start>mdi-filter-variant</v-icon>
            {{ $t("components.filter-menu.filters") }}
            <v-badge
              v-if="
                selectedGender !== null ||
                selectedAge[0] !== 18 ||
                selectedAge[1] !== 100
              "
              color="red"
              dot
              overlap
              class="ml-2"
            />
          </v-btn>
        </template>

        <v-card
          class="pa-4"
          :width="$vuetify.display.smAndDown ? '100%' : 400"
          max-height="90vh"
          style="overflow-y: auto"
          rounded="lg"
          elevation="4"
        >
          <!-- User Info -->
          <v-row class="mb-1 mt-2" align="center" no-gutters>
            <div class="d-flex flex-column justify-center">
              <span class="text-body-1 font-weight-medium">{{
                userProfile.displayname
              }}</span>
              <span class="text-caption text-grey">{{
                userProfile.tagline
              }}</span>
            </div>
          </v-row>

          <v-divider />

          <!-- Gender -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-gender-male-female</v-icon>
            {{ $t("components.filter-menu.gender") }}
          </v-list-subheader>
          <v-select
            v-model="selectedGender"
            :items="genders"
            item-title="text"
            item-value="value"
            density="compact"
            variant="outlined"
            class="small-select"
            :menu-props="{ contentClass: 'small-select-menu' }"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          >
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
            <v-icon size="18" class="mr-1">mdi-ring</v-icon>
            {{ $t("components.filter-menu.status") }}
          </v-list-subheader>
          <v-select
            v-model="selectedStatus"
            :items="statuses"
            item-title="name"
            item-value="id"
            density="compact"
            variant="outlined"
            class="small-select"
            :menu-props="{ contentClass: 'small-select-menu' }"
            label="Select a status"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          >
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
            <v-icon size="18" class="mr-1">mdi-calendar-range</v-icon>
            {{ $t("components.filter-menu.age-range") }}
          </v-list-subheader>
          <v-range-slider
            v-model="selectedAge"
            :min="18"
            :max="80"
            step="1"
            class=""
            color="deep-purple"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          >
            <template #prepend>
              <v-chip size="small" color="grey-lighten-1" text-color="black">{{
                selectedAge[0]
              }}</v-chip>
            </template>
            <template #append>
              <v-chip size="small" color="grey-lighten-1" text-color="black">{{
                selectedAge[1]
              }}</v-chip>
            </template>
          </v-range-slider>

          <!-- Anonymity -->
          <!-- <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-incognito</v-icon>
            {{ $t("components.filter-menu.anonymity") }}
          </v-list-subheader>
          <v-select
            v-model="selectedAnonymous"
            :items="anonymity"
            item-title="text"
            item-value="value"
            density="compact"
            variant="outlined"
            class="small-select"
            :menu-props="{ contentClass: 'small-select-menu' }"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          /> -->

          <!-- Interests -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-heart-multiple</v-icon>
            {{ $t("components.filter-menu.interests") }}
          </v-list-subheader>
          <v-select
            v-model="selectedInterests"
            :items="interests"
            item-title="name"
            item-value="id"
            label="Choose interests"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="compact"
            class="small-select"
            :menu-props="{ contentClass: 'small-select-menu' }"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          >
            <!-- Dropdown Item List -->
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon size="small" :color="item.raw.color" class="mr-2">{{
                    item.raw.icon
                  }}</v-icon>
                  <span class="mr-2">{{ item.raw.emoji }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Country -->
          <v-list-subheader>
            <v-icon size="18" class="mr-1">mdi-flag</v-icon>
            {{ $t("components.filter-menu.country") }}
          </v-list-subheader>
          <v-select
            v-model="selectedCountry"
            :items="countries"
            item-title="name"
            item-value="id"
            density="compact"
            variant="outlined"
            class="small-select"
            :menu-props="{ contentClass: 'small-select-menu' }"
            label="Select a country"
            :disabled="!isAllowed"
            @update:modelValue="applyFilters"
          />

          <!-- Actions -->
          <v-divider class="my-3" />
          <v-card-actions>
            <v-btn variant="text" color="error" @click="clearFilters">
              <v-icon start size="small">mdi-close-circle</v-icon>
              {{ $t("components.filter-menu.clear") }}
            </v-btn>
            <v-spacer />
            <!-- <v-btn variant="text" @click="menu = false">{{
              $t("components.filter-menu.cancel")
            }}</v-btn>
            <v-btn color="primary" variant="flat" @click="saveFilters">{{
              $t("components.filter-menu.apply")
            }}</v-btn> -->
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-col>
  </v-row>
</template>

<script setup>
import { usePresenceStore2 } from "@/stores/presenceStore2";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const { getInterests, getCountries, getStatuses } = useDb();

const presenceStore = usePresenceStore2();
const menu = ref(false);
const selectedGender = ref(null);
const selectedAge = ref([18, 100]); // Default age range
const selectedAnonymous = ref(null); // Default to null (All)

const props = defineProps({
  userProfile: {
    type: [Object, null],
    default: null,
    validator(value) {
      return typeof value === "object";
    },
  },
  authStatus: {
    type: String,
    default: false,
  },
  disableToggle: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["filter-changed"]);
const genders = [
  { text: t("components.filter-menu.male"), value: 1, icon: "mdi-gender-male" },
  {
    text: t("components.filter-menu.female"),
    value: 2,
    icon: "mdi-gender-female",
  },
  {
    text: t("components.filter-menu.other"),
    value: 3,
    icon: "mdi-gender-male-female",
  },
  {
    text: t("components.filter-menu.all"),
    value: null,
    icon: "mdi-all-inclusive",
  },
];

const anonymity = [
  { text: t("components.filter-menu.all"), value: null },
  { text: t("components.filter-menu.registered"), value: false },
  { text: t("components.filter-menu.anony"), value: true },
];

const statuses = ref([]);
const selectedStatus = ref(null);

const countries = ref([]);
const selectedCountry = ref(null);

const interests = ref([]);
const selectedInterests = ref([]);

const applyFilters = () => {
  if (selectedInterests.value?.length === 0) {
    selectedInterests.value = null;
  }

  const allInterestIds = interests.value.map((i) => i.id);
  const isAllSelected =
    Array.isArray(selectedInterests.value) &&
    selectedInterests.value.length === allInterestIds.length;

  const interestsToEmit =
    !isAllSelected && selectedInterests.value?.length
      ? selectedInterests.value
          .map((id) => interests.value.find((i) => i.id === id)?.name)
          .filter(Boolean)
      : null;

  const chosen = countries.value.find((c) => c.id === selectedCountry.value);
  const countryName = chosen?.name ?? null;

  // if "All Countries" or empty → null
  const normalizedCountryName =
    countryName && countryName.toLowerCase() !== "all countries"
      ? countryName
      : null;

  emit("filter-changed", {
    gender_id: selectedGender.value,
    age_range: selectedAge.value,
    is_anonymous: selectedAnonymous.value,
    interests: interestsToEmit,
    country_id: selectedCountry.value,
    country_name: normalizedCountryName,
    status_id: selectedStatus.value,
  });
};

const clearFilters = () => {
  selectedGender.value = null;
  selectedStatus.value = null;
  selectedAge.value = [18, 100];
  selectedAnonymous.value = null;
  selectedInterests.value = null;
  selectedCountry.value = null;

  applyFilters(); // emit cleared values
};


const isAllowed = computed(() =>
  ["anon_authenticated", "authenticated"].includes(props.authStatus)
);

onMounted(async () => {
  const { data } = await getInterests();
  interests.value = data;
  selectedInterests.value = interests.value.map((interest) => interest.id); // Select all interests by default
  // selectedInterests.value = null;

  const rawCountries = await getCountries();
  countries.value = [{ id: null, name: "All Countries" }, ...rawCountries];

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

/* Label & chips INSIDE the field — need :deep to beat scoped boundary */
:deep(.small-select .v-field-label) {
  font-size: 0.8rem;
}

:deep(.small-select .v-chip) {
  font-size: 0.75rem;
  padding: 0 4px;
}

/* Optional: shrink the input text (the selected value area) */
:deep(.small-select .v-field__input) {
  font-size: 0.85rem;
}
</style>

<!-- Not scoped: the menu is teleported to <body> -->
<style>
.small-select-menu .v-list-item-title {
  font-size: 0.85rem;
}

.small-select-menu .v-list-item {
  min-height: 32px; /* tighten vertical spacing */
}
</style>
