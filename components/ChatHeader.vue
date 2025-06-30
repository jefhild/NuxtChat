<template>
  <v-card
    flat
    variant="tonal"
    :class="getGenderColorClass(selectedUser.gender_id)"
    v-if="selectedUser"
    class="mb-2"
  >
    <v-card-title class="py-1">
      <v-row no-gutters dense class="align-center">
        <v-col :class="getGenderColorClass(selectedUser.gender_id)">
          <NuxtLink
            v-if="genderName"
            @click="toggleUserProfileDialog"
            class="clickable-link d-inline-flex align-center"
          >
            <v-icon
              v-if="selectedUser"
              :color="getGenderColor(selectedUser.gender_id)"
              :icon="getAvatarIcon(selectedUser.gender_id)"
              size="small"
            ></v-icon>
            <v-avatar
              class="mr-3"
              :image="
                getAvatar(selectedUser.avatar_url, selectedUser.gender_id)
              "
            ></v-avatar>

            {{ selectedUser ? selectedUser.displayname : "..." }}
            <v-icon size="18" class="ml-1">mdi-account-search</v-icon>
          </NuxtLink>
        </v-col>
        <v-col class="text-subtitle-1 text-center">{{
          selectedUser ? selectedUser.tagline : "..."
        }}</v-col> </v-row
      ><v-row no-gutters>
        <ChatHeaderActions2
          v-if="selectedUser"
          :selectedUser="selectedUser"
          :currentUser="currentUser"
          @upvote="upvote"
          @downvote="downvote"
          @toggleFavorite="toggleFavorite"
          @toggleBlockUser="toggleBlockUser"
          @toggleReportDialog="toggleReportDialog"
        />
      </v-row>
    </v-card-title>

    <v-card-text class="py-1">
      <v-row no-gutters
        ><v-col>
          {{ selectedUser ? selectedUser.age : "..." }}
          {{ $t("components.chatheader.years-old") }}
          {{ selectedUser?.country_name ?? "" }}</v-col
        >
      </v-row>
    </v-card-text>
  </v-card>
  <v-card flat v-else>
    <v-card-title>{{
      $t("components.chatcontainer.select-user")
    }}</v-card-title>
  </v-card>

  <v-dialog
    v-model="userProfileDialog"
    max-width="600"
    transition="dialog-transition"
  >
    <v-card>
      <PublicUserProfile
        :selectedUserSlug="selectedUser?.slug"
        :isPublic="false"
      />
    </v-card>
  </v-dialog>

  <ReportUserModal
    v-model="reportDialog"
    :reportedUserId="selectedUser?.user_id"
    @submit-report="handleReport"
  />

  <v-snackbar
    v-model="showAlert"
    :timeout="3000"
    color="primary"
    location="top"
  >
    {{ snackbarMessage }}
  </v-snackbar>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

// import {
//   getAvatar,
//   getAvatarIcon,
//   getGenderColor,
//   getGenderColorClass,
// } from "@/utils/userUtils";
import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
  getGenderColorClass,
} from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const {
  getUserProfileFromId,
  getGenderFromId,
  insertBlockedUser,
  insertFavorite,
  unblockUser,
  deleteFavorite,
  upvoteUserProfile,
  downvoteUserProfile,
  insertReport,
} = useDb();

const authStore = useAuthStore();
const user = ref(authStore.user);
// const tooltipText = ref("View profile of the user");

const props = defineProps({
  selectedUser:
    {
      displayname: String,
      tagline: String,
      bio: String,
      age: Number,
      slug: String,
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

let favoriteChannel = null;

const notificationSound = new Audio("/sounds/notification.wav");
notificationSound.volume = 0.5; // Optional: adjust volume

const supabase = useSupabaseClient();
const notificationStore = useNotificationStore();
const hasUpvoted = ref(false);
const hasDownvoted = ref(false);
const genderName = ref("");

const showAlert = ref(false);
const snackbarMessage = ref("");

const userProfileDialog = ref(false);

const toggleUserProfileDialog = () => {
  // console.log("Toggling user profile dialog");
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
      genderName.value =
        (await getGenderFromId(newSelectedUser.gender_id)) || "";
    }
  },
  { immediate: true }
);

const toggleBlockUser = async () => {
  if (!props.selectedUser) return;

  const { user_id, isBlocked } = props.selectedUser;

  if (isBlocked) {
    const { data, error } = await unblockUser(props.currentUser.id, user_id);

    if (!error) {
      props.selectedUser.isBlocked = false;
      console.log("User unblocked");
    }
  } else {
    const error = await insertBlockedUser(props.currentUser.id, user_id);

    if (!error) {
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

    if (!error) {
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

  if (!error) {
    console.log("Profile downvoted successfully");
    if (props.selectedUser) {
      props.selectedUser.downvotes_count += 1; // Update the downvotes count locally
      hasDownvoted.value = true; // Mark as downvoted locally
    }
  }
};

const reportDialog = ref(false);

const toggleReportDialog = () => {
  // console.log("Toggling report dialog");
  reportDialog.value = !reportDialog.value;
};

const handleReport = async ({
  reportedUserId,
  categories,
  reason,
  messages,
}) => {
  console.log(
    "Reported User ID:",
    reportedUserId,
    "Categories:",
    categories,
    "Reason:",
    reason,
    "Messages:",
    messages
  );

  const error = await insertReport(
    props.currentUser.id,
    reportedUserId,
    categories,
    reason,
    messages
  );

  error
    ? (snackbarMessage.value = t("components.chatheader.report-failure"))
    : (snackbarMessage.value = t("components.chatheader.report-success"));

  showAlert.value = true;
};

onMounted(async () => {
  genderName.value =
    (await getGenderFromId(props.selectedUser?.gender_id)) || "";

  if (!favoriteChannel) {
    favoriteChannel = supabase.channel(`favorites`);
  }

  if (!favoriteChannel._subscribed) {
    favoriteChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "favorites",
        filter: `favorite_user_id=eq.${user.value.id}`,
      },
      async (payload) => {
        const { user_id: favoritingUserId } = payload.new;

        const { data, error } = await getUserProfileFromId(favoritingUserId);
        if (!data?.displayname) return;

        notificationSound.play().catch((e) => {
          console.warn("Autoplay failed:", e);
        });

        notificationStore.addNotification(
          "favorite",
          `${data.displayname} ` + t("components.chatheader.favorited"),
          favoritingUserId
        );
      }
    );

    const { error } = favoriteChannel.subscribe();
    if (!error) {
      favoriteChannel._subscribed = true;
    } else {
      console.error("Error subscribing to favorites channel:", error);
    }
  }
});

onBeforeUnmount(() => {
  if (favoriteChannel?._subscribed) {
    favoriteChannel.unsubscribe();
    favoriteChannel._subscribed = false;
    favoriteChannel = null;
  }
});
</script>

<style scoped>
.clickable-link {
  cursor: pointer;
  text-decoration: none;
}

.male {
  color: darkblue;
  background-color: #e3f2fd;
}

.female {
  color: rgb(255, 63, 63);
}

.other {
  color: purple;
}
</style>
