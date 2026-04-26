<template>
  <div ref="menuRootRef" class="filter-menu-root">
      <button
        ref="triggerRef"
        type="button"
        :disabled="disableToggle"
        class="filter-menu-trigger mb-1"
        :aria-expanded="String(menu)"
        aria-haspopup="dialog"
        aria-label="Open advanced filters"
        @click="toggleMenu"
      >
        <i class="mdi mdi-filter-variant text-lg" aria-hidden="true" />
        <span v-if="hasActiveFilters" class="filter-menu-trigger__badge" />
      </button>

    <Teleport to="body">
      <div
        v-if="menu"
        ref="popoverRef"
        class="filter-menu-popover"
        :style="popoverStyle"
      >
        <div class="filter-menu-panel p-4">
      <!-- AI toggle -->
      <div class="filter-inline-control mb-2 flex items-center">
        <label class="filter-checkbox">
          <input
            :checked="includeAiModel"
            type="checkbox"
            class="filter-checkbox__input"
            :disabled="!isAllowed"
            aria-label="Include AI chatbots"
            @change="includeAiModel = ($event.target).checked"
          >
          <span class="filter-checkbox__box" aria-hidden="true">
            <i class="mdi mdi-check filter-checkbox__check" />
          </span>
          <span class="filter-checkbox__label">
            Include AI chatbots
          </span>
        </label>
      </div>
      <div class="filter-inline-control mb-2 flex items-center">
        <label class="filter-checkbox">
          <input
            :checked="includeLanguagePracticeAiModel"
            type="checkbox"
            class="filter-checkbox__input"
            :disabled="!isAllowed || !includeAiModel"
            :aria-label="t('components.filter-menu.include-language-practice-ai')"
            @change="includeLanguagePracticeAiModel = ($event.target).checked"
          >
          <span class="filter-checkbox__box" aria-hidden="true">
            <i class="mdi mdi-check filter-checkbox__check" />
          </span>
          <span class="filter-checkbox__label">
            {{ t('components.filter-menu.include-language-practice-ai') }}
          </span>
        </label>
      </div>

      <!-- User Info -->
      <div class="filter-user-summary mb-1 mt-2">
        <div class="flex flex-col justify-center">
          <span class="text-body-1 font-weight-medium">{{
            localized.displayname || userProfile.displayname
          }}</span>
          <span class="text-caption text-grey">{{
            localized.tagline || userProfile.tagline
          }}</span>
        </div>
      </div>

      <div class="filter-menu-divider" />

      <!-- Gender -->
      <div class="filter-menu-section-heading">
        <i class="mdi mdi-gender-male-female mr-1 text-[18px]" aria-hidden="true" />
        {{ $t("components.filter-menu.gender") }}
      </div>
      <label class="filter-native-select">
        <span class="sr-only">{{ $t("components.filter-menu.gender") }}</span>
        <select
          :value="selectedGenderValue"
          class="filter-native-select__control"
          :disabled="!isAllowed"
          @change="onGenderChange"
        >
          <option
            v-for="option in genders"
            :key="String(option.value)"
            :value="option.value === null ? '' : String(option.value)"
          >
            {{ option.text }}
          </option>
        </select>
        <i class="mdi mdi-chevron-down filter-native-select__chevron" aria-hidden="true" />
      </label>

      <!-- Statuses -->
      <div class="filter-menu-section-heading">
        <i class="mdi mdi-ring mr-1 text-[18px]" aria-hidden="true" />
        {{ $t("components.filter-menu.status") }}
      </div>
      <label class="filter-native-select">
        <span class="sr-only">{{ $t("components.filter-menu.status") }}</span>
        <select
          :value="selectedStatusValue"
          class="filter-native-select__control"
          :disabled="!isAllowed"
          @change="onStatusChange"
        >
          <option
            v-for="option in statuses"
            :key="String(option.id)"
            :value="option.id === null ? '' : String(option.id)"
          >
            {{ option.name }}
          </option>
        </select>
        <i class="mdi mdi-chevron-down filter-native-select__chevron" aria-hidden="true" />
      </label>

      <!-- Age Range -->
      <div class="filter-menu-section-heading">
        <i class="mdi mdi-calendar-range mr-1 text-[18px]" aria-hidden="true" />
        {{ $t("components.filter-menu.age-range") }}
      </div>
      <div class="filter-slider-shell">
        <div class="filter-slider-values">
          <span class="age-chip">{{ selectedAge[0] }}</span>
          <span class="age-chip">{{ selectedAge[1] }}</span>
        </div>
        <div class="filter-range" :class="{ 'filter-range--disabled': !isAllowed }">
          <div class="filter-range__track" />
          <div class="filter-range__active" :style="ageRangeStyle" />
          <input
            type="range"
            :min="AGE_MIN"
            :max="AGE_MAX"
            step="1"
            :value="selectedAge[0]"
            class="filter-range__input"
            :disabled="!isAllowed"
            aria-label="Minimum age"
            @input="onMinAgeInput"
          />
          <input
            type="range"
            :min="AGE_MIN"
            :max="AGE_MAX"
            step="1"
            :value="selectedAge[1]"
            class="filter-range__input"
            :disabled="!isAllowed"
            aria-label="Maximum age"
            @input="onMaxAgeInput"
          />
        </div>
      </div>

      <!-- Interests -->
      <div class="filter-menu-section-heading">
        <i class="mdi mdi-heart-multiple mr-1 text-[18px]" aria-hidden="true" />
        {{ $t("components.filter-menu.interests") }}
      </div>
      <div class="filter-multi-select">
        <button
          type="button"
          class="filter-multi-select__trigger"
          :disabled="!isAllowed"
          :aria-expanded="interestsExpanded ? 'true' : 'false'"
          @click="toggleInterestsExpanded"
        >
          <span class="filter-multi-select__summary">{{ selectedInterestsSummary }}</span>
          <span v-if="selectedInterestCount" class="filter-multi-select__badge">
            {{ selectedInterestCount }}
          </span>
          <i
            :class="[
              'mdi',
              interestsExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'filter-multi-select__chevron'
            ]"
            aria-hidden="true"
          />
        </button>

        <div v-if="interestsExpanded" class="filter-multi-select__panel">
          <div class="filter-multi-select__actions">
            <button
              type="button"
              class="filter-multi-select__action-btn"
              :disabled="!isAllowed"
              @click="selectAllInterests"
            >
              {{ $t("components.filter-menu.all") }}
            </button>
            <button
              type="button"
              class="filter-multi-select__action-btn"
              :disabled="!isAllowed"
              @click="clearInterestSelection"
            >
              {{ $t("components.filter-menu.clear") }}
            </button>
          </div>

          <div class="filter-multi-select__options">
            <button
              v-for="interest in interests"
              :key="interest.id"
              type="button"
              class="filter-interest-option"
              :class="{ 'filter-interest-option--selected': isInterestSelected(interest.id) }"
              :disabled="!isAllowed"
              @click="toggleInterest(interest.id)"
            >
              <span class="filter-interest-option__check">
                <i class="mdi mdi-check" aria-hidden="true" />
              </span>
              <i
                :class="['mdi', interest.icon, 'filter-interest-option__icon']"
                :style="interest.color ? { color: interest.color } : undefined"
                aria-hidden="true"
              />
              <span class="filter-interest-option__emoji">{{ interest.emoji }}</span>
              <span class="filter-interest-option__label">{{ interest.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Country -->
      <div class="filter-menu-section-heading">
        <i class="mdi mdi-flag mr-1 text-[18px]" aria-hidden="true" />
        {{ $t("components.filter-menu.country") }}
      </div>
      <label class="filter-native-select">
        <span class="sr-only">{{ $t("components.filter-menu.country") }}</span>
        <select
          :value="selectedCountryValue"
          class="filter-native-select__control"
          :disabled="!isAllowed"
          @change="onCountryChange"
        >
          <option
            v-for="option in countries"
            :key="String(option.id)"
            :value="option.id === null ? '' : String(option.id)"
          >
            {{ option.name }}
          </option>
        </select>
        <i class="mdi mdi-chevron-down filter-native-select__chevron" aria-hidden="true" />
      </label>

      <!-- Actions -->
      <div class="filter-menu-divider my-3" />
      <div class="filter-menu-actions">
        <button type="button" class="filter-menu-clear-btn" @click="clearFilters">
          <i class="mdi mdi-close-circle mr-1 text-sm" aria-hidden="true" />
          {{ $t("components.filter-menu.clear") }}
        </button>
      </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { usePresenceStore2 } from "@/stores/presenceStore2";
import { useI18n } from "vue-i18n";
import { computed, nextTick, onBeforeUnmount, watch } from "vue";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";
const { t, locale } = useI18n();

const { getInterests, getCountries, getStatuses } = useDb();

const presenceStore = usePresenceStore2();
const menu = ref(false);
const menuRootRef = ref(null);
const triggerRef = ref(null);
const popoverRef = ref(null);
const popoverStyle = ref({});
const AGE_MIN = 18;
const AGE_MAX = 100;
const interestsExpanded = ref(false);
const selectedGender = ref(null);
const selectedAge = ref([AGE_MIN, AGE_MAX]);
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
  showAi: {
    type: Boolean,
    default: true,
  },
  showLanguagePracticeAi: {
    type: Boolean,
    default: false,
  },
});

