<template>
  <v-card v-if="selectedUser" class="mb-2">
    <v-card-title>
      <v-row no-gutters class="align-center">
        <v-col :class="getGenderColorClass(selectedUser.gender_id)">
          <v-icon
            v-if="selectedUser"
            :color="getGenderColor(selectedUser.gender_id)"
            :icon="getAvatarIcon(selectedUser.gender_id)"
            size="small"
          ></v-icon>

          <v-avatar
            class="mr-3"
            :image="getAvatar(selectedUser.avatar_url, selectedUser.gender_id)"
          ></v-avatar>
          <NuxtLink :to="`/profiles/${selectedUser.user_id}`">
            {{ selectedUser ? selectedUser.displayname : "..." }}
          </NuxtLink>
        </v-col>
        <v-col class="text-subtitle-1">{{
          selectedUser ? selectedUser.tagline : "..."
        }}</v-col>
        <ChatHeaderActions2
          v-if="selectedUser"
          :selectedUser="selectedUser"
          :currentUser="currentUser"
          @upvote="upvote"
          @downvote="downvote"
          @toggleFavorite="toggleFavorite"
          @toggleBlockUser="toggleBlockUser"
        />
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
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/authStore";

import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
  getGenderColorClass,
} from "@/utils/userUtils";

const authStore = useAuthStore();
// const tooltipText = ref("View profile of the user");

const props = defineProps<{
  selectedUser: {
    displayname: string;
    tagline: string;
    bio: string;
    age: number;
    gender_id: number;
    country_name: string;
    user_id: string;
    profile_id: number;
    isBlocked: boolean;
    is_favorite: boolean;
    upvotes_count: number;
    downvotes_count: number;
    avatar_url: string;
  } | null;
  currentUser: {
    id: string;
  };
}>();

const supabase = useSupabaseClient();
const hasUpvoted = ref(false);
const hasDownvoted = ref(false);
watch(
  () => props.selectedUser,
  (newSelectedUser) => {
    if (newSelectedUser === null) {
      console.log("No user selected");
      hasUpvoted.value = false;
      hasDownvoted.value = false;
    } else {
      hasUpvoted.value = false;
      hasDownvoted.value = false;
    }
  },
  { immediate: true }
);

const toggleBlockUser = async () => {
  if (!props.selectedUser) return;

  const { user_id, isBlocked } = props.selectedUser;

  if (isBlocked) {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", props.currentUser.id)
      .eq("blocked_user_id", user_id);

    if (error) {
      console.error("Error unblocking user:", error);
    } else {
      props.selectedUser.isBlocked = false;
      console.log("User unblocked");
    }
  } else {
    const { error } = await supabase
      .from("blocked_users")
      .insert({ user_id: props.currentUser.id, blocked_user_id: user_id });

    if (error) {
      console.error("Error blocking user:", error);
    } else {
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
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", props.currentUser.id)
      .eq("favorite_user_id", user_id);

    if (error) {
      console.error("Error removing favorite:", error);
    } else {
      props.selectedUser.is_favorite = false;
      console.log("Favorite removed");
    }
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: props.currentUser.id, favorite_user_id: user_id });

    if (error) {
      console.error("Error adding favorite:", error);
    } else {
      props.selectedUser.is_favorite = true;
      console.log("Favorite added");
    }
  }
};

const upvote = async (targetUserId: string) => {
  if (hasUpvoted.value) {
    console.log("User has already upvoted this profile");
    return;
  }

  const voterUserId = props.currentUser.id;

  const { error } = await supabase.rpc("upvote_profile", {
    target_user_id: targetUserId,
    voter_user_id: voterUserId,
  });

  if (error) {
    console.error("Error upvoting profile:", error.message);
  } else {
    console.log("Profile upvoted successfully");
    if (props.selectedUser) {
      props.selectedUser.upvotes_count += 1; // Update the upvotes count locally
      hasUpvoted.value = true; // Mark as upvoted locally
    }
  }
};

const downvote = async (targetUserId: string) => {
  if (hasDownvoted.value) {
    console.log("User has already downvoted this profile");
    return;
  }

  const voterUserId = props.currentUser.id;

  const { error } = await supabase.rpc("downvote_profile", {
    target_user_id: targetUserId,
    voter_user_id: voterUserId,
  });

  if (error) {
    console.error("Error downvoting profile:", error.message);
  } else {
    console.log("Profile downvoted successfully");
    if (props.selectedUser) {
      props.selectedUser.downvotes_count += 1; // Update the downvotes count locally
      hasDownvoted.value = true; // Mark as downvoted locally
    }
  }
};
</script>

<style scoped>
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
