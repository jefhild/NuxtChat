<template>
  <v-container fluid class="admin-dashboard">
    <LoadingContainer v-if="isLoading" />

    <v-row v-else>
      <v-col cols="12">
        <v-card>
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
                v-model="filterSelection"
                :items="filterOptions"
                label="User filter"
                variant="outlined"
                class="admin-filter"
              />
              <v-select
                v-model="sortSelection"
                :items="sortOptions"
                label="Sort by"
                variant="outlined"
                class="admin-sort"
              />
              <v-btn
                v-if="markedCount"
                color="red"
                variant="outlined"
                class="admin-purge"
                @click="purgeDialogOpen = true"
              >
                Purge marked ({{ markedCount }})
              </v-btn>
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
                  <v-badge
                    v-if="hasPendingReply(item)"
                    color="red"
                    dot
                    location="top end"
                    offset-x="2"
                    offset-y="2"
                  >
                    <v-avatar size="40">
                      <v-img
                        :src="getAvatar(item.avatar_url, item.gender_id)"
                        :alt="displayNameFor(item) || 'Profile avatar'"
                      />
                    </v-avatar>
                  </v-badge>
                  <v-avatar v-else size="40">
                    <v-img
                      :src="getAvatar(item.avatar_url, item.gender_id)"
                      :alt="displayNameFor(item) || 'Profile avatar'"
                    />
                  </v-avatar>
                  <div class="d-flex flex-column">
                    <span class="font-weight-medium">
                      {{ displayNameFor(item) }}
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

              <template #item.createdAtSort="{ item }">
                <span class="text-body-2 admin-nowrap">
                  {{ formatDate(item.createdAt) }}
                </span>
              </template>

              <template #item.email="{ item }">
                <span class="text-body-2 admin-ellipsis">
                  {{ item.email || "—" }}
                </span>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex align-center ga-1">
                  <v-tooltip text="Mock chat">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-message-text-fast"
                        size="small"
                        variant="text"
                        color="deep-purple"
                        @click="openMockChatDialog(item)"
                      />
                    </template>
                  </v-tooltip>
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
                        @click="markForDeletion(item)"
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
                        <div class="d-flex align-center ga-3">
                          <div class="text-subtitle-2 text-medium-emphasis">
                            User ID
                          </div>
                          <div class="text-body-2 font-weight-medium">
                            {{ item.user_id || "—" }}
                          </div>
                        </div>
                        <div class="d-flex flex-column flex-md-row ga-6">
                          <div class="flex-1">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Chat (messages)
                            </div>
                            <div class="text-h6">
                              <v-btn
                                variant="text"
                                color="primary"
                                size="small"
                                class="pa-0"
                                @click="openChatMessages(item.user_id)"
                              >
                                {{ getActivity(item.user_id).chatCount || 0 }}
                              </v-btn>
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
                              <v-btn
                                variant="text"
                                color="primary"
                                size="small"
                                class="pa-0"
                                @click="openDiscussionMessages(item.user_id)"
                              >
                                {{
                                  getActivity(item.user_id).discussionCount || 0
                                }}
                              </v-btn>
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
                          <div v-if="item.is_ai" class="flex-1">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Expertise
                            </div>
                            <div class="text-h6">
                              {{ getAiCategoryLabel(item) }}
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Category setting
                            </div>
                          </div>
                        </div>

                        <div v-if="hasPendingPhotos(item)" class="d-flex align-center ga-2">
                          <div class="text-subtitle-2 text-medium-emphasis">
                            Photo library
                          </div>
                          <v-btn
                            size="small"
                            variant="outlined"
                            color="primary"
                            :to="photoReviewLink"
                          >
                            Review pending photos
                          </v-btn>
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

    <v-dialog v-model="purgeDialogOpen" max-width="460px">
      <v-card>
        <v-card-title class="headline">Purge marked profiles</v-card-title>
        <v-card-text>
          This permanently deletes all profiles marked for deletion, including
          their Supabase auth users. This cannot be undone.
          <div v-if="purgeError" class="text-caption text-error mt-2">
            {{ purgeError }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="purgeDialogOpen = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="red"
            variant="text"
            :loading="purgeBusy"
            @click="purgeMarkedProfiles"
          >
            Purge
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mockDialogOpen" max-width="720px" persistent>
      <v-card>
        <v-card-title class="headline">Mock chat script</v-card-title>
        <v-card-text>
          <div class="d-flex flex-column ga-4">
            <div class="d-flex flex-column ga-1">
              <div class="text-caption text-medium-emphasis">User A (impersonated)</div>
              <div class="text-body-2 font-weight-medium">
                {{ mockUserA?.displayname || mockUserA?.slug || mockUserA?.user_id || "—" }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ mockUserA?.user_id || "" }}
              </div>
            </div>

            <v-select
              v-model="mockUserB"
              :items="mockUserOptions"
              label="User B"
              variant="outlined"
              density="compact"
              item-title="label"
              item-value="value"
              clearable
              hide-details
            />

            <v-file-input
              label="Upload JSON script"
              variant="outlined"
              density="compact"
              accept=".json,application/json"
              show-size
              @update:model-value="onMockFileSelected"
            />

            <v-textarea
              v-model="mockJsonText"
              label="JSON script"
              variant="outlined"
              rows="8"
              auto-grow
              placeholder='{"userB":"...","delayMs":1200,"messages":[{"from":"A","text":"hi"}]}'
            />

            <div class="d-flex flex-column flex-md-row ga-4">
              <v-text-field
                v-model.number="mockStartDelayMs"
                label="Start delay (ms)"
                type="number"
                variant="outlined"
                density="compact"
              />
              <v-text-field
                v-model.number="mockDelayMs"
                label="Delay between messages (ms)"
                type="number"
                variant="outlined"
                density="compact"
              />
              <v-switch
                v-model="mockOpenInNewTab"
                label="Open chat in new tab"
                inset
              />
            </div>

            <div v-if="mockError" class="text-caption text-error">
              {{ mockError }}
            </div>

            <div v-if="mockRunning" class="text-caption text-medium-emphasis">
              Sending {{ mockProgress.done }} / {{ mockProgress.total }}…
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey"
            :disabled="mockRunning"
            @click="closeMockChatDialog"
          >
            Close
          </v-btn>
          <v-btn
            variant="text"
            color="red"
            v-if="mockRunning"
            @click="cancelMockChat"
          >
            Stop
          </v-btn>
          <v-btn
            variant="text"
            color="orange"
            :disabled="mockRunning || !mockInsertedIds.length"
            @click="deleteLastMockRun"
          >
            Delete last run
          </v-btn>
          <v-btn
            variant="text"
            color="primary"
            :loading="mockRunning"
            @click="runMockChat"
          >
            Start mock chat
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="chatDialogOpen" max-width="980px">
      <v-card>
        <v-card-title class="headline">Chat messages</v-card-title>
        <v-card-text>
          <v-data-table
            :headers="chatMessageHeaders"
            :items="chatMessages"
            :loading="chatMessagesLoading"
            item-value="id"
            class="admin-table"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.content="{ item }">
              <span class="text-body-2">{{ item.content || "—" }}</span>
            </template>
            <template #item.receiver="{ item }">
              <span class="text-body-2">
                {{ item.receiver?.displayname || item.receiver_id || "—" }}
              </span>
            </template>
            <template #item.created_at="{ item }">
              <span class="text-body-2">
                {{ formatDateTime(item.created_at) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <v-tooltip text="Delete message">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="red"
                    :loading="deletingMessageIds.includes(item.id)"
                    @click="deleteChatMessage(item)"
                  />
                </template>
              </v-tooltip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="discussionDialogOpen" max-width="980px">
      <v-card>
        <v-card-title class="headline">Discussion messages</v-card-title>
        <v-card-text>
          <v-data-table
            :headers="discussionMessageHeaders"
            :items="discussionMessages"
            :loading="discussionMessagesLoading"
            item-value="id"
            class="admin-table"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.content="{ item }">
              <span class="text-body-2">{{ item.content || "—" }}</span>
            </template>
            <template #item.thread="{ item }">
              <span class="text-body-2">
                {{
                  item.thread?.title ||
                  item.thread?.slug ||
                  item.thread_id ||
                  "—"
                }}
              </span>
            </template>
            <template #item.created_at="{ item }">
              <span class="text-body-2">
                {{ formatDateTime(item.created_at) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <v-tooltip text="Delete message">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="red"
                    :loading="deletingMessageIds.includes(item.id)"
                    @click="deleteDiscussionMessage(item)"
                  />
                </template>
              </v-tooltip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { getAvatar, getGenderPath } from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const isLoading = ref(true);
const profiles = ref([]); // will always be an array after load
const aiProfiles = ref([]);
const search = ref("");
const expanded = ref([]);
const sortSelection = ref("newest");
const filterSelection = ref("registered");
const activityByUserId = ref({});
const activityLoadingIds = ref([]);
const bulkActivityLoading = ref(false);
const pendingReplyByUserId = ref({});
const pendingPhotoUserIds = ref([]);
const purgeDialogOpen = ref(false);
const purgeBusy = ref(false);
const purgeError = ref("");
const chatDialogOpen = ref(false);
const discussionDialogOpen = ref(false);
const chatMessages = ref([]);
const discussionMessages = ref([]);
const chatMessagesLoading = ref(false);
const discussionMessagesLoading = ref(false);
const deletingMessageIds = ref([]);
const activeMessageUserId = ref(null);
const mockDialogOpen = ref(false);
const mockUserA = ref(null);
const mockUserB = ref("");
const mockJsonText = ref("");
const mockDelayMs = ref(1200);
const mockStartDelayMs = ref(2000);
const mockOpenInNewTab = ref(true);
const mockRunning = ref(false);
const mockProgress = ref({ done: 0, total: 0 });
const mockError = ref("");
const mockInsertedIds = ref([]);
let mockAbort = false;

const { locale } = useI18n();
const localPath = useLocalePath();
const router = useRouter();

const {
  getAdminProfiles,
  markUserForDeletion,
  unmarkUserForDeletion,
  getUserActivitySummary,
} = useDb();

const displayNameFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).displayname || profile?.displayname || "Unknown";

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
    await loadReplyStatus([...profiles.value, ...aiProfiles.value]);
    await loadPendingPhotoUsers();
  } catch (e) {
    console.error("[admin] getAllProfiles failed:", e);
    profiles.value = [];
    aiProfiles.value = [];
    pendingPhotoUserIds.value = [];
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

const pendingPhotoCount = computed(() => pendingPhotoUserIds.value.length);
const mockUserOptions = computed(() => {
  const all = [...profiles.value, ...aiProfiles.value];
  return all
    .map((p) => {
      const labelBase = displayNameFor(p) || p?.slug || p?.user_id || "Unknown";
      const label = `${labelBase} — ${p?.user_id || "—"}`;
      return { label, value: p?.user_id || "" };
    })
    .filter((o) => o.value);
});

const filterOptions = computed(() => [
  { title: "All Human", value: "registered" },
  { title: "AI", value: "ai" },
  { title: "Anon authenticated", value: "anon_authenticated" },
  { title: "Authenticated", value: "authenticated" },
  {
    title: `Photos pending approval (${pendingPhotoCount.value})`,
    value: "photos_pending",
  },
  { title: "Simulated user", value: "simulated" },
  { title: "Forced online", value: "forced_online" },
]);

const matchesFilter = (p) => {
  const hasEmail = !!p?.email;
  const isAnonymousProvider = p?.provider === "anonymous";
  const isSimulated = !!p?.is_simulated;
  const isForcedOnline = !!p?.force_online;
  const isAi = !!p?.is_ai;

  switch (filterSelection.value) {
    case "registered":
      return !isAi;
    case "ai":
      return isAi;
    case "anon_authenticated":
      return !hasEmail || isAnonymousProvider;
    case "authenticated":
      return hasEmail && !isAnonymousProvider;
    case "simulated":
      return isSimulated;
    case "forced_online":
      return isForcedOnline;
    case "photos_pending":
      return pendingPhotoUserIds.value.includes(p?.user_id);
    default:
      return true;
  }
};

const loadPendingPhotoUsers = async () => {
  try {
    const result = await $fetch("/api/admin/profile-photos/list", {
      query: { status: "pending", limit: 500 },
    });
    const ids = (result?.photos || [])
      .map((photo) => photo.user_id)
      .filter(Boolean);
    pendingPhotoUserIds.value = Array.from(new Set(ids));
  } catch (err) {
    console.warn("[admin] load pending photo users failed:", err);
    pendingPhotoUserIds.value = [];
  }
};

const filteredProfiles = computed(() =>
  [...profiles.value, ...aiProfiles.value].filter(
    (p) => matchesSearch(p) && matchesFilter(p)
  )
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
  { title: "Joined", key: "createdAtSort", align: "end" },
  { title: "Email", key: "email" },
  { title: "Actions", key: "actions", sortable: false },
];

const chatMessageHeaders = [
  { title: "Created", key: "created_at" },
  { title: "To", key: "receiver" },
  { title: "Message", key: "content", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const discussionMessageHeaders = [
  { title: "Created", key: "created_at" },
  { title: "Thread", key: "thread" },
  { title: "Message", key: "content", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const getActivity = (userId) => activityByUserId.value[userId] || {};
const isActivityLoading = (userId) => activityLoadingIds.value.includes(userId);
const hasPendingReply = (profile) =>
  !!profile?.is_simulated && !!pendingReplyByUserId.value[profile.user_id];

const markedCount = computed(() => {
  const all = [...profiles.value, ...aiProfiles.value];
  return all.filter((p) => p?.marked_for_deletion_at).length;
});

const photoReviewLink = computed(() =>
  localPath({ path: "/admin", query: { section: "profilePhotos" } })
);

const hasPendingPhotos = (profile) =>
  pendingPhotoUserIds.value.includes(profile?.user_id);

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

const activeProfiles = computed(() => filteredProfiles.value.map(buildProfileRow));

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
  () => filterSelection.value,
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

const loadReplyStatus = async (profilesList) => {
  const uniqueIds = Array.from(
    new Set(
      (profilesList || [])
        .filter((p) => p?.is_simulated)
        .map((p) => p.user_id)
        .filter(Boolean)
    )
  );
  if (!uniqueIds.length) return;
  const batchSize = 80;
  const nextStatus = { ...pendingReplyByUserId.value };
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    try {
      const response = await $fetch("/api/admin/reply-status", {
        query: { user_ids: batch.join(",") },
      });
      const map = response?.items || {};
      batch.forEach((id) => {
        nextStatus[id] = !!map[id];
      });
    } catch (error) {
      console.error("[admin] loadReplyStatus error:", error);
    }
  }
  pendingReplyByUserId.value = nextStatus;
};

const ensureActivityLoaded = async (userId) => {
  if (!userId || activityByUserId.value[userId]) return;
  if (isActivityLoading(userId)) return;
  activityLoadingIds.value = [...activityLoadingIds.value, userId];
  try {
    await refreshActivity(userId);
  } finally {
    activityLoadingIds.value = activityLoadingIds.value.filter(
      (id) => id !== userId
    );
  }
};

const refreshActivity = async (userId) => {
  if (!userId) return;
  const { data } = await getUserActivitySummary(userId);
  if (data) {
    activityByUserId.value = {
      ...activityByUserId.value,
      [userId]: data,
    };
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

const getAiCategoryLabel = (profile) =>
  profile?.ai_category_name ||
  profile?.aiCategoryName ||
  profile?.category_name ||
  "—";

const profilePath = (profile) => {
  const genderPath =
    profile?.gender?.toLowerCase?.() ||
    (profile?.gender_id ? getGenderPath(profile.gender_id) : "other");
  const slug = profile?.slug || profile?.user_id;
  if (!slug) return null;
  return localPath(`/profiles/${genderPath}/${slug}`);
};

const goToProfile = (profile) => {
  const path = profilePath(profile);
  if (!path) return;
  router.push(path);
};

const editProfile = (profile) => {
  if (!profile?.user_id) return;
  router.push(localPath(`/admin/profiles/${profile.user_id}`));
};

const openMockChatDialog = (profile) => {
  mockUserA.value = profile || null;
  mockUserB.value = "";
  mockJsonText.value = "";
  mockDelayMs.value = 1200;
  mockStartDelayMs.value = 2000;
  mockOpenInNewTab.value = true;
  mockRunning.value = false;
  mockProgress.value = { done: 0, total: 0 };
  mockError.value = "";
  mockInsertedIds.value = [];
  mockAbort = false;
  mockDialogOpen.value = true;
};

const closeMockChatDialog = () => {
  if (mockRunning.value) return;
  mockDialogOpen.value = false;
  mockUserA.value = null;
  mockUserB.value = "";
  mockJsonText.value = "";
  mockError.value = "";
  mockProgress.value = { done: 0, total: 0 };
  mockInsertedIds.value = [];
  mockAbort = false;
};

const onMockFileSelected = async (files) => {
  try {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    const text = await file.text();
    mockJsonText.value = text;
    const parsed = JSON.parse(text);
    if (parsed?.userB) mockUserB.value = String(parsed.userB);
    if (Number.isFinite(parsed?.delayMs)) mockDelayMs.value = Number(parsed.delayMs);
  } catch (err) {
    mockError.value = "Invalid JSON file.";
  }
};

const parseMockPayload = () => {
  if (!mockJsonText.value) {
    return { error: "Please paste or upload a JSON script." };
  }
  try {
    const payload = JSON.parse(mockJsonText.value);
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    if (!messages.length) {
      return { error: "messages[] is required and cannot be empty." };
    }
    const userB = String(payload?.userB || mockUserB.value || "").trim();
    if (!userB) return { error: "userB is required." };
    return {
      userB,
      delayMs: Number.isFinite(payload?.delayMs) ? Number(payload.delayMs) : null,
      messages,
    };
  } catch (err) {
    return { error: "Invalid JSON content." };
  }
};

const runMockChat = async () => {
  if (!mockUserA.value?.user_id) {
    mockError.value = "User A is missing.";
    return;
  }
  mockError.value = "";
  const parsed = parseMockPayload();
  if (parsed.error) {
    mockError.value = parsed.error;
    return;
  }

  const userA = mockUserA.value.user_id;
  const userB = parsed.userB;
  const messages = parsed.messages;
  const delay = Number.isFinite(mockDelayMs.value)
    ? Number(mockDelayMs.value)
    : parsed.delayMs || 1200;
  const startDelay = Number.isFinite(mockStartDelayMs.value)
    ? Number(mockStartDelayMs.value)
    : 2000;

  const chatPath = localPath({
    path: "/chat",
    query: { asUser: userA, userId: userB },
  });
  if (mockOpenInNewTab.value && typeof window !== "undefined") {
    window.open(chatPath, "_blank");
  } else {
    router.push(chatPath);
  }

  mockRunning.value = true;
  mockAbort = false;
  mockProgress.value = { done: 0, total: messages.length };
  mockInsertedIds.value = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await sleep(startDelay);

  for (let i = 0; i < messages.length; i++) {
    if (mockAbort) break;
    const m = messages[i] || {};
    const from = String(m.from || "").toUpperCase();
    const text = String(m.text ?? m.content ?? "").trim();
    if (!text) {
      mockProgress.value = { done: i + 1, total: messages.length };
      continue;
    }
    const sender_id = from === "B" ? userB : userA;
    const receiver_id = from === "B" ? userA : userB;
    try {
      const res = await $fetch("/api/admin/messages", {
        method: "POST",
        body: { sender_id, receiver_id, content: text },
      });
      if (res?.item?.id) {
        mockInsertedIds.value = [...mockInsertedIds.value, res.item.id];
      }
    } catch (err) {
      mockError.value =
        err?.data?.error?.message ||
        err?.message ||
        "Failed to insert a message.";
      break;
    }
    mockProgress.value = { done: i + 1, total: messages.length };
    if (i < messages.length - 1) await sleep(delay);
  }

  mockRunning.value = false;
};

const cancelMockChat = () => {
  mockAbort = true;
  mockRunning.value = false;
};

const deleteLastMockRun = async () => {
  if (!mockInsertedIds.value.length) return;
  mockError.value = "";
  const ids = [...mockInsertedIds.value];
  for (const id of ids) {
    try {
      await $fetch(`/api/admin/chat-messages/${id}`, { method: "DELETE" });
    } catch (err) {
      mockError.value =
        err?.data?.error?.message ||
        err?.message ||
        "Failed to delete one or more messages.";
      break;
    }
  }
  if (!mockError.value) {
    mockInsertedIds.value = [];
  }
};

const goToThread = (thread) => {
  const key = thread?.slug || thread?.id;
  if (!key) return;
  router.push(localPath(`/chat/articles/${key}`));
};

const openChatMessages = async (userId) => {
  if (!userId) return;
  activeMessageUserId.value = userId;
  chatDialogOpen.value = true;
  await loadChatMessages(userId);
};

const openDiscussionMessages = async (userId) => {
  if (!userId) return;
  activeMessageUserId.value = userId;
  discussionDialogOpen.value = true;
  await loadDiscussionMessages(userId);
};

const loadChatMessages = async (userId) => {
  if (!userId) return;
  chatMessagesLoading.value = true;
  try {
    const response = await $fetch("/api/admin/chat-messages", {
      query: { user_id: userId, limit: 60 },
    });
    chatMessages.value = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    console.error("[admin] loadChatMessages error:", error);
    chatMessages.value = [];
  } finally {
    chatMessagesLoading.value = false;
  }
};

const loadDiscussionMessages = async (userId) => {
  if (!userId) return;
  discussionMessagesLoading.value = true;
  try {
    const response = await $fetch("/api/admin/discussion-messages", {
      query: { user_id: userId, limit: 60 },
    });
    discussionMessages.value = Array.isArray(response?.items)
      ? response.items
      : [];
  } catch (error) {
    console.error("[admin] loadDiscussionMessages error:", error);
    discussionMessages.value = [];
  } finally {
    discussionMessagesLoading.value = false;
  }
};

const deleteChatMessage = async (message) => {
  if (!message?.id) return;
  deletingMessageIds.value = [...deletingMessageIds.value, message.id];
  try {
    await $fetch(`/api/admin/chat-messages/${message.id}`, {
      method: "DELETE",
    });
    chatMessages.value = chatMessages.value.filter((m) => m.id !== message.id);
    await refreshActivity(activeMessageUserId.value);
  } catch (error) {
    console.error("[admin] deleteChatMessage error:", error);
  } finally {
    deletingMessageIds.value = deletingMessageIds.value.filter(
      (id) => id !== message.id
    );
  }
};

const deleteDiscussionMessage = async (message) => {
  if (!message?.id) return;
  deletingMessageIds.value = [...deletingMessageIds.value, message.id];
  try {
    await $fetch(`/api/admin/discussion-messages/${message.id}`, {
      method: "DELETE",
    });
    discussionMessages.value = discussionMessages.value.filter(
      (m) => m.id !== message.id
    );
    await refreshActivity(activeMessageUserId.value);
  } catch (error) {
    console.error("[admin] deleteDiscussionMessage error:", error);
  } finally {
    deletingMessageIds.value = deletingMessageIds.value.filter(
      (id) => id !== message.id
    );
  }
};

const markForDeletion = async (profile) => {
  if (!profile?.user_id) return;
  try {
    await markUserForDeletion(profile.user_id);
    handleUserDeleted(profile.user_id);
  } catch (error) {
    console.error("[admin] mark user for deletion error:", error);
  }
};

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

const purgeMarkedProfiles = async () => {
  purgeBusy.value = true;
  purgeError.value = "";
  try {
    const res = await $fetch("/api/admin/profiles/purge", {
      method: "POST",
    });
    const deletedIds = Array.isArray(res?.deletedUserIds)
      ? res.deletedUserIds
      : [];
    if (deletedIds.length) {
      profiles.value = profiles.value.filter(
        (p) => !deletedIds.includes(p.user_id)
      );
      aiProfiles.value = aiProfiles.value.filter(
        (p) => !deletedIds.includes(p.user_id)
      );
      const nextPending = { ...pendingReplyByUserId.value };
      deletedIds.forEach((id) => delete nextPending[id]);
      pendingReplyByUserId.value = nextPending;
    }
    if (res?.failed?.length) {
      purgeError.value = `Failed to delete ${res.failed.length} user(s).`;
      return;
    }
    purgeDialogOpen.value = false;
  } catch (error) {
    console.error("[admin] purgeMarkedProfiles error:", error);
    purgeError.value = "Purge failed.";
  } finally {
    purgeBusy.value = false;
  }
};
</script>

<style scoped>
.admin-dashboard {
  max-width: 100%;
  padding-left: 16px;
  padding-right: 16px;
}

.admin-table :deep(thead th) {
  white-space: nowrap;
}

.admin-nowrap {
  white-space: nowrap;
}

.admin-ellipsis {
  max-width: 220px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}

.admin-sort {
  min-width: 220px;
}

.admin-filter {
  min-width: 220px;
}

.admin-purge {
  white-space: nowrap;
}
</style>
