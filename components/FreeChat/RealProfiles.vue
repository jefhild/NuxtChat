<template>
  <v-container>
    <h2 class="text-h5 font-weight-medium mb-4">Popular Real Profiles</h2>

    <v-row dense>
      <v-col v-for="profile in popularProfiles" :key="profile.id" cols="12" sm="6" md="4" lg="3"
        class="d-flex justify-center pa-4">
        <v-card :to="`/profiles/${profile.displayname}`" class="profile-card text-center d-flex flex-column justify-end"
          elevation="2" :style="{ backgroundImage: `url(${profile.avatar_url || '/default-avatar.png'})` }">
          <div class="overlay">
            <div class="font-weight-bold text-white mb-1">{{ profile.displayname }}</div>
            
            <div class="text-white text-caption">
              {{ profile.upvote_count }}
              <v-icon color="green" size="small" icon="mdi-thumb-up-outline"></v-icon>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>


<script setup>

const popularProfiles = ref([]);
const profileLimit = 30;

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

<style scoped>
.profile-card {
  width: 180px;
  height: 220px;
  background-size: cover;
  background-position: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 15px;
}

.profile-card:hover {
  transform: scale(1.03);
}

.profile-card::before {
  content: "";
  background: rgba(0, 0, 0, 0.15);
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 8px;
}

.overlay {
  z-index: 2;
  position: relative;
  padding-bottom: 16px;
}
</style>