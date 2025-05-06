<template>
  <v-card v-if="selectedUser" class="mb-2">
    <v-card-title>
      <v-row no-gutters class="align-center">
        <v-col :class="getGenderColorClass(selectedUser.gender_id)">
          

          <NuxtLink v-if="genderName" @click="toggleUserProfileDialog" class="clickable-link d-inline-flex align-center" >
            <v-icon v-if="selectedUser" :color="getGenderColor(selectedUser.gender_id)"
              :icon="getAvatarIcon(selectedUser.gender_id)" size="small"></v-icon>
            <v-avatar class="mr-3" :image="getAvatar(selectedUser.avatar_url, selectedUser.gender_id)"></v-avatar>

            {{ selectedUser ? selectedUser.displayname : "..." }}
            <v-icon size="18" class="ml-1">mdi-account-search</v-icon>
          </NuxtLink>
        </v-col>
        <v-col class="text-subtitle-1">{{
          selectedUser ? selectedUser.tagline : "..."
          }}</v-col>
        <ChatHeaderActions2 v-if="selectedUser" :selectedUser="selectedUser" :currentUser="currentUser" @upvote="upvote"
          @downvote="downvote" @toggleFavorite="toggleFavorite" @toggleBlockUser="toggleBlockUser" />
      </v-row>
    </v-card-title>

    <v-card-text>
      <div>
        {{ selectedUser ? selectedUser.age : "..." }} years old,
        {{ selectedUser?.country_name ?? "" }}
      </div>
    </v-card-text>
  </v-card>
  <v-card v-else>
    <v-card-title>Select a user to chat with</v-card-title>
  </v-card>

  <v-dialog v-model="userProfileDialog" max-width="600" transition="dialog-transition">
    <v-card>
      <PublicUserProfile :selectedUserDisplayName="selectedUser?.displayname" />
    </v-card>
  </v-dialog>
</template>

<script setup >
import { useAuthStore } from "@/stores/authStore";

// import {
//   getAvatar,
//   getAvatarIcon,
//   getGenderColor,
//   getGenderColorClass,
// } from "@/utils/userUtils";
import { getAvatar, getAvatarIcon, getGenderColor, getGenderColorClass } from "@/composables/useUserUtils";
import { bookResolver } from "nuxt-schema-org/schema";

const { getUserProfileFromId, getGenderFromId, insertBlockedUser, insertFavorite, unblockUser, deleteFavorite, upvoteUserProfile, downvoteUserProfile} = useDb();

const authStore = useAuthStore();
const user = ref(authStore.user);
// const tooltipText = ref("View profile of the user");

const props = defineProps({
  selectedUser: {
    displayname: String,
    tagline: String,
    bio: String,
    age: Number,
    gender_id: Number,
    country_name: String,
    user_id: String,
    profile_id: Number,
    isBlocked: Boolean,
    is_favorite: Boolean,
    upvotes_count: Number,
    downvotes_count: Number,
    avatar_url: String,
  } | null,
  currentUser: {
    id: String,
  },
});


const supabase = useSupabaseClient();
const notificationStore = useNotificationStore();
const hasUpvoted = ref(false);
const hasDownvoted = ref(false);
const genderName = ref(""); 
const userProfileDialog = ref(false);

const toggleUserProfileDialog = () => {
  console.log("Toggling user profile dialog");
  userProfileDialog.value = !userProfileDialog.value;
};

watch(
  () => props.selectedUser,
  async (newSelectedUser) => {
    // console.log("Mounted ChatHeader component, selectedUser:", props.selectedUser);

    if (newSelectedUser === null) {
      console.log("No user selected");
      hasUpvoted.value = false;
      hasDownvoted.value = false;
    } else {
      hasUpvoted.value = false;
      hasDownvoted.value = false;
      genderName.value = await getGenderFromId(newSelectedUser.gender_id) || "";
    }
  },
  { immediate: true }
);

const toggleBlockUser = async () => {
  if (!props.selectedUser) return;

  const { user_id, isBlocked } = props.selectedUser;

  if (isBlocked) {
    const { data, error } = await unblockUser(props.currentUser.id, user_id);

    if ( !error ) {
      props.selectedUser.isBlocked = false;
      console.log("User unblocked");
    }
  } else {
    const error = await insertBlockedUser(props.currentUser.id, user_id);
    
    if ( !error ) {
      props.selectedUser.isBlocked = true;
      console.log("User blocked");
    }
  }
};

const toggleFavorite = async () => {
  // console.log("Toggling favorite");
  if (!props.selectedUser) return;

  const { user_id, is_favorite } = props.selectedUser;

  if (is_favorite) {
    const error = await deleteFavorite(props.currentUser.id, user_id); 

    if (!error) {
      props.selectedUser.is_favorite = false;
      console.log("Favorite removed");
    }
  } else {
    const error = await insertFavorite(props.currentUser.id, user_id);

    if ( !error ) {
      props.selectedUser.is_favorite = true;
      console.log("Favorite added");
    }
  }
};

const upvote = async (targetUserId) => {
  if (hasUpvoted.value) {
    console.log("User has already upvoted this profile");
    return;
  }

  const voterUserId = props.currentUser.id;

  const error = await upvoteUserProfile(targetUserId, voterUserId);

  if (!error) {
    console.log("Profile upvoted successfully");
    if (props.selectedUser) {
      props.selectedUser.upvotes_count += 1; // Update the upvotes count locally
      hasUpvoted.value = true; // Mark as upvoted locally
    }
  }
};

const downvote = async (targetUserId) => {
  if (hasDownvoted.value) {
    console.log("User has already downvoted this profile");
    return;
  }

  const voterUserId = props.currentUser.id;

  const error = await downvoteUserProfile(targetUserId, voterUserId);

  if(!error) {
    console.log("Profile downvoted successfully");
    if (props.selectedUser) {
      props.selectedUser.downvotes_count += 1; // Update the downvotes count locally
      hasDownvoted.value = true; // Mark as downvoted locally
    }
  }
};


onMounted(async () =>
{
  genderName.value = await getGenderFromId(props.selectedUser?.gender_id) || "";
  supabase
    .channel("favorites")
    .on(
      "postgres_changes",
      { 
        event: "INSERT", 
        schema: "public", 
        table: "favorites",
        filter: `favorite_user_id=eq.${user.value.id}`,
      },
      async (payload) =>
      {
        // console.log('New favorite added:', payload);
        const { user_id: favoritingUserId } = payload.new;

        const { data, error } = await getUserProfileFromId(favoritingUserId);
        // console.log("User data:", data, "Error:", error);
        if (!data?.displayname) return;

        // console.log("Favoriting user data:", data);

        notificationStore.addNotification(
          'favorite',
          `${data?.displayname} favorited you!`,
          favoritingUserId
        );
      }
    )
    .subscribe();
});
</script>

<style scoped>
.clickable-link {
  cursor: pointer;
  text-decoration: none;
}

.male {
  color: darkblue;
}

.female {
  color: rgb(255, 63, 63);
}

.other {
  color: purple;
}
</style>