const localized = computed(() =>
  resolveProfileLocalization({
    profile: props.userProfile,
    readerLocale: locale?.value,
  })
);

const emit = defineEmits([
  "filter-changed",
  "update:showAi",
  "update:showLanguagePracticeAi",
]);
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
const includeAiModel = computed({
  get: () => props.showAi,
  set: (val) => emit("update:showAi", Boolean(val)),
});
const includeLanguagePracticeAiModel = computed({
  get: () => props.showLanguagePracticeAi,
  set: (val) => emit("update:showLanguagePracticeAi", Boolean(val)),
});

const hasActiveFilters = computed(
  () =>
    selectedGender.value !== null ||
    selectedAge.value[0] !== AGE_MIN ||
    selectedAge.value[1] !== AGE_MAX
);

const selectedGenderValue = computed(() =>
  selectedGender.value === null ? "" : String(selectedGender.value)
);

const selectedStatusValue = computed(() =>
  selectedStatus.value === null ? "" : String(selectedStatus.value)
);

const selectedCountryValue = computed(() =>
  selectedCountry.value === null ? "" : String(selectedCountry.value)
);

const selectedInterestIds = computed(() =>
  Array.isArray(selectedInterests.value) ? selectedInterests.value : []
);

const selectedInterestCount = computed(() => selectedInterestIds.value.length);

