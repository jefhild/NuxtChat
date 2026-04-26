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

const updateShowAi = (val) => {
  emit("update:showAi", val);
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
  <div class="flex flex-wrap items-center gap-4 text-sm">
    <ChatLayoutFilterMenu
      :userProfile="userProfile || null"
      :disableToggle="disableToggle"
      :authStatus="authStatus"
      :showAi="showAi"
      @filter-changed="forwardFilterChanged"
      @update:showAi="updateShowAi"
       class="ml-2"
    />

    <!-- Online -->
    <label class="ml-2 flex items-center gap-1 text-blue-300">
      <input
        type="checkbox"
        :checked="modelValue.online"
        @change="toggle('online')"
        class="accent-green-600"
      />
      <span class="ml-2 text-slate-300">Online</span>
    </label>

    <!-- Offline -->
    <label class="ml-2 flex items-center text-red-300">
      <input
        type="checkbox"
        :checked="modelValue.offline"
        @change="toggle('offline')"
        class="accent-red-600"
      />
      <span class="ml-2 text-slate-300">Offline</span>
    </label>

    <!-- Active -->
    <label class="ml-2 flex items-center">
      <input
        type="checkbox"
        :checked="modelValue.active"
        @change="toggle('active')"
        class="accent-blue-600"
      />
      <span class="ml-2 text-slate-300">Active</span>

    </label>
  </div>
</template>
