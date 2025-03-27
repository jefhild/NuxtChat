<template>
  <v-container>
    <v-row
      ><v-col>
        <div>Popular AI Profiles</div>

        <p class="text-h4 font-weight-black">AI User Profiles</p>
      </v-col></v-row
    >

    <v-row>
      <v-col v-for="profile in aiProfiles" :key="profile.id" cols="12">
        <v-card
          hover
          link
          :href="`/profiles/${profile.user_id}`"
          class="ml-2 mb-2"
        >
          <v-img :src="profile.avatar_url" height="200px" cover>
            <v-card-title class="text-white">
              {{ profile.upvote_count }}
              <v-icon
                color="white"
                size="small"
                icon="mdi-thumb-up-outline"
              ></v-icon>
              {{ profile.displayname }}
            </v-card-title>
          </v-img>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>

const aiProfiles = ref([]);
const profileLimit = 5;
const { getMostPopularAiProfiles } = useDb();

// Fetch data during SSR
const data = await getMostPopularAiProfiles(profileLimit);
if (data) {
  aiProfiles.value = data;
  // console.log("aiProfiles", aiProfiles.value);
}


</script>
