<template>
  <v-row>
    <v-col cols="auto">
      <v-menu v-model="menu" :close-on-content-click="false" location="end">
        <template v-slot:activator="{ props }">
          <v-btn variant="text" color="green" v-bind="props">
            Filter

            <v-badge
              v-if="
                selectedGender !== null ||
                selectedAge[0] !== 18 ||
                selectedAge[1] !== 70
              "
              color="red"
              dot
              overlap
              class="exclamation-badge"
            >
            </v-badge>
          </v-btn>
        </template>

        <v-card min-width="350">
          <v-list>
            <v-list-item
              v-if="userProfile"
              :prepend-avatar="userProfile.avatar_url"
              :subtitle="userProfile.tagline"
              :title="userProfile.displayname"
            >
            </v-list-item>
          </v-list>
          <v-list>
            <v-list-item class="text-center">
              <v-btn @click="handleToggleUsers" class="mb-3">
                {{ showAIUsers ? "Human Users" : "AI Users" }}
              </v-btn>
            </v-list-item>
          </v-list>

          <v-list>
            <v-list-item>
              <v-select
                v-model="selectedGender"
                :items="genders"
                item-title="text"
                item-value="value"
                label="Gender"
                variant="underlined"
                @change="applyFilters"
              ></v-select>
            </v-list-item>
          </v-list>

          <v-list>
            <v-list-item>
              <div class="slider-label mb-2">Age Range</div>
              <v-range-slider
                v-model="selectedAge"
                :min="18"
                :max="80"
                :step="1"
                hide-details
                color="primary"
                track-color="grey lighten-2"
                @change="applyFilters"
              >
                <!-- Display value on the left (prepend slot) -->
                <template v-slot:prepend>
                  <span
                    style="
                      width: 70px;
                      display: inline-block;
                      text-align: center;
                    "
                  >
                    {{ selectedAge[0] }}
                  </span>
                </template>
                <!-- Display value on the right (append slot) -->
                <template v-slot:append>
                  <span
                    style="
                      width: 70px;
                      display: inline-block;
                      text-align: center;
                    "
                  >
                    {{ selectedAge[1] }}
                  </span>
                </template>
              </v-range-slider>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-spacer></v-spacer>

            <v-btn variant="text" @click="menu = false"> Cancel </v-btn>
            <v-btn color="primary" variant="text" @click="saveFilters">
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-col>
    <v-col class="text-caption text-medium-emphasis mt-2"
      >{{ rowCount }} users online</v-col
    >
  </v-row>
</template>

<script setup>
import { useOnlineRowCount } from "@/composables/useOnlineRowCount";
const { rowCount, getOnlineRowCount, loading, error } = useOnlineRowCount();
const menu = ref(false);
const selectedGender = ref(null);
const selectedAge = ref([18, 70]); // Default age range

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

const emit = defineEmits(["filter-changed"]);
const genders = [
  { text: "Male", value: 1 },
  { text: "Female", value: 2 },
  { text: "Other", value: 3 },
  { text: "All", value: null },
];

const applyFilters = () => {
  console.log(
    "Applying filters with gender:",
    selectedGender.value,
    "and age range:",
    selectedAge.value
  );
  emit("filter-changed", {
    gender_id: selectedGender.value,
    age_range: selectedAge.value,
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

const fetchOnlineRowCount = () => {
  getOnlineRowCount();
};

onMounted(async () => {
  fetchOnlineRowCount();
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
