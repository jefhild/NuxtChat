<template>
  <v-container fluid>
    <v-expansion-panels flat v-model="activePanels">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col>
              <h1
                class="font-style-poppins font-weight-light text-md-h4 text-h5"
              >
                More Popular Profiles
              </h1>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row no-gutters>
            <!-- Loop to create a row of 4 profiles -->
            <v-col
              cols="12"
              md="3"
              v-for="(profile, index) in popularProfiles.slice(0, 10)"
              :key="profile.profile_id"
            >
              <v-card
                hover
                link
                :href="`/profiles/${profile.user_id}`"
                class="ml-2 mb-2"
              >
                <v-img
                  :src="profile.avatar_url"
                  height="200px"
                  :alt="'Image ' + (index + 1)"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title">
                      {{ formatCreated(profile.created) }}
                    </v-col>
                    <v-col
                      cols="4"
                      class="justify-end d-flex align-center text-grey-lighten-3"
                    >
                      <span>{{ profile.upvote_count }}</span>
                      <v-btn
                        icon="mdi-thumb-up"
                        size="small"
                        class="ml-2"
                        color="transparent"
                        variant="flat"
                      ></v-btn>
                    </v-col>
                    <v-col cols="12" class="white--text-subtitle">
                      {{ profile.tagline }}
                    </v-col>
                  </v-row>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-row>
      <v-col class="text-right">
        <NuxtLink href="/" class="text-body-2 font-style-poppins mr-5">Go back</NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
const activePanels = ref([0]);
const popularProfiles = ref([]);
const profileLimit = 10;
const supabase = useSupabaseClient();

// Fetch data during SSR
const { data, error } = await supabase.rpc("get_most_popular_profiles", { profile_limit: profileLimit });
if (error) {
  console.error("Error fetching popular profiles:", error);
} else {
  popularProfiles.value = data;
}
useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles/popular",
    },
  ],
  title: "Popular Chat Profiles",
}));

useSeoMeta({
  title: "Popular Chat Profiles",
  description:
    "Check out our most popular profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Chat Profiles",
  ogDescription: "Check out our most popular profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Chat Profiles",
  twitterDescription: "Check out our most popular profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // twitterImage: popularProfiles[0].value.avatar_url,
});

// Function to format the 'created' column
const formatCreated = (created) => {
  const date = new Date(created);
  return date.toISOString().split("T")[0]; // Formats the date as "YYYY-MM-DDTHH:mm:ss.sssZ"
};
</script>

<style scoped>
.card-spacing {
  margin: 10px;
}

.text-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(
    0,
    0,
    0,
    0.3
  ); /* Optional background for better readability */
  padding: 5px;
  text-align: left;
}

.white--text-title {
  font-family: "poppins", sans-serif;
  font-size: 0.8rem;
  font-weight: 400;
  color: white;
}

.white--text-subtitle {
  font-family: "poppins", sans-serif;
  font-size: 1.5rem;
  font-weight: 400;
  color: white;
}

.font-style-poppins {
  font-family: "poppins", sans-serif;
}
</style>
