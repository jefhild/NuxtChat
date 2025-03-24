<template>
  
  <v-container>
    <v-row>
      <v-col>
        <v-card>
          <v-tabs
            v-model="tab"
            align-tabs="center"
            color="deep-purple-accent-4"
            class="mb-6"
          >
            <v-tab :value="1">My Profile</v-tab>
            <v-tab :value="2">My Favorites</v-tab>
            <v-tab :value="3">Blocked Users</v-tab>
            <v-tab :value="4">Upvotes</v-tab>
          </v-tabs>
          <v-tabs-window v-model="tab" v-if="!isLoading">
            <v-tabs-window-item :value="1">
              <template v-if="!isLoading && user?.id">
                <ProfileContainer />
              </template>
              <template v-else>
                <p>Loading...</p>
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="2">
              <v-row
                ><v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
                  >Registered Users Only</v-col
                ></v-row
              >
              <template v-if="!isLoading && user?.id">
                <Favorites :userId="user.id" />
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="3">
              <template v-if="!isLoading && user?.id">
                <BlockedUsers :userId="user.id" />
              </template>
              <template v-else>
                <p>Loading...</p>
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="4">
              <v-row
                ><v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
                  >Registered Users Only</v-col
                ></v-row
              >
              <template v-if="!isLoading && user?.id">
                <Upvotes :userId="user.id" />
              </template>
              <template v-else>
                <p>Loading...</p>
              </template>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted, defineProps } from "vue";
import { useAuthStore } from "@/stores/authStore";
// import Upvotes from "@/components/Upvotes.vue";


const tab = ref(1);
const authStore = useAuthStore();
const user = ref(authStore.user);

const isLoading = ref(true);

onMounted(async () => {
  // console.log("settingsContainer onMounted  ");
  await authStore.checkAuth();
  user.value = authStore.user;
  // console.log("authStore.user: ", authStore.user);
  isLoading.value = false;
});
</script>

<style></style>
