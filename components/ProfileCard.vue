<template>
  <v-card
    v-if="profile"
    class="mx-auto profile-card"
    :max-width="maxWidth"
  >
    <slot name="overlay" />
    <div class="avatar-wrapper">
      <NuxtImg
        :src="getAvatar(profile.avatar_url, profile.gender_id)"
        height="200"
        width="200"
        class="rounded-circle cover-image mx-auto d-block ma-9"
        :alt="`${profile.displayname} image`"
      />

      <NuxtImg
        v-if="avatarDecoration"
        :src="avatarDecoration"
        class="avatar-decoration"
        :alt="`${profile.displayname} image decoration`"
      />
    </div>

    <v-card-title>
      <v-row>
        <v-col>
          <h1 class="text-h5">
            {{ profile?.displayname }}, {{ profile?.age }}
          </h1>
        </v-col>
      </v-row>
    </v-card-title>

    <v-card-subtitle>
      <v-row>
        <v-col>{{ profile?.tagline }}</v-col>
        <v-col class="justify-end d-flex align-center">
          {{ profile?.status }}, {{ profile?.country }}
          {{ profile.country_emoji }}
        </v-col>
      </v-row>
    </v-card-subtitle>

    <v-card-text>
      <v-row v-if="profile?.looking_for?.length">
        <v-col class="text-h6">
          {{ $t("components.public-user-profile.looking-for") }}
        </v-col>
      </v-row>
      <v-row v-if="profile?.looking_for?.length" no-gutters>
        <v-col class="ml-2">{{ profile?.looking_for.join(", ") }}</v-col>
      </v-row>
      <v-row v-if="profile?.bio">
        <v-col class="text-h6">
          {{ $t("components.public-user-profile.about-me") }}
        </v-col>
      </v-row>
      <v-row v-if="profile?.bio">
        <v-col class="bio-paragraph">{{ profile?.bio }}</v-col>
      </v-row>
    </v-card-text>

    <v-card-actions
      style="
        position: relative;
        bottom: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.1);
      "
    >
      <v-btn
        v-if="profileSiteUrl"
        :href="profileSiteUrl"
        color="medium-emphasis"
        icon="mdi-link-variant"
        size="small"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="
          $t('components.public-user-profile.visit1') +
          `${profile?.displayname}` +
          $t('components.public-user-profile.visit2')
        "
      ></v-btn>
      <v-btn
        v-else
        color="medium-emphasis"
        icon="mdi-link-variant-off"
        size="small"
        disabled
      ></v-btn>
      <v-spacer></v-spacer>

      <ButtonFavorite :profile="profile" />

      <v-btn color="blue medium-emphasis" icon="mdi-cancel" size="small"></v-btn>

      <v-btn
        color="black medium-emphasis"
        icon="mdi-share-variant"
        size="small"
      ></v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { getAvatar } from "@/composables/useUserUtils";

const props = defineProps({
  profile: { type: Object, default: null },
  avatarDecoration: { type: String, default: "" },
  maxWidth: { type: [Number, String], default: 400 },
});

const profileSiteUrl = computed(() => {
  const siteUrl = props.profile?.site_url;
  if (!siteUrl || typeof siteUrl !== "string") return null;
  return siteUrl.trim().startsWith("http")
    ? siteUrl
    : `https://${siteUrl.trim()}`;
});
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.avatar-wrapper {
  position: relative;
}

.avatar-decoration {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 245px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.subtitle-1 {
  font-size: 1.2rem;
  color: #757575;
}

.subtitle-2 {
  font-size: 1rem;
  color: #9e9e9e;
}

.bio-paragraph {
  font-size: 1rem;
  line-height: 1.25;
  color: #374151;
  font-style: italic;
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  text-align: justify;
}
</style>
