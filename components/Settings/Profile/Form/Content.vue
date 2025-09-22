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
    <v-row class="ma-0 pa-0" dense>
      <v-col cols="12">
        <SettingsProfileBio
          :bio="userProfile.bio ?? ''"
          :isEditable="props.isEditable"
          @updateBio="(val) => emit('update:bio', val)"
        />
      </v-col>
    </v-row>

    <v-row justify="end" class="mt-4">
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
    </v-row>
  </v-card-text>
</template>

<script setup>
const props = defineProps({
  locationProps: Object,
  userProfile: Object,
  isEditable: Boolean,
  statuses: Array,
  genders: Array,
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
]);

const { isEditable } = toRefs(props);
</script>
