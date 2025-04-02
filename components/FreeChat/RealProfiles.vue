<template>
  <v-container>
    <v-row
      ><v-col>
        <div>Popular Real Profiles</div>

        <p class="text-h4 font-weight-black">Real User Profiles</p>
      </v-col></v-row
    >

    <v-row>
      <v-col v-for="profile in popularProfiles" :key="profile.id" cols="12">
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

const popularProfiles = ref([]);
const profileLimit = 5;

const { getMostPopularProfiles } = useDb();

// Fetch data during SSR
const data = await getMostPopularProfiles(profileLimit);

if (data){
  popularProfiles.value = data;
  // console.log("popularProfiles", popularProfiles.value);
}

// // Function to format the 'created' column
// const formatCreated = (created) => {
//   const date = new Date(created);
//   return date.toISOString().split("T")[0]; // Formats the date as "YYYY-MM-DDTHH:mm:ss.sssZ"
// };
</script>
