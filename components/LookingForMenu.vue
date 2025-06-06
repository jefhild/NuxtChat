<template>
    <v-menu v-model="menu" :close-on-content-click="false" location="end">
      <template v-slot:activator="{ props }">
        <v-btn
          variant="text"
          append-icon="mdi-arrow-expand-right"
          v-bind="props"
          color="blue"
          >{{ $t("components.lookingFor.looking-for") }}
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

        <v-divider></v-divider>

        <v-list class="pa-2">
          <v-list-item
            v-for="option in lookingForOptions"
            :key="option.id"
            dense
            class="py-0"
          >
            <v-row align="center">
              <v-col>
                <v-switch
                  :model-value="userLookingForIds.includes(option.id)"
                  @update:model-value="
                    (value) => toggleLookingFor(option.id, value)
                  "
                  :label="option.name"
                  :color="
                    userLookingForIds.includes(option.id)
                      ? option.color
                      : 'black'
                  "
                  hide-details
                ></v-switch>
              </v-col>
              <v-col class="d-flex align-center justify-center">
                <v-icon
                  :color="
                    userLookingForIds.includes(option.id)
                      ? option.color
                      : 'black'
                  "
                  >{{ option.icon }}</v-icon
                >
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="menu = false"> {{ $t("components.lookingFor.cancel") }} </v-btn>
          <v-btn color="primary" variant="text" @click="saveChanges">
            {{ $t("components.lookingFor.save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const menu = ref(false);
const lookingForOptions = ref([]);
const userLookingForIds = ref([]);

const { getInterests, getInterestsIds, insertUserInterest, deleteUserInterest } = useDb();

const props = defineProps({
  userProfile: {
    type: Object,
    required: true,
    validator(value) {
      return value && value.user_id !== undefined && value.user_id !== null;
    },
  },
  refreshLookingForMenu: {
    type: Boolean,
    default: false,
  },
});

//Refresh the menu for when finishProfileDialog closes 
watch(() => props.refreshLookingForMenu, async () => {
  lookingForOptions.value = await fetchLookingForOptions();
  userLookingForIds.value = await fetchUserLookingFor(
    props.userProfile.user_id
  );
});

async function fetchLookingForOptions() {
  const { data: lookingForOptionsData, error: lookingForError } = await getInterests();

  if (lookingForError) {
    console.error("Error fetching looking for options:", lookingForError);
    return [];
  }

  return lookingForOptionsData;
}

async function fetchUserLookingFor(userId) {
  const { data: userLookingFor, error: userLookingForError } = await getInterestsIds(userId); 

  if (userLookingForError) {
    console.error("Error fetching user looking for:", userLookingForError);
    return [];
  }

  return userLookingFor.map((item) => item.looking_for_id);
}

onMounted(async () => {
  lookingForOptions.value = await fetchLookingForOptions();
  userLookingForIds.value = await fetchUserLookingFor(
    props.userProfile.user_id
  );
});

const toggleLookingFor = async (lookingForId, value) => {
  console.log("Toggle looking for:", lookingForId, value);
  if (value) {
    // Add to userLookingForIds and insert into database
    if (!userLookingForIds.value.includes(lookingForId)) {
      userLookingForIds.value.push(lookingForId);
      const error = await insertUserInterest(props.userProfile.user_id, lookingForId);

      if (error) {
        console.error("Error inserting looking for:", error);
        // Revert the state change if there's an error
        userLookingForIds.value = userLookingForIds.value.filter(
          (id) => id !== lookingForId
        );
      }
    }
  } else {
    // Remove from userLookingForIds and delete from database
    if (userLookingForIds.value.includes(lookingForId)) {
      userLookingForIds.value = userLookingForIds.value.filter(
        (id) => id !== lookingForId
      );
      const { error } = await deleteUserInterest(props.userProfile.user_id, lookingForId); 

      if (error) {
        console.error("Error deleting looking for:", error);
        // Revert the state change if there's an error
        userLookingForIds.value.push(lookingForId);
      }
    }
  }
};

const emit = defineEmits(["lookingForUpdated"]);

const saveChanges = async () => {
  // Logic to save changes if necessary
  menu.value = false;
  emit("lookingForUpdated");
};
</script>
