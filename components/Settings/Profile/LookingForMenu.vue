<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    location="end"
    :disabled="disabled"
  >
    <template #activator="{ props }">
      <v-btn
        variant="text"
        append-icon="mdi-arrow-expand-right"
        v-bind="props"
        color="blue"
        :disabled="disabled"
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
                :disabled="disabled"
              />
            </v-col>
            <v-col class="d-flex align-center justify-center">
              <v-icon
                :icon="option.icon"
                class="looking-for-option-icon"
                :style="{
                  '--looking-for-option-icon-color': userLookingForIds.includes(option.id)
                    ? resolveIconColor(option.color)
                    : 'rgba(var(--v-theme-on-surface), 0.62)'
                }"
              />
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
  disabled: { type: Boolean, default: false },
});

const userId = computed(() => props.userProfile?.user_id);

const {
  lookingForOptions,
  userLookingForIds,
  fetchLookingForOptions,
  fetchUserLookingFor,
  toggleLookingFor,
} = useLookingFor();

const ICON_COLORS = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  pink: "#ec4899",
  orange: "#f97316",
  purple: "#a855f7",
  "deep-purple": "#7e22ce",
  "blue-lighten-1": "#38bdf8",
};

const resolveIconColor = (color) => {
  const normalized = String(color || "").trim().toLowerCase();
  return ICON_COLORS[normalized] || normalized || "rgba(var(--v-theme-on-surface), 0.62)";
};

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

<style scoped>
.looking-for-option-icon {
  color: var(--looking-for-option-icon-color, rgba(var(--v-theme-on-surface), 0.62)) !important;
  background: transparent !important;
}
</style>
