<template>
  <!-- <v-card v-if="selectedUser" flat class="pa-0 ma-0 header-selected">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <a
          :to="profileLink || '#'"
          class=" d-flex align-center text-decoration-none cursor-pointer"
          aria-label="View profile"
          @click.prevent="$emit('open-profile', selectedUser)"
        >
          <v-avatar
            size="32"
            :image="getAvatar(selectedUser.avatar_url, selectedUser.gender_id)"
            class="mr-2"
          />
          <div class="text-center">
            <div class="text-body-1 font-weight-medium">{{ selectedUser.displayname }}, {{ selectedUser.age }}</div>
            <div class="text-subtitle-2">{{ selectedUser.tagline }}</div>
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
  </v-card> -->

  <!-- Replace the card wrapper with a simple full-width container -->
  <div
    v-if="selectedUser"
    class="w-100 d-flex align-center justify-center pa-0 ma-0 position-relative header-selected"
  >
    <!-- avatar anchored left -->
    <div class="avatar-left">
      <div class="avatar-wrapper">
        <v-avatar
          size="32"
          :image="getAvatar(selectedUser.avatar_url, selectedUser.gender_id)"
        />
        <!-- <span v-if="selectedUser.country_emoji" class="emoji-badge">
          {{ selectedUser.country_emoji }}
        </span> -->
      </div>
    </div>

    <!-- text centered across full width -->
    <div class="flex-grow-1 d-flex justify-center">
      <a
        :to="profileLink || '#'"
        class="text-decoration-none cursor-pointer text-center"
        aria-label="View profile"
        @click.prevent="$emit('open-profile', selectedUser)"
      >
        <div class="text-body-1 font-weight-medium">
          {{ localized.displayname }}, {{ selectedUser.age }}
        </div>
        <div class="text-subtitle-2">
          {{ localized.tagline || selectedUser.tagline }}
        </div>
      </a>
    </div>
  </div>

  <div v-else class="w-100 d-flex justify-center">
    {{ $t("components.chatcontainer.select-user") }}
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { getAvatar } from "@/composables/useUserUtils";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const props = defineProps({
  selectedUser: Object,
  currentUser: Object,
  profileLink: String,
});

const { selectedUser, currentUser } = toRefs(props);
const { locale } = useI18n();

const localized = computed(() =>
  resolveProfileLocalization({
    profile: selectedUser.value,
    readerLocale: locale?.value,
  })
);

defineEmits(["open-profile"]);
</script>

<style scoped>
.avatar-left {
  position: absolute;
  left: 8px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.emoji-badge {
  position: absolute;
  top: -6px; /* tweak positioning */
  left: -6px;
  font-size: 0.75rem; /* smaller than avatar */
  line-height: 1;
}

.header-selected {
  background: rgba(227, 242, 253, 0.9);
  border-left: 3px solid #0078ff;
}
</style>
