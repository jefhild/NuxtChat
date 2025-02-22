<template>
  <div class="text-left">
    <v-menu v-model="menu" :close-on-content-click="false" location="end">
      <template v-slot:activator="{ props }">
        <v-btn variant="text" color="green" v-bind="props">
          Filter
          <v-badge
            v-if="selectedGender !== null"
            color="red"
            dot
            overlap
            class="exclamation-badge"
          >
          </v-badge>
        </v-btn>
      </template>

      <v-card min-width="300">
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
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn variant="text" @click="menu = false"> Cancel </v-btn>
          <v-btn color="primary" variant="text" @click="saveFilters">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup>
const menu = ref(false);
const selectedGender = ref(null);

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
  { text: "Male", value: 1 },
  { text: "Female", value: 2 },
  { text: "Other", value: 3 },
  { text: "All", value: null },
];

const applyFilters = () => {
  console.log("Applying filters with gender:", selectedGender.value); // Debug log
  emit("filter-changed", { gender_id: selectedGender.value });
};

const saveFilters = () => {
  applyFilters();
  menu.value = false; // Close the menu
};
</script>

<style scoped>
.exclamation-badge {
  position: absolute;
  top: 3px;
  right: 3px;
}
</style>
