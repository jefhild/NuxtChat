<template>
  <v-container>
    <LoadingContainer v-if="isLoading" />

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="tab" bg-color="primary">
            <v-tab value="registered">Registered</v-tab>
            <v-tab value="ai">AI</v-tab>
          </v-tabs>

          <v-card-text>
            <div class="d-flex flex-column flex-md-row ga-4 mb-6">
              <v-text-field
                v-model="search"
                label="Search profiles..."
                variant="outlined"
                clearable
                class="flex-1"
              />
              <v-select
                v-model="sortSelection"
                :items="sortOptions"
                label="Sort by"
                variant="outlined"
                class="admin-sort"
              />
            </div>

            <v-data-table
              v-model:expanded="expanded"
              :headers="tableHeaders"
              :items="activeProfiles"
              :items-per-page="-1"
              item-value="user_id"
              show-expand
              fixed-header
              height="680"
              class="admin-table"
              :sort-by="sortBy"
              :loading="bulkActivityLoading"
              hover
              hide-default-footer
            >
              <template #item.profile="{ item }">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="40">
                    <v-img
                      :src="getAvatar(item.avatar_url, item.gender_id)"
                      :alt="item.displayname || 'Profile avatar'"
                    />
                  </v-avatar>
                  <div class="d-flex flex-column">
                    <span class="font-weight-medium">
                      {{ item.displayname || "Unknown" }}
                    </span>
                    <span class="text-caption text-medium-emphasis">
                      {{ item.slug || item.user_id }}
                    </span>
                    <span
                      v-if="item.marked_for_deletion_at"
                      class="text-caption text-red"
                    >
                      Marked for deletion
                    </span>
                  </div>
                </div>
              </template>

              <template #item.gender="{ item }">
                <span>{{ getGenderLabel(item) }}</span>
              </template>

              <template #item.country="{ item }">
                <span>
                  {{ getCountryLabel(item) }}
                  <span v-if="getCountryEmoji(item)">
                    {{ getCountryEmoji(item) }}
                  </span>
                </span>
              </template>

              <template #item.chatCount="{ item }">
                <span class="text-body-2">{{ item.chatCount }}</span>
              </template>

              <template #item.discussionCount="{ item }">
                <span class="text-body-2">{{ item.discussionCount }}</span>
              </template>

              <template #item.createdAtSort="{ item }">
                <span class="text-body-2">{{ formatDate(item.createdAt) }}</span>
              </template>

              <template #item.email="{ item }">
                <span class="text-body-2">{{ item.email || "—" }}</span>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex align-center ga-1">
                  <v-tooltip text="View profile">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-account-eye"
                        size="small"
                        variant="text"
                        color="primary"
                        @click="goToProfile(item)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Edit profile">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-account-edit"
                        size="small"
                        variant="text"
                        color="blue"
                        @click="editProfile(item)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip
                    v-if="!item.marked_for_deletion_at"
                    text="Delete profile"
                  >
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="red"
                        @click="openDeleteDialog(item)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip v-else text="Undo deletion">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-undo"
                        size="small"
                        variant="text"
                        color="green"
                        @click="unmarkDeletion(item)"
                      />
                    </template>
                  </v-tooltip>
                </div>
              </template>

              <template #expanded-row="{ columns, item }">
                <tr>
                  <td :colspan="columns.length">
                    <v-card variant="tonal" class="ma-3 pa-4">
                      <div v-if="isActivityLoading(item.user_id)">
                        <v-progress-linear indeterminate color="primary" />
                      </div>
                      <div v-else class="d-flex flex-column ga-4">
                        <div class="d-flex flex-column flex-md-row ga-6">
                          <div class="flex-1">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Chat (messages)
                            </div>
                            <div class="text-h6">
                              {{ getActivity(item.user_id).chatCount || 0 }}
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Last message:
                              {{
                                formatDateTime(
                                  getActivity(item.user_id).chatLastAt
                                )
                              }}
                            </div>
                          </div>
                          <div class="flex-1">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Discussions (messages_v2)
                            </div>
                            <div class="text-h6">
                              {{
                                getActivity(item.user_id).discussionCount || 0
                              }}
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Last comment:
                              {{
                                formatDateTime(
                                  getActivity(item.user_id).discussionLastAt
                                )
                              }}
                            </div>
                          </div>
                          <div class="flex-1">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Votes (discussions)
                            </div>
                            <div class="text-h6">
                              {{ getActivity(item.user_id).discussionUpvotes || 0 }}
                              up /
                              {{
                                getActivity(item.user_id).discussionDownvotes ||
                                0
                              }}
                              down
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Based on last
                              {{ getActivity(item.user_id).voteSampleSize || 0 }}
                              messages
                            </div>
                          </div>
                        </div>

                        <div>
                          <div class="text-subtitle-2 text-medium-emphasis mb-2">
                            Recent discussion threads
                          </div>
                          <div
                            v-if="
                              getActivity(item.user_id).discussionThreads?.length
                            "
                            class="d-flex flex-wrap ga-2"
                          >
                            <v-chip
                              v-for="thread in getActivity(item.user_id)
                                .discussionThreads?.slice(0, 8)"
                              :key="thread.id"
                              size="small"
                              variant="tonal"
                              color="primary"
                              clickable
                              @click="goToThread(thread)"
                            >
                              {{ thread.title || thread.slug || thread.id }}
                              ({{ thread.messageCount }})
                            </v-chip>
                          </div>
                          <div v-else class="text-caption text-medium-emphasis">
                            No discussion threads yet.
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="confirmDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="headline">Confirm Deletion</v-card-title>
        <v-card-text>Are you sure you want to delete this user?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="confirmDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn color="red" variant="text" @click="confirmDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { getAvatar, getGenderPath } from "@/composables/useUserUtils";

const isLoading = ref(true);
const tab = ref("registered");
const profiles = ref([]); // will always be an array after load
const aiProfiles = ref([]);
const search = ref("");
const expanded = ref([]);
const sortSelection = ref("newest");
const activityByUserId = ref({});
const activityLoadingIds = ref([]);
const bulkActivityLoading = ref(false);
const confirmDeleteDialog = ref(false);
const userToDelete = ref(null);

const localPath = useLocalePath();
const router = useRouter();

const {
  getAdminProfiles,
  markUserForDeletion,
  unmarkUserForDeletion,
  getUserActivitySummary,
} = useDb();

// tiny helper to coerce “maybe array” -> array
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

onMounted(async () => {
  try {
    const [regRaw, aiRaw] = await Promise.all([
      getAdminProfiles(false),
      getAdminProfiles(true),
    ]);
    profiles.value = toArray(regRaw);
    aiProfiles.value = toArray(aiRaw);
  } catch (e) {
    console.error("[admin] getAllProfiles failed:", e);
    profiles.value = [];
    aiProfiles.value = [];
  } finally {
    isLoading.value = false;
  }
});

const normSearch = computed(() => (search.value || "").toLowerCase());

const matchesSearch = (p) => {
  if (!normSearch.value) return true;
  const haystack = [
    p?.displayname,
    p?.username,
    p?.slug,
    p?.email,
    p?.user_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normSearch.value);
};

const filteredRegistered = computed(() =>
  profiles.value.filter(
    (p) =>
      // tolerate missing fields
      p?.provider !== "anonymous" && matchesSearch(p)
  )
);

const filteredAI = computed(() =>
  aiProfiles.value.filter((p) => matchesSearch(p))
);

const sortOptions = [
  { title: "Newest", value: "newest" },
  { title: "Most active (chat)", value: "chat" },
  { title: "Most active (discussions)", value: "discussions" },
];

const sortBy = computed(() => {
  switch (sortSelection.value) {
    case "chat":
      return [{ key: "chatCount", order: "desc" }];
    case "discussions":
      return [{ key: "discussionCount", order: "desc" }];
    default:
      return [{ key: "createdAtSort", order: "desc" }];
  }
});

const tableHeaders = [
  { title: "Profile", key: "profile", sortable: false },
  { title: "Gender", key: "gender" },
  { title: "Country", key: "country" },
  { title: "Chat", key: "chatCount", align: "end" },
  { title: "Discussions", key: "discussionCount", align: "end" },
  { title: "Joined", key: "createdAtSort", align: "end" },
  { title: "Email", key: "email" },
  { title: "Actions", key: "actions", sortable: false },
];

const getActivity = (userId) => activityByUserId.value[userId] || {};
const isActivityLoading = (userId) => activityLoadingIds.value.includes(userId);

