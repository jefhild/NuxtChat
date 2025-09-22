<template>
  <v-row>
    <v-col cols="8">
      <v-btn color="primary" :disabled="!isFormValid" @click="$emit('toggleEditMode')">
        {{ isEditable ? $t("components.profile-container.save") : $t("components.profile-container.edit") }}
      </v-btn>
      <v-btn v-if="isEditable" class="ml-4" color="secondary" @click="$emit('cancelEdit')">
        {{ $t("components.profile-container.cancel") }}
      </v-btn>
    </v-col>
    <v-col cols="4" class="d-flex justify-end">
      <v-btn color="primary" :disabled="!isFormValid" @click="$emit('gotoChat')">
        {{ $t("components.profile-container.go-to-chat") }}
      </v-btn>
    </v-col>
  </v-row>

  <v-row>
    <v-col>
      <v-btn flat variant="text" class="text-link-btn" @click="$emit('toggleDeleteDialog')">
        {{ isMarkedForDeletion
          ? $t("components.profile-container.restore")
          : $t("components.profile-container.delete") }}
      </v-btn>
    </v-col>

    <v-col class="d-flex justify-center">
      <v-btn
        v-if="!isFinished && isEditable"
        flat
        variant="text"
        class="text-link-btn"
        @click="$emit('openFinishProfileDialog')"
      >
        {{ $t("components.profile-container.finish") }}
      </v-btn>
    </v-col>

    <v-col class="d-flex justify-center">
      <v-btn
        flat
        variant="text"
        color="blue"
        @click="$emit('gotoPublicProfile')"
        class="text-link-btn"
      >
        {{ $t("components.profile-container.public") }}
      </v-btn>

      <v-tooltip :text="$t('components.profile-container.copy')" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn icon color="primary" size="small" class="ml-5" v-bind="tooltipProps" @click="$emit('copyPublicProfileLink')">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  isEditable: Boolean,
  isFormValid: Boolean,
  isMarkedForDeletion: Boolean,
  isFinished: Boolean,
});

defineEmits([
  "toggleEditMode",
  "cancelEdit",
  "gotoChat",
  "gotoPublicProfile",
  "copyPublicProfileLink",
  "toggleDeleteDialog",
  "openFinishProfileDialog",
]);
</script>