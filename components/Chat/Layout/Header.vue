<template>
  <v-card v-if="selectedUser" flat class="mb-2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <a
          :to="profileLink || '#'"
          class="d-flex align-center text-decoration-none"
          aria-label="View profile"
          @click.prevent="$emit('open-profile', selectedUser)"
        >
          <v-avatar
            size="32"
            :image="getAvatar(selectedUser.avatar_url, selectedUser.gender_id)"
            class="mr-2"
          />
          <div>
            <div>{{ selectedUser.displayname }}, {{ selectedUser.age }}</div>
            <div class="text-caption">{{ selectedUser.tagline }}</div>
          </div>
        </a>
      </div>

      <slot name="actions" />
    </v-card-title>
  </v-card>

  <v-card v-else flat>
    <v-card-title>{{
      $t("components.chatcontainer.select-user")
    }}</v-card-title>
  </v-card>
</template>

<script setup>
import { getAvatar } from "@/composables/useUserUtils";

const props = defineProps({
  selectedUser: Object,
  currentUser: Object,
  profileLink: String,
});

const { selectedUser, currentUser } = toRefs(props);

defineEmits(["open-profile"]);
</script>