const areAllInterestsSelected = computed(
  () =>
    interests.value.length > 0 &&
    selectedInterestCount.value === interests.value.length
);

const selectedInterestsSummary = computed(() => {
  if (!selectedInterestCount.value || areAllInterestsSelected.value) {
    return t("components.filter-menu.interests");
  }

  const names = selectedInterestIds.value
    .map((id) => interests.value.find((interest) => interest.id === id)?.name)
    .filter(Boolean);

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
});

const ageRangeStyle = computed(() => {
  const span = AGE_MAX - AGE_MIN;
  const start = ((selectedAge.value[0] - AGE_MIN) / span) * 100;
  const end = ((selectedAge.value[1] - AGE_MIN) / span) * 100;

  return {
    left: `${start}%`,
    width: `${Math.max(0, end - start)}%`,
  };
});

const toggleMenu = () => {
  if (props.disableToggle) return;
  menu.value = !menu.value;
};

const toggleInterestsExpanded = () => {
  if (!isAllowed.value) return;
  interestsExpanded.value = !interestsExpanded.value;
};

const onGenderChange = (event) => {
  const value = event.target?.value ?? "";
  selectedGender.value = value === "" ? null : Number(value);
  applyFilters();
};

const onStatusChange = (event) => {
  const value = event.target?.value ?? "";
  if (value === "") {
    selectedStatus.value = null;
  } else {
    const match = statuses.value.find((option) => String(option.id) === value);
    selectedStatus.value = match ? match.id : value;
  }
  applyFilters();
};

const onCountryChange = (event) => {
  const value = event.target?.value ?? "";
  if (value === "") {
    selectedCountry.value = null;
  } else {
    const match = countries.value.find((option) => String(option.id) === value);
    selectedCountry.value = match ? match.id : value;
  }
  applyFilters();
};

const clampAge = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return AGE_MIN;
  return Math.min(AGE_MAX, Math.max(AGE_MIN, numericValue));
};

const onMinAgeInput = (event) => {
  const nextMin = Math.min(clampAge(event.target?.value), selectedAge.value[1]);
  selectedAge.value = [nextMin, selectedAge.value[1]];
  applyFilters();
};

const onMaxAgeInput = (event) => {
  const nextMax = Math.max(clampAge(event.target?.value), selectedAge.value[0]);
  selectedAge.value = [selectedAge.value[0], nextMax];
  applyFilters();
};

const isInterestSelected = (interestId) => selectedInterestIds.value.includes(interestId);

