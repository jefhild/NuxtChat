<template>
  <v-col class="d-flex justify-end">
    <v-btn color="blue-lighten-2" variant="text" @click="$emit('upvote', selectedUser.user_id)" >
      <v-badge :content="selectedUser.upvotes_count" color="transparent" overlap class="mr-2">
        <v-icon class="mt-2" size="small">mdi-thumb-up</v-icon>
      </v-badge>
    </v-btn>
    <v-btn color="red-lighten-2" variant="text" @click="$emit('downvote', selectedUser.user_id)" >
      <v-badge :content="selectedUser.downvotes_count" color="transparent" overlap class="mr-2">
        <v-icon class="mt-2" size="small">mdi-thumb-down</v-icon>
      </v-badge>
    </v-btn>

    <v-tooltip :text="addFavoriteText" location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn :color="selectedUser.is_favorite ? 'green' : 'blue'" variant="text" v-bind="props"
          @click="$emit('toggleFavorite')">
          <v-icon :icon="selectedUser.is_favorite ? 'mdi-star' : 'mdi-star-outline'"></v-icon>
        </v-btn>
      </template>
    </v-tooltip>
    <v-tooltip :text="blockTooltipText" location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn :color="selectedUser.isBlocked ? 'green' : 'red'" variant="text" v-bind="props"
          @click="$emit('toggleBlockUser')">
          <v-icon :icon="selectedUser.isBlocked ? 'mdi-cancel' : 'mdi-cancel'"></v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <v-tooltip :text="$t('components.chatheader.report-user')" location="bottom">
      <template #activator="{ props }">
        <v-btn color="red" variant="text" v-bind="props" @click="$emit('toggleReportDialog')">
          <v-icon>mdi-alert-circle-outline</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </v-col>

  
</template>

<script setup>
import { computed } from "vue";

const emit = defineEmits(["upvote", "downvote", "toggleFavorite", "toggleBlockUser", "toggleReportDialog"]);
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  selectedUser: {
    displayname: String,
    tagline: String,
    bio: String,
    age: Number,
    gender_id: Number,
    country_name: String,
    user_id: String,
    profile_id: Number,
    isBlocked: Boolean,
    is_favorite: Boolean,
    upvotes_count: Number,
    downvotes_count: Number,
  },
  currentUser: {
    id: String,
  },
});

const blockTooltipText = computed(() => {
  return props.selectedUser?.isBlocked ? t("components.chatheader.unblock-user") : t("components.chatheader.block-user");
});

const addFavoriteText = computed(() => {
  return props.selectedUser?.is_favorite 
    ? t("components.chatheader.remove-favorites")
    : t("components.chatheader.add-favorites");
});
</script>

<style scoped>
/* Add any necessary styling here */
</style>
