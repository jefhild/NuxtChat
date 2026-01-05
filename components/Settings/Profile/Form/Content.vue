<template>
  <v-card-text>
    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <!-- {{ props.isEditable ? 'Editable' : 'Read Only' }} -->
        <SettingsProfileDisplayName2
          :displayName="props.userProfile.displayname"
          :isEditable="props.isEditable"
          @updateDisplayName="(val) => emit('update:displayName', val)"
          @validation="(val) => emit('validation', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <SettingsProfileTagLine
          :tagLine="props.userProfile.tagline ?? '...'"
          :isEditable="props.isEditable"
          @updateTagLine="(val) => emit('update:tagLine', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <SettingsProfileSite
          :siteUrl="props.userProfile.site_url ?? ''"
          :isEditable="props.isEditable"
          @updateSite="(val) => emit('update:siteUrl', val)"
        />
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <SettingsProfileStatus
          :selectedStatus="props.userProfile?.status_id ?? 1"
          :statuses="props.statuses"
          :isEditable="props.isEditable"
          @updateStatus="(val) => emit('update:statusId', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
        <SettingsProfileGender
          :genderId="props.userProfile.gender_id ?? 1"
          :genders="props.genders"
          :isEditable="props.isEditable"
          @updateGenderId="(val) => emit('update:genderId', val)"
          @validation="(val) => emit('validation', val)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="pa-2">
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
    <v-row v-if="props.showEmailLinkPrompt" class="ma-0 pa-0" dense>
      <v-col cols="12">
        <v-alert variant="tonal" type="info" density="comfortable">
          <div
            class="d-flex flex-column flex-sm-row align-center justify-space-between"
          >
            <span class="text-body-2">
              {{ t("components.profile-email-link.prompt") }}
            </span>
            <v-btn
              variant="text"
              class="text-link-btn mt-2 mt-sm-0"
              density="comfortable"
              @click="emit('linkAnonEmail')"
            >
              {{ t("components.profile-email-link.cta") }}
            </v-btn>
          </div>
        </v-alert>
      </v-col>
    </v-row>
    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12">
        <SettingsProfileBio
          :bio="userProfile.bio ?? ''"
          :isEditable="props.isEditable"
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
  statuses: Array,
  genders: Array,
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
  "update:bio",
  "validation",
  "save",
  "cancelEdit",
  "startEdit",
  "toggleDeletionMark",
  "linkAnonEmail",
]);

const { isEditable } = toRefs(props);
const { t } = useI18n();
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
</style>
