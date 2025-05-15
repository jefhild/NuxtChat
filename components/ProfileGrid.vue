<template>
  <v-row dense>
    <transition-group name="fade">
      <v-col v-for="profile in displayedProfiles" :key="profile.user_id" cols="6" xs="6" sm="6" md="4" lg="3"
        class="d-flex justify-center pa-4">
        <NuxtLink :to="`/profiles/${profile.gender?.toLowerCase()}/${
          profile.slug
        }`" class="text-decoration-none d-flex justify-center">
          <v-card :class="[
            'profile-card text-center d-flex flex-column justify-end',
            profile.marked_for_deletion_at ? 'marked-for-deletion' : '',
          ]" elevation="2" :style="{
            backgroundImage: `url(${
              profile.avatar_url || '/default-avatar.png'
            })`,
          }">
            <div class="overlay mb-2">
              <v-row class="d-flex justify-center align-center text-center flex-column px-2 mb-2">
                <div class="font-weight-bold text-white text-truncate">
                  {{ profile.displayname }}
                </div>
                <div v-if="profile.tagline" class="tagline text-white text-caption mt-1 text-truncate">
                  {{ profile.tagline }}
                </div>
                <div v-if="profile.upvote_count" class="text-white d-flex align-center justify-center mt-1">
                  <v-icon size="16" class="mr-1" color="yellow">mdi-thumb-up</v-icon>
                  <span class="text-caption">{{ profile.upvote_count }}</span>
                </div>
              </v-row>

              <v-row class="d-flex justify-center align-center">
                <div v-if="profile.marked_for_deletion_at" class="mb-5 text-white">
                  <div>{{ timeLeft(refreshTime) }}</div>
                  <v-btn size="x-small" color="green" @click.stop.prevent="unmarkDeletion(profile)">
                    Undo Deletion
                  </v-btn>
                </div>

                <v-btn v-if="allowDelete && !profile.marked_for_deletion_at" color="red" class="overlay mb-5"
                  @click.stop.prevent="openDeleteDialog(profile)">
                  Delete
                </v-btn>
              </v-row>
            </div>

          </v-card>
        </NuxtLink>
      </v-col>
    </transition-group>
  </v-row>

  <v-row ref="infiniteScrollTrigger" v-if="props.limit && loadedCount < props.profiles.length"/>

  <v-dialog v-model="confirmDeleteDialog" max-width="400px" transition="dialog-transition">
    <v-card>
      <v-card-title class="headline">Confirm Deletion</v-card-title>

      <v-card-text>Are you sure you want to delete this user?</v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" text @click="confirmDeleteDialog = false">Cancel</v-btn>
        <v-btn color="red" text @click="confirmDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  profiles: {
    type: Array,
    required: true,
  },
  delete: {
    type: Boolean,
    default: false,
  },
  limit: {
    type: Number,
    default: null, // No limit unless specified
  },
});

const emit = defineEmits(["user-deleted"]);

const { markUserForDeletion, unmarkUserForDeletion } = useDb();

const loadedCount = ref(props.limit || 12); // Start with 8
const batchSize = 12; // How many to load each time

const displayedProfiles = computed(() =>
props.limit ? props.profiles.slice(0, loadedCount.value) : props.profiles
);

const infiniteScrollTrigger = ref(null);

function loadMoreProfiles() {
  if (loadedCount.value < props.profiles.length) {
    loadedCount.value = Math.min(loadedCount.value + batchSize, props.profiles.length);
  }
}

const allowDelete = ref(props.delete);

const confirmDeleteDialog = ref(false);
const userToDelete = ref(null);

function timeLeft(refreshTrigger) {
  const now = new Date(refreshTrigger); // Use the refresh trigger to get the current time and so vue tracks it
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);

  const diff = midnight.getTime() - now.getTime();
  if (diff <= 0) return "Deleting soon...";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

function openDeleteDialog(profile) {
  userToDelete.value = profile;
  confirmDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!userToDelete.value) return;

  await markUserForDeletion(userToDelete.value.user_id);

  emit("user-deleted", userToDelete.value.user_id); // Emit the event to parent component

  confirmDeleteDialog.value = false;
}

async function unmarkDeletion(profile) {
  try {
    await unmarkUserForDeletion(profile.user_id);
    profile.marked_for_deletion_at = null;
    console.log("User unmarked successfully!");
  } catch (err) {
    console.error("Error unmarking user:", err);
  }
}

//So that it can be updated every minute
onMounted(() => {
  // console.log("Mounted", props.profiles);
  setInterval(() => {
    refreshTime.value = Date.now();
  }, 60000); // 1 minute

  if(!props.limit) {
    return;   //so that there isnt infinite for the adlin profilegrid
  } 

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMoreProfiles();
      }
    },
    { rootMargin: "100px" } // Trigger a bit before it's in view
  );

  if (infiniteScrollTrigger.value) {
    observer.observe(infiniteScrollTrigger.value.$el || infiniteScrollTrigger.value);
  }

  onUnmounted(() => {
    observer.disconnect();
  });
});

const refreshTime = ref(Date.now());
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

.tagline {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overlay {
  z-index: 2;
  position: relative;
}

.clickable-link {
  cursor: pointer;
  text-decoration: none;
}
.marked-for-deletion {
  border: 2px solid red;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.7);
}


/*Transition group*/
.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
