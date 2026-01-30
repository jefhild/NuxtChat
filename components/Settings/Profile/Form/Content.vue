<template>
  <v-card-text class="settings-profile-form">
    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <!-- {{ props.isEditable ? 'Editable' : 'Read Only' }} -->
        <SettingsProfileDisplayName2
          :displayName="props.userProfile.displayname"
          :isEditable="props.isEditable"
          @updateDisplayName="(val) => emit('update:displayName', val)"
          @validation="(val) => emit('validation', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileTagLine
          :tagLine="props.userProfile.tagline ?? '...'"
          :isEditable="props.isEditable"
          :errorMessage="props.tagLineErrorMessage"
          @updateTagLine="(val) => emit('update:tagLine', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileSite
          :siteUrl="props.userProfile.site_url ?? ''"
          :isEditable="props.isSiteEditable"
          @updateSite="(val) => emit('update:siteUrl', val)"
        />
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileStatus
          :selectedStatus="props.userProfile?.status_id ?? 1"
          :statuses="props.statuses"
          :isEditable="props.isEditable"
          @updateStatus="(val) => emit('update:statusId', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileGender
          :genderId="props.userProfile.gender_id ?? 1"
          :genders="props.genders"
          :isEditable="props.isEditable"
          @updateGenderId="(val) => emit('update:genderId', val)"
          @validation="(val) => emit('validation', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileAge
          :age="props.userProfile.age ?? 18"
          :isEditable="props.isEditable"
          @updateAge="(val) => emit('update:age', val)"
        />
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12">
        <SettingsProfileLocation
          v-bind="locationProps"
          :isEditable="props.isEditable"
          @updateCountry="(val) => emit('update:country', val)"
          @updateState="(val) => emit('update:state', val)"
          @updateCity="(val) => emit('update:city', val)"
        />
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <v-select
          :disabled="props.presenceDisabled"
          :loading="props.presenceLoading"
          variant="underlined"
          :items="presenceOptions"
          item-title="label"
          item-value="value"
          :label="t('components.presence.label')"
          :model-value="props.presenceStatus"
          @update:modelValue="(val) => emit('update:presenceStatus', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="px-1 py-0">
        <SettingsProfileLanguage
          :selectedLocale="props.userProfile.preferred_locale ?? 'en'"
          :locales="props.locales"
          :isEditable="props.isEditable"
          @updateLocale="(val) => emit('update:preferredLocale', val)"
        />
      </v-col>
      <v-col
        v-if="props.isAuthenticated"
        cols="12"
        sm="6"
        md="4"
        class="px-1 py-0"
      >
        <div class="d-flex align-center">
          <v-switch
            inset
            class="mt-2"
            :disabled="!props.isEditable"
            :model-value="Boolean(props.userProfile.is_private)"
            :label="t('components.profile-language.private_label')"
            @update:modelValue="(val) => emit('update:isPrivate', val)"
          />
          <v-tooltip
            :text="t('components.profile-language.private_helper')"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                size="18"
                class="ml-2 mb-1 text-medium-emphasis"
                v-bind="tooltipProps"
              >
                mdi-information-outline
              </v-icon>
            </template>
          </v-tooltip>
        </div>
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12">
        <SettingsProfileBio
          :bio="userProfile.bio ?? ''"
          :isEditable="props.isEditable"
          :minLength="props.bioMinLength"
          :errorMessage="props.bioErrorMessage"
          :showAiButton="props.showAiBioButton"
          :aiDisabled="props.aiBioDisabled"
          :aiLoading="props.aiBioLoading"
          :aiRemaining="props.aiBioRemaining"
          @openAiBio="emit('openAiBio')"
          @updateBio="(val) => emit('update:bio', val)"
        />
      </v-col>
    </v-row>
    <v-row class="mt-4" align="center">
      <v-col cols="12" sm="6" class="d-flex justify-start">
        <v-btn
          v-if="props.isEditable"
          color="error"
          variant="outlined"
          :loading="props.deleteBusy"
          :disabled="props.deleteBusy"
          @click="emit('toggleDeletionMark')"
        >
          {{
            props.isMarkedForDeletion
              ? t("components.profile-container.marked-for-deletion")
              : t("components.profile-container.delete")
          }}
        </v-btn>
      </v-col>
      <v-col cols="12" sm="6" class="d-flex justify-end">
        <template v-if="props.isEditable">
          <v-btn color="primary" @click="emit('save')"> Save </v-btn>
          <v-btn
            color="grey"
            variant="outlined"
            class="ml-2"
            @click="emit('cancelEdit')"
          >
            Cancel
          </v-btn>
        </template>
        <template v-else>
          <v-btn color="primary" @click="emit('startEdit')"> Edit </v-btn>
          <v-btn color="primary" class="ml-2" to="/chat"> Back To Chat </v-btn>
        </template>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  locationProps: Object,
  userProfile: Object,
  isEditable: Boolean,
  isSiteEditable: Boolean,
  statuses: Array,
  genders: Array,
  locales: Array,
  presenceStatus: {
    type: String,
    default: "auto",
  },
  presenceDisabled: {
    type: Boolean,
    default: false,
  },
  presenceLoading: {
    type: Boolean,
    default: false,
  },
  isMarkedForDeletion: {
    type: Boolean,
    default: false,
  },
  deleteBusy: {
    type: Boolean,
    default: false,
  },
  showEmailLinkPrompt: {
    type: Boolean,
    default: false,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
  showAiBioButton: {
    type: Boolean,
    default: false,
  },
  aiBioDisabled: {
    type: Boolean,
    default: false,
  },
  aiBioLoading: {
    type: Boolean,
    default: false,
  },
  aiBioRemaining: {
    type: Number,
    default: 0,
  },
  bioMinLength: {
    type: Number,
    default: 0,
  },
  bioErrorMessage: {
    type: String,
    default: "",
  },
  tagLineErrorMessage: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "update:displayName",
  "update:tagLine",
  "update:siteUrl",
  "update:statusId",
  "update:age",
  "update:genderId",
  "update:country",
  "update:state",
  "update:city",
  "update:preferredLocale",
  "update:presenceStatus",
  "update:isPrivate",
  "update:bio",
  "validation",
  "save",
  "cancelEdit",
  "startEdit",
  "toggleDeletionMark",
  "linkAnonEmail",
  "openAiBio",
]);

