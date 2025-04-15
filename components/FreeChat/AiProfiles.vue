<template>
  <v-container>
    <h2 class="text-h5 font-weight-medium mb-4">Popular AI Profiles</h2>

    <v-row dense>
      <v-col v-for="profile in aiProfiles" :key="profile.id" cols="12" sm="6" md="4" lg="3"
        class="d-flex justify-center">
        <v-card :to="`/profiles/${profile.gender}/${profile.displayname}`" class="profile-card text-center d-flex flex-column justify-end"
          elevation="2" :style="{ backgroundImage: `url(${profile.avatar_url || '/default-avatar.png'})` } ">
          <div class="overlay">
            <div class="font-weight-bold text-white mb-1">{{ profile.displayname }}</div>
          </div>
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

