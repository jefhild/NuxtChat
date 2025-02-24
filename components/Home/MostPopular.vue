<template>
  <v-container fluid>
    <v-expansion-panels flat v-model="activePanels">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row class="d-flex align-items-center">
            <v-col cols="auto">
              <h1
                class="font-style-poppins font-weight-light text-md-h4 text-h5"
              >
                Most Popular
              </h1>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row no-gutters>
            <!-- First column taking 50% of the width, profile[0] -->
            <v-col cols="12" md="6" v-if="popularProfiles.length > 0">
              <v-card
                hover
                link
                :href="`/profiles/${popularProfiles[0].user_id}`"
                class="mb-2"
              >
                <v-img
                  :src="popularProfiles[0].avatar_url"
                  height="425px"
                  alt="Image 1"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title">
                      {{ formatCreated(popularProfiles[0].created) }}
                    </v-col>
                    <v-col
                      cols="4"
                      class="justify-end d-flex align-center text-grey-lighten-3"
                    >
                      <span>{{ popularProfiles[0].upvote_count }}</span>
                      <v-btn
                        icon="mdi-thumb-up"
                        size="small"
                        class="ml-2"
                        color="transparent"
                        variant="flat"
                      ></v-btn>
                    </v-col>
                    <v-col cols="12" class="white--text-subtitle">
                      {{ popularProfiles[0].tagline }}
                    </v-col>
                  </v-row>
                </div>
              </v-card>
            </v-col>

            <!-- Second and third columns sharing the other 50%, profile[1] to profile[4] -->
            <v-col cols="12" md="3">
              <v-row>
                <v-col cols="12" v-if="popularProfiles.length > 1">
                  <v-card
                    hover
                    link
                    :href="`/profiles/${popularProfiles[1].user_id}`"
                    class="ml-2"
                  >
                    <v-img
                      :src="popularProfiles[1].avatar_url"
                      height="200px"
                      alt="Image 2"
                      cover
                    ></v-img>
                    <div class="text-overlay">
                      <v-row no-gutters>
                        <v-col cols="8" class="white--text-title">
                          {{ formatCreated(popularProfiles[1].created) }}
                        </v-col>
                        <v-col
                          cols="4"
                          class="justify-end d-flex align-center text-grey-lighten-3"
                        >
                          <span>{{ popularProfiles[1].upvote_count }}</span>
                          <v-btn
                            icon="mdi-thumb-up"
                            size="small"
                            class="ml-2"
                            color="transparent"
                            variant="flat"
                          ></v-btn>
                        </v-col>
                        <v-col cols="12" class="white--text-subtitle">
                          {{ popularProfiles[1].tagline }}
                        </v-col>
                      </v-row>
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" v-if="popularProfiles.length > 2">
                  <v-card
                    hover
                    link
                    :href="`/profiles/${popularProfiles[2].user_id}`"
                    class="ml-2 mb-2"
                  >
                    <v-img
                      :src="popularProfiles[2].avatar_url"
                      height="200px"
                      alt="Image 3"
                      cover
                    ></v-img>
                    <div class="text-overlay">
                      <v-row no-gutters>
                        <v-col cols="8" class="white--text-title">
                          {{ formatCreated(popularProfiles[2].created) }}
                        </v-col>
                        <v-col
                          cols="4"
                          class="justify-end d-flex align-center text-grey-lighten-3"
                        >
                          <span>{{ popularProfiles[2].upvote_count }}</span>
                          <v-btn
                            icon="mdi-thumb-up"
                            size="small"
                            class="ml-2"
                            color="transparent"
                            variant="flat"
                          ></v-btn>
                        </v-col>
                        <v-col cols="12" class="white--text-subtitle">
                          {{ popularProfiles[2].tagline }}
                        </v-col>
                      </v-row>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>

            <v-col cols="12" md="3">
              <v-row>
                <v-col cols="12" v-if="popularProfiles.length > 3">
                  <v-card
                    hover
                    link
                    :href="`/profiles/${popularProfiles[3].user_id}`"
                    class="ml-2"
                  >
                    <v-img
                      :src="popularProfiles[3].avatar_url"
                      height="200px"
                      alt="Image 4"
                      cover
                    ></v-img>
                    <div class="text-overlay">
                      <v-row no-gutters>
                        <v-col cols="8" class="white--text-title">
                          {{ formatCreated(popularProfiles[3].created) }}
                        </v-col>
                        <v-col
                          cols="4"
                          class="justify-end d-flex align-center text-grey-lighten-3"
                        >
                          <span>{{ popularProfiles[3].upvote_count }}</span>
                          <v-btn
                            icon="mdi-thumb-up"
                            size="small"
                            class="ml-2"
                            color="transparent"
                            variant="flat"
                          ></v-btn>
                        </v-col>
                        <v-col cols="12" class="white--text-subtitle">
                          {{ popularProfiles[3].tagline }}
                        </v-col>
                      </v-row>
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" v-if="popularProfiles.length > 4">
                  <v-card
                    hover
                    link
                    :href="`/profiles/${popularProfiles[4].user_id}`"
                    class="ml-2"
                  >
                    <v-img
                      :src="popularProfiles[4].avatar_url"
                      height="200px"
                      alt="Image 5"
                      cover
                    ></v-img>
                    <div class="text-overlay">
                      <v-row no-gutters>
                        <v-col cols="8" class="white--text-title">
                          {{ formatCreated(popularProfiles[4].created) }}
                        </v-col>
                        <v-col
                          cols="4"
                          class="justify-end d-flex align-center text-grey-lighten-3"
                        >
                          <span>{{ popularProfiles[4].upvote_count }}</span>
                          <v-btn
                            icon="mdi-thumb-up"
                            size="small"
                            class="ml-2"
                            color="transparent"
                            variant="flat"
                          ></v-btn>
                        </v-col>
                        <v-col cols="12" class="white--text-subtitle">
                          {{ popularProfiles[4].tagline }}
                        </v-col>
                      </v-row>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-row>
      <v-col class="text-right">
        <NuxtLink
          href="/profiles/popular"
          class="text-body-2 font-style-poppins mr-5"
          >See More Popular Profiles</NuxtLink
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
const activePanels = ref([0]);
const popularProfiles = ref([]);
const profileLimit = 5;
const supabase = useSupabaseClient();

// Fetch data during SSR
const { data, error } = await supabase.rpc("get_most_popular_profiles", {
  profile_limit: profileLimit,
});
if (error) {
  console.error("Error fetching popular profiles:", error);
} else {
  popularProfiles.value = data;
}



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