const { isEditable } = toRefs(props);
const { t } = useI18n();

const presenceOptions = [
  { label: t("components.presence.auto"), value: "auto" },
  { label: t("components.presence.away"), value: "away" },
  { label: t("components.presence.offline"), value: "offline" },
];
</script>

<style scoped>
.text-link-btn {
  padding: 0;
  min-width: 0;
  background: none;
  border: none;
  box-shadow: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: none;
  font-size: inherit;
  text-transform: none;
}

.text-link-btn:hover {
  text-decoration: underline;
}

.settings-profile-form {
  --v-field-label-color: #1e88e5;
}

:global(.settings-profile-form .v-row) {
  margin-top: 0;
  margin-bottom: 0;
}

:global(.settings-profile-form .v-col) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:global(.settings-profile-form .v-field__input),
:global(.settings-profile-form .v-select__selection-text),
:global(.settings-profile-form .v-field__field) {
  font-size: 0.9rem;
}

:global(.settings-profile-form .v-field__label),
:global(.settings-profile-form .v-field-label),
:global(.settings-profile-form .v-label) {
  color: #1e88e5 !important;
  opacity: 1 !important;
}

:global(.settings-profile-form .v-field--disabled .v-field__label),
:global(.settings-profile-form .v-field--disabled .v-field-label),
:global(.settings-profile-form .v-field--disabled .v-label) {
  color: #1e88e5 !important;
  opacity: 1 !important;
}
</style>