const buildProfileRow = (p) => {
  const activity = getActivity(p?.user_id);
  const chatCount = Number(
    activity.chatCount ?? p?.chat_count ?? p?.messages_count ?? 0
  );
  const discussionCount = Number(
    activity.discussionCount ?? p?.messages_v2_count ?? p?.discussion_count ?? 0
  );
  const createdAt =
    p?.created ||
    p?.created_at ||
    p?.createdAt ||
    p?.inserted_at ||
    p?.created_on ||
    null;
  const createdAtSort = createdAt ? new Date(createdAt).getTime() || 0 : 0;
  return {
    ...p,
    chatCount,
    discussionCount,
    createdAt,
    createdAtSort,
  };
};

const activeProfiles = computed(() => {
  const base =
    tab.value === "registered"
      ? filteredRegistered.value
      : filteredAI.value;
  return base.map(buildProfileRow);
});

watch(expanded, (next) => {
  (next || []).forEach((userId) => ensureActivityLoaded(userId));
});

watch(
  () => sortSelection.value,
  () => {
    if (sortSelection.value !== "newest") {
      preloadActivity(activeProfiles.value);
    }
  }
);

watch(
  () => tab.value,
  () => {
    if (sortSelection.value !== "newest") {
      preloadActivity(activeProfiles.value);
    }
  }
);

const preloadActivity = async (items) => {
  if (bulkActivityLoading.value) return;
  const ids = (items || [])
    .map((p) => p.user_id)
    .filter((id) => id && !activityByUserId.value[id]);
  if (!ids.length) return;

  bulkActivityLoading.value = true;
  try {
    const batchSize = 6;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => ensureActivityLoaded(id)));
    }
  } finally {
    bulkActivityLoading.value = false;
  }
};

const ensureActivityLoaded = async (userId) => {
  if (!userId || activityByUserId.value[userId]) return;
  if (isActivityLoading(userId)) return;
  activityLoadingIds.value = [...activityLoadingIds.value, userId];
  try {
    const { data } = await getUserActivitySummary(userId);
    if (data) {
      activityByUserId.value = {
        ...activityByUserId.value,
        [userId]: data,
      };
    }
  } finally {
    activityLoadingIds.value = activityLoadingIds.value.filter(
      (id) => id !== userId
    );
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getGenderLabel = (profile) =>
  profile?.gender ||
  profile?.gender_name ||
  profile?.genders?.name ||
  (profile?.gender_id ? `Gender ${profile.gender_id}` : "—");

const getCountryLabel = (profile) =>
  profile?.country ||
  profile?.country_name ||
  profile?.countries?.name ||
  "—";

const getCountryEmoji = (profile) =>
  profile?.country_emoji || profile?.countries?.emoji || "";

const profilePath = (profile) => {
  const genderPath =
    profile?.gender?.toLowerCase?.() ||
    (profile?.gender_id ? getGenderPath(profile.gender_id) : "other");
  const slug = profile?.slug || profile?.displayname || profile?.user_id;
  return localPath(`/profiles/${genderPath}/${slug}`);
};

const goToProfile = (profile) => {
  router.push(profilePath(profile));
};

const editProfile = (profile) => {
  if (!profile?.user_id) return;
  router.push(localPath(`/admin/profiles/${profile.user_id}`));
};

const goToThread = (thread) => {
  const key = thread?.slug || thread?.id;
  if (!key) return;
  router.push(localPath(`/chat/articles/${key}`));
};

function openDeleteDialog(profile) {
  userToDelete.value = profile;
  confirmDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!userToDelete.value) return;
  try {
    await markUserForDeletion(userToDelete.value.user_id);
    handleUserDeleted(userToDelete.value.user_id);
    confirmDeleteDialog.value = false;
  } catch (error) {
    console.error("Error marking user for deletion:", error);
  }
}

async function unmarkDeletion(profile) {
  try {
    await unmarkUserForDeletion(profile.user_id);
    handleUserDeleted(profile.user_id, true);
  } catch (error) {
    console.error("Error unmarking user:", error);
  }
}

async function handleUserDeleted(userId, undo = false) {
  const nextValue = undo ? null : new Date().toISOString();
  profiles.value = profiles.value.map((p) =>
    p?.user_id === userId ? { ...p, marked_for_deletion_at: nextValue } : p
  );
  aiProfiles.value = aiProfiles.value.map((p) =>
    p?.user_id === userId ? { ...p, marked_for_deletion_at: nextValue } : p
  );
}
</script>

<style scoped>
.admin-table :deep(thead th) {
  white-space: nowrap;
}

.admin-sort {
  min-width: 220px;
}
</style>
