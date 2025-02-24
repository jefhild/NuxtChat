<template>
  <v-menu v-model="menu" :close-on-content-click="false" location="end">
    <template v-slot:activator="{ props }">
      <v-btn
        variant="text"
        append-icon="mdi-arrow-expand-right"
        v-bind="props"
        color="blue"
      >
        What are you looking for?
      </v-btn>
    </template>

    <v-card min-width="300">
      <v-list>


        <v-list class="pa-2">
          <v-list-item
            v-for="option in lookingForOptions"
            :key="option.id"
            dense
            class="py-0"
          >
            <v-row>
              <v-col>
                <v-switch
                  :model-value="userLookingForIds.includes(option.id)"
                  @update:model-value="
                    (value) => toggleLookingFor(option.id, value ?? false)
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
                >
                  {{ option.icon }}
                </v-icon>
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>
      </v-list>
        <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="menu = false"> Cancel </v-btn>
        <v-btn color="primary" variant="text" @click="saveChanges">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
const menu = ref(false);
const props = defineProps<{
  lookingForOptions: {
    id: number;
    name: string;
    icon: string;
    tooltip: string;
    color: string;
  }[];
  userLookingForIds: number[];
}>();

const emit = defineEmits(["update:userLookingForIds"]);

function toggleLookingFor(lookingForId: number, value: boolean) {
  let updatedIds = [...props.userLookingForIds];
  if (value) {
    updatedIds.push(lookingForId);
  } else {
    updatedIds = updatedIds.filter((id) => id !== lookingForId);
  }
  emit("update:userLookingForIds", updatedIds);
}

function saveChanges() {
  menu.value = false;
  emit("update:userLookingForIds", props.userLookingForIds);
}
</script>