const toggleInterest = (interestId) => {
  const nextSelected = [...selectedInterestIds.value];
  const existingIndex = nextSelected.indexOf(interestId);

  if (existingIndex >= 0) {
    nextSelected.splice(existingIndex, 1);
  } else {
    nextSelected.push(interestId);
  }

  selectedInterests.value = nextSelected;
  applyFilters();
};

const selectAllInterests = () => {
  selectedInterests.value = interests.value.map((interest) => interest.id);
  applyFilters();
};

const clearInterestSelection = () => {
  selectedInterests.value = null;
  applyFilters();
};

const updatePopoverPosition = () => {
  if (!import.meta.client || !menu.value) return;
  const triggerEl = triggerRef.value;
  if (!(triggerEl instanceof HTMLElement)) return;

  const rect = triggerEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportMargin = 16;
  const gutter = 8;
  const width = Math.min(400, Math.max(280, viewportWidth - viewportMargin * 2));
  const useStackedPlacement =
    viewportWidth < 1200 || rect.right + gutter + width > viewportWidth - viewportMargin;

  let left;
  let top;

  if (useStackedPlacement) {
    left = Math.min(
      Math.max(viewportMargin, rect.left),
      viewportWidth - viewportMargin - width
    );
    top = rect.bottom + gutter;
  } else {
    left = rect.right + gutter;
    if (left + width > viewportWidth - viewportMargin) {
      left = rect.left - width - gutter;
    }
    if (left < viewportMargin) {
      left = Math.max(viewportMargin, viewportWidth - viewportMargin - width);
    }
    top = rect.top;
  }

  let maxHeight = viewportHeight - top - viewportMargin;

  if (maxHeight < 320) {
    top = Math.max(viewportMargin, viewportHeight - viewportMargin - 560);
    maxHeight = viewportHeight - top - viewportMargin;
  }

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.max(260, Math.round(maxHeight))}px`,
  };
};

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
  selectedAge.value = [AGE_MIN, AGE_MAX];
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

const onDocumentPointerDown = (event) => {
  if (!menu.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (menuRootRef.value?.contains(target)) return;
  if (popoverRef.value?.contains(target)) return;
  menu.value = false;
};

const onDocumentKeydown = (event) => {
  if (event.key === "Escape") {
    menu.value = false;
  }
};

const onWindowLayout = () => {
  updatePopoverPosition();
};

if (import.meta.client) {
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeydown);
  window.addEventListener("resize", onWindowLayout);
  window.addEventListener("scroll", onWindowLayout, true);
}

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeydown);
  window.removeEventListener("resize", onWindowLayout);
  window.removeEventListener("scroll", onWindowLayout, true);
});

watch(
  () => menu.value,
  async (isOpen) => {
    if (!isOpen) {
      interestsExpanded.value = false;
      return;
    }
    await nextTick();
    updatePopoverPosition();
  }
);
</script>

<style scoped>
.exclamation-badge {
  position: absolute;
  top: 3px;
  right: 3px;
}

.filter-menu-root {
  display: inline-block;
}

.filter-menu-popover {
  position: fixed;
  z-index: 2600;
}

.filter-menu-panel {
  width: 100%;
  max-height: inherit;
  overflow-y: auto;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, #223047 0%, #1e293b 100%);
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.32);
}

.filter-menu-trigger {
  position: relative;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filter-menu-trigger:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.12);
}

.filter-menu-trigger:disabled {
  opacity: 0.55;
  cursor: default;
}

.filter-menu-trigger__badge {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #ef4444;
}

.filter-user-summary {
  display: flex;
  align-items: center;
}

.filter-menu-divider {
  width: 100%;
  height: 1px;
  background: rgba(148, 163, 184, 0.18);
}

.filter-menu-section-heading {
  display: flex;
  align-items: center;
  margin-top: 0.85rem;
  margin-bottom: 0.35rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
}

.filter-inline-control,
.filter-slider-shell {
  border-radius: 0.75rem;
  border: 1px solid rgba(71, 85, 105, 0.45);
  background: rgba(15, 23, 42, 0.54);
  padding: 0.35rem 0.75rem;
}

.filter-slider-shell {
  padding: 0.75rem 0.85rem 0.85rem;
}

.filter-slider-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.filter-range {
  position: relative;
  height: 1.5rem;
}

.filter-range--disabled {
  opacity: 0.55;
}

.filter-range__track,
.filter-range__active {
  position: absolute;
  top: 50%;
  height: 0.35rem;
  border-radius: 999px;
  transform: translateY(-50%);
}

.filter-range__track {
  left: 0;
  right: 0;
  background: rgba(71, 85, 105, 0.78);
}

.filter-range__active {
  background: linear-gradient(90deg, rgba(129, 140, 248, 0.95), rgba(168, 85, 247, 0.95));
}

.filter-range__input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  pointer-events: none;
}

.filter-range__input::-webkit-slider-runnable-track {
  height: 0.35rem;
  background: transparent;
}

.filter-range__input::-moz-range-track {
  height: 0.35rem;
  background: transparent;
}

.filter-range__input::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 1rem;
  height: 1rem;
  margin-top: -0.33rem;
  border-radius: 999px;
  border: 2px solid rgba(15, 23, 42, 0.95);
  background: #c4b5fd;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.18);
  cursor: pointer;
  pointer-events: auto;
}

.filter-range__input::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 2px solid rgba(15, 23, 42, 0.95);
  background: #c4b5fd;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.18);
  cursor: pointer;
  pointer-events: auto;
}

.filter-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: #e2e8f0;
  cursor: pointer;
}

.filter-checkbox__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.filter-checkbox__box {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 0.3rem;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: rgba(15, 23, 42, 0.82);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.filter-checkbox__check {
  color: #c7d2fe;
  font-size: 0.95rem;
  opacity: 0;
}

.filter-checkbox__input:checked + .filter-checkbox__box {
  border-color: rgba(99, 102, 241, 0.52);
  background: rgba(59, 130, 246, 0.18);
}

.filter-checkbox__input:checked + .filter-checkbox__box .filter-checkbox__check {
  opacity: 1;
}

.filter-checkbox__input:disabled + .filter-checkbox__box,
.filter-checkbox__input:disabled ~ .filter-checkbox__label {
  opacity: 0.55;
}

.filter-checkbox__label {
  font-size: 0.95rem;
  line-height: 1.25rem;
}

.age-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  background: rgba(51, 65, 85, 0.95);
  color: #e2e8f0;
}

.filter-menu-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.filter-menu-clear-btn {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: #fca5a5;
  padding: 0;
  font-size: 0.875rem;
}

.filter-native-select {
  position: relative;
  display: block;
}

.filter-native-select__control {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.76);
  color: #e2e8f0;
  padding: 0.7rem 2.6rem 0.7rem 0.9rem;
  font-size: 0.9rem;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.filter-native-select__control:disabled {
  opacity: 0.55;
  cursor: default;
}

.filter-native-select__chevron {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: #cbd5e1;
  pointer-events: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.filter-multi-select {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-multi-select__trigger {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.76);
  color: #e2e8f0;
  padding: 0.7rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
}

.filter-multi-select__trigger:disabled {
  opacity: 0.55;
  cursor: default;
}

.filter-multi-select__summary {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-multi-select__badge {
  flex: 0 0 auto;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.22);
  color: #c7d2fe;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.filter-multi-select__chevron {
  flex: 0 0 auto;
  color: #cbd5e1;
}

.filter-multi-select__panel {
  border-radius: 0.85rem;
  border: 1px solid rgba(71, 85, 105, 0.45);
  background: rgba(15, 23, 42, 0.48);
  padding: 0.8rem;
}

.filter-multi-select__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.filter-multi-select__action-btn {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(30, 41, 59, 0.88);
  color: #e2e8f0;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.filter-multi-select__action-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.filter-multi-select__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 15rem;
  overflow-y: auto;
}

.filter-interest-option {
  width: 100%;
  border-radius: 0.8rem;
  border: 1px solid rgba(71, 85, 105, 0.4);
  background: rgba(15, 23, 42, 0.82);
  color: #e2e8f0;
  padding: 0.65rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
}

.filter-interest-option:disabled {
  opacity: 0.55;
  cursor: default;
}

.filter-interest-option--selected {
  border-color: rgba(129, 140, 248, 0.42);
  background: rgba(49, 46, 129, 0.28);
}

.filter-interest-option__check {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  flex: 0 0 auto;
}

.filter-interest-option--selected .filter-interest-option__check {
  border-color: rgba(129, 140, 248, 0.45);
  background: rgba(129, 140, 248, 0.22);
  color: #c7d2fe;
}

.filter-interest-option__icon,
.filter-interest-option__emoji {
  flex: 0 0 auto;
}

.filter-interest-option__label {
  min-width: 0;
  font-size: 0.9rem;
}

</style>
