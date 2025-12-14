<script setup>
const props = defineProps({
  participants: { type: Array, default: () => [] },
  now: { type: Array, default: () => [] }, // backwards compatibility
  getAvatar: { type: Function, required: true },
  getGenderColor: { type: Function, required: true },
  getAvatarIcon: { type: Function, required: true },
  getGenderPath: { type: Function, required: true },
});
const emit = defineEmits(["select"]);
</script>

<template>
  <v-card-title class="text-subtitle-2 py-2">Participants</v-card-title>
  <v-divider />
  <v-list density="compact">
    <v-list-item
      v-if="!participants.length"
      title="No participants yet."
    />
    <template v-else>
      <v-list-item
        v-for="u in participants"
        :key="u.id || u.userId || u.displayname"
        @click="emit('select', u)"
      >
        <template #prepend>
          <div class="avatar-with-icon">
            <v-avatar size="32">
              <v-img :src="getAvatar(u.avatarUrl, u.gender_id)" />
            </v-avatar>
            <v-icon
              v-if="!u.isPersona"
              class="gender-icon"
              :color="getGenderColor(u.gender_id)"
              size="18"
              :title="u.gender?.name || 'Other/Unspecified'"
              :icon="getAvatarIcon(u.gender_id)"
            />
            <span
              v-if="u.isOnline"
              class="online-dot"
              title="Online now"
            ></span>
          </div>
        </template>

        <v-list-item-title class="text-body-2">
          <NuxtLink
            v-if="u.slug"
            :to="`/profiles/${getGenderPath(u.gender_id)}/${u.slug}`"
            class="profile-link"
          >
            {{ u.displayname || u.userId }}
          </NuxtLink>
          <template v-else>
            {{ u.displayname || u.userId }}
          </template>
          <v-chip
            v-if="u.isPersona"
            size="x-small"
            class="ml-2"
            color="deep-purple"
            variant="tonal"
          >
            AI
          </v-chip>
        </v-list-item-title>
      </v-list-item>
    </template>
  </v-list>
</template>

<style scoped>
.avatar-with-icon {
  position: relative;
  margin-right: 8px;
}
.gender-icon {
  position: absolute;
  right: -2px;
  bottom: -2px;
  background: var(--v-theme-surface);
  border-radius: 50%;
  padding: 1px;
}
.online-dot {
  position: absolute;
  left: -3px;
  top: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--v-theme-success);
  box-shadow: 0 0 0 2px var(--v-theme-surface);
}
.profile-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}
.profile-link:hover {
  color: var(--v-theme-primary);
  text-decoration: underline;
}
</style>
