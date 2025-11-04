<!-- components/ChatLayoutTabFilters.vue -->
<script setup>
import { toRefs } from "vue";

/**
 * v-model usage:
 * <ChatLayoutTabFilters v-model="tabFilters" v-model:showAi="showAIUsers" />
 */
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  showAi: {
    type: Boolean,
    default: true,
  },
  disableToggle: {
    type: Boolean,
    default: false,
  },
  userProfile: {
    type: Object,
    default: null,
  },
  authStatus: {
    type: String,
    default: "",
  },
});
const emit = defineEmits([
  "update:modelValue",
  "update:showAi",
  "filter-changed",
]);
const { modelValue, showAi, disableToggle, userProfile, authStatus } =
  toRefs(props);

const toggle = (key) => {
  emit("update:modelValue", {
    ...modelValue.value,
    [key]: !modelValue.value[key],
  });
};

const toggleAi = () => {
  emit("update:showAi", !showAi.value);
};

const menuOpen = ref(false);
const forwardFilterChanged = (payload) => {
  emit("filter-changed", payload);
  // optional: close menu after applying filters
  menuOpen.value = false;
};
</script>

<template>
  <!-- single inline toolbar -->
  <div class="d-flex align-center flex-wrap gap-4 text-subtitle-2">
    <ChatLayoutFilterMenu
      :userProfile="userProfile || null"
      :disableToggle="disableToggle"
      :authStatus="authStatus"
      @filter-changed="forwardFilterChanged"
      class="ml-2"
    />

    <!-- AI checkbox -->
    <label class="d-flex align-center gap-1 ml-2 text-indigo-darken-3">
      <input
        type="checkbox"
        :checked="showAi"
        :disabled="disableToggle"
        @change="toggleAi"
        class="accent-indigo-600"
        aria-label="Show AI users"
      />
      <span class="text-medium-emphasis ml-2">Show AI</span>
    </label>

    <!-- Online -->
    <label class="d-flex align-center gap-1 ml-2 text-blue-darken-3">
      <input
        type="checkbox"
        :checked="modelValue.online"
        @change="toggle('online')"
        class="accent-green-600"
      />
      <span class="text-medium-emphasis ml-2">Online</span>
    </label>

    <!-- Offline -->
    <label class="d-flex align-center ml-2 text-red-darken-2">
      <input
        type="checkbox"
        :checked="modelValue.offline"
        @change="toggle('offline')"
        class="accent-red-600"
      />
      <span class="text-medium-emphasis ml-2">Offline</span>
    </label>

    <!-- Active -->
    <label class="d-flex align-center ml-2">
      <input
        type="checkbox"
        :checked="modelValue.active"
        @change="toggle('active')"
        class="accent-blue-600"
      />
      <span class="text-medium-emphasis ml-2">Active</span>

    </label>
  </div>
</template>
