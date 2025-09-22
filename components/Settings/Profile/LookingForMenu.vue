<template>
  <v-menu v-model="menu" :close-on-content-click="false" location="end">
    <template #activator="{ props }">
      <v-btn
        variant="text"
        append-icon="mdi-arrow-expand-right"
        v-bind="props"
        color="blue"
      >
        {{ $t("components.lookingFor.looking-for") }}
      </v-btn>
    </template>

    <v-card min-width="300">
      <v-list>
        <v-list-item
          v-if="userProfile"
          :prepend-avatar="userProfile.avatar_url"
          :subtitle="userProfile.tagline"
          :title="userProfile.displayname"
        />
      </v-list>

      <v-divider />

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
                @update:model-value="(val) => toggleLookingFor(userId, option.id, val)"
                :label="option.name"
                :color="userLookingForIds.includes(option.id) ? option.color : 'black'"
                hide-details
              />
            </v-col>
            <v-col class="d-flex align-center justify-center">
              <v-icon :color="userLookingForIds.includes(option.id) ? option.color : 'black'">
                {{ option.icon }}
              </v-icon>
            </v-col>
          </v-row>
        </v-list-item>
      </v-list>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="menu = false">
          {{ $t("components.lookingFor.cancel") }}
        </v-btn>
        <v-btn color="primary" variant="text" @click="saveChanges">
          {{ $t("components.lookingFor.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useLookingFor } from "@/composables/useLookingFor";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const menu = ref(false);

const emit = defineEmits(["lookingForUpdated"]);

const props = defineProps({
  userProfile: {
    type: Object,
    required: true,
    validator: (val) => val && val.user_id,
  },
  refreshLookingForMenu: Boolean,
});

const userId = computed(() => props.userProfile?.user_id);

const {
  lookingForOptions,
  userLookingForIds,
  fetchLookingForOptions,
  fetchUserLookingFor,
  toggleLookingFor,
} = useLookingFor();

const init = async () => {
  if (!userId.value) return;
  await fetchLookingForOptions();
  await fetchUserLookingFor(userId.value);
};

onMounted(init);
watch(() => props.refreshLookingForMenu, init);

const saveChanges = () => {
  menu.value = false;
  emit("lookingForUpdated");
};
</script>