<template>
  <v-container fluid class="admin-dashboard">
    <LoadingContainer v-if="isLoading" />

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-card-text class="admin-dashboard__card-text">
            <div class="admin-controls">
              <v-text-field
                v-model="search"
                label="Search profiles..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="admin-search"
              />

              <div class="admin-select-row">
                <v-select
                  v-model="filterSelection"
                  :items="filterOptions"
                  label="User filter"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="admin-filter"
                />
              </div>

              <div v-if="markedCount" class="admin-purge-wrap">
                <v-btn
                  color="red"
                  variant="outlined"
                  class="admin-purge"
                  @click="purgeDialogOpen = true"
                >
                  Purge marked ({{ markedCount }})
                </v-btn>
              </div>
            </div>

            <v-data-table-server
              v-model:expanded="expanded"
              :headers="tableHeaders"
              :items="activeProfiles"
              :items-length="totalItems"
              v-model:page="currentPage"
              v-model:items-per-page="itemsPerPage"
              :items-per-page-options="[25, 50, 100]"
              item-value="user_id"
              fixed-header
              height="680"
              class="admin-table"
              :loading="isTableLoading"
              hover
              @update:options="onTableOptions"
            >
              <template #item.profile="{ item }">
                <div class="d-flex align-center ga-3">
                  <v-badge
                    v-if="hasPendingReply(item)"
                    color="red"
                    dot
                    location="bottom end"
                    offset-x="2"
                    offset-y="2"
                  >
                    <div class="admin-avatar-wrap">
                      <v-avatar size="40">
                        <v-img
                          :src="getAvatar(item.avatar_url, item.gender_id)"
                          :alt="displayNameFor(item) || 'Profile avatar'"
                        />
                      </v-avatar>
                      <span
                        v-if="getCountryEmoji(item)"
                        class="admin-flag-icon"
                        aria-hidden="true"
                      >
                        {{ getCountryEmoji(item) }}
                      </span>
                      <v-avatar v-if="item.email" size="18" class="admin-registered-badge">
                        <v-icon size="12" color="amber-darken-2">mdi-star</v-icon>
                      </v-avatar>
                      <v-icon
                        v-if="item?.gender_id"
                        size="20"
                        class="admin-gender-icon"
                        :style="{ '--admin-gender-color': getGenderHexColor(item?.gender_id) }"
                        :class="{
                          'is-male': item?.gender_id === 1,
                          'is-female': item?.gender_id === 2,
                          'is-other': item?.gender_id !== 1 && item?.gender_id !== 2,
                        }"
                      >
                        {{
                          item?.gender_id === 1
                            ? "mdi-gender-male"
                            : item?.gender_id === 2
                            ? "mdi-gender-female"
                            : "mdi-gender-non-binary"
                        }}
                      </v-icon>
                    </div>
                  </v-badge>
                  <div v-else class="admin-avatar-wrap">
                    <v-avatar size="40">
                      <v-img
                        :src="getAvatar(item.avatar_url, item.gender_id)"
                        :alt="displayNameFor(item) || 'Profile avatar'"
                      />
                    </v-avatar>
                    <span
                      v-if="getCountryEmoji(item)"
                      class="admin-flag-icon"
                      aria-hidden="true"
                    >
                      {{ getCountryEmoji(item) }}
                    </span>
                    <v-avatar v-if="item.email" size="18" class="admin-registered-badge">
                      <v-icon size="12" color="amber-darken-2">mdi-star</v-icon>
                    </v-avatar>
                    <v-icon
                      v-if="item?.gender_id"
                      size="20"
                      class="admin-gender-icon"
                      :style="{ '--admin-gender-color': getGenderHexColor(item?.gender_id) }"
                      :class="{
                        'is-male': item?.gender_id === 1,
                        'is-female': item?.gender_id === 2,
                        'is-other': item?.gender_id !== 1 && item?.gender_id !== 2,
                      }"
                    >
                      {{
                        item?.gender_id === 1
                          ? "mdi-gender-male"
                          : item?.gender_id === 2
                          ? "mdi-gender-female"
                          : "mdi-gender-non-binary"
                      }}
                    </v-icon>
                  </div>
                  <div class="d-flex flex-column">
                    <button
                      type="button"
                      class="admin-profile-link font-weight-medium"
                      :aria-expanded="isExpanded(item.user_id) ? 'true' : 'false'"
                      @click="toggleExpanded(item.user_id)"
                    >
                      {{ displayNameFor(item) }}
                    </button>
                    <span
                      class="text-caption text-medium-emphasis admin-profile-subline admin-profile-subline--desktop"
                    >
                      {{ formatDate(item.createdAt) }}
                    </span>
                    <span
                      class="text-caption text-medium-emphasis admin-profile-subline admin-profile-subline--mobile"
                    >
                      {{ formatDate(item.createdAt) }}
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

              <template #item.tagline="{ item }">
                <span class="text-caption text-medium-emphasis admin-tagline-cell">
                  {{ taglineFor(item) || "—" }}
                </span>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex align-center ga-1 admin-actions">
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
                        <div class="admin-detail-grid">
                          <div class="admin-detail-item">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              User ID
                            </div>
                            <div class="text-body-2 font-weight-medium">
                              {{ item.user_id || "—" }}
                            </div>
                          </div>
                          <div class="admin-detail-item">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Country
                            </div>
                            <div class="text-body-2 font-weight-medium">
                              {{ getCountryLabel(item) }}
                              <span v-if="getCountryEmoji(item)">
                                {{ getCountryEmoji(item) }}
                              </span>
                            </div>
                          </div>
                          <div class="admin-detail-item">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Joined
                            </div>
                            <div class="text-body-2 font-weight-medium">
                              {{ formatDate(item.createdAt) }}
                            </div>
                          </div>
                          <div class="admin-detail-item">
                            <div class="text-subtitle-2 text-medium-emphasis">
                              Email
                            </div>
                            <div class="text-body-2 font-weight-medium admin-ellipsis">
                              {{ item.email || "—" }}
                            </div>
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
                              AI limit hits
                            </div>
                            <div class="text-h6">
                              {{ getActivity(item.user_id).aiLimitHitsCount || 0 }}
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Last hit:
                              {{
                                formatDateTime(
                                  getActivity(item.user_id).aiLimitLastAt
                                )
                              }}
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

                        <div class="d-flex flex-column ga-3">
                          <div class="text-subtitle-2 text-medium-emphasis">
                            Simulated user controls
                          </div>
                          <div class="d-flex flex-column flex-md-row align-start ga-4">
                            <v-switch
                              v-model="getAdminFlags(item).force_online"
                              label="Force online"
                              color="primary"
                              hide-details
                              @update:model-value="onAdminFlagToggle(item)"
                            />
                            <v-switch
                              v-model="getAdminFlags(item).is_simulated"
                              label="Simulated user"
                              color="primary"
                              hide-details
                              @update:model-value="onAdminFlagToggle(item)"
                            />
                            <span
                              v-if="adminFlagsStatus(item.user_id)"
                              class="text-caption"
                            >
                              {{ adminFlagsStatus(item.user_id) }}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div class="text-subtitle-2 text-medium-emphasis mb-2">
                            Recent AI limit notices
                          </div>
                          <div
                            v-if="getActivity(item.user_id).aiLimitHitsSample?.length"
                            class="d-flex flex-column ga-2"
                          >
                            <div
                              v-for="hit in getActivity(item.user_id).aiLimitHitsSample.slice(0, 5)"
                              :key="hit.id"
                              class="text-caption text-medium-emphasis"
                            >
                              <strong>{{ formatDateTime(hit.created_at) }}</strong>
                              -
                              {{ hit.content }}
                            </div>
                          </div>
                          <div v-else class="text-caption text-medium-emphasis">
                            No AI limit notices yet.
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </td>
                </tr>
              </template>
            </v-data-table-server>
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

    <v-dialog v-model="mockDialogOpen" max-width="720px" persistent scrollable>
      <v-card class="admin-mock-dialog">
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

  </v-container>
</template>

<script setup>
import { getAvatar, getGenderHexColor, getGenderPath } from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore1";

const isLoading = ref(true);
const isTableLoading = ref(false);
const serverProfiles = ref([]);
const allProfilesLight = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const itemsPerPage = ref(50);
const search = ref("");
const expanded = ref([]);
const filterSelection = ref("registered");
const activityByUserId = ref({});
const activityLoadingIds = ref([]);
const pendingReplyByUserId = ref({});
const adminFlagsByUserId = ref({});
const adminFlagsSavingByUserId = ref({});
const adminFlagsStatusByUserId = ref({});
const adminFlagsSaveTimers = ref({});
const pendingPhotoUserIds = ref([]);
const purgeDialogOpen = ref(false);
const purgeBusy = ref(false);
const purgeError = ref("");
const chatDialogOpen = ref(false);
const chatMessages = ref([]);
const chatMessagesLoading = ref(false);
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
const { mdAndUp } = useDisplay();
const localPath = useLocalePath();
const router = useRouter();
const authStore = useAuthStore();

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

const taglineFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).tagline || profile?.tagline || "";

const isExpanded = (userId) => expanded.value.includes(userId);
const toggleExpanded = (userId) => {
  if (!userId) return;
  const next = [...expanded.value];
  const index = next.indexOf(userId);
  if (index === -1) {
    next.push(userId);
  } else {
    next.splice(index, 1);
  }
  expanded.value = next;
};

// tiny helper to coerce “maybe array” -> array
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    console.log("Unauthorized access to admin panel");
    router.push(localPath("/"));
    return;
  }
  const route = useRoute();
  const section = route.query?.section;
  if (section === "profilePhotos") filterSelection.value = "photos_pending";
  await loadPage();
  isLoading.value = false;
  // Load non-blocking background data
  loadAllProfilesLight();
  loadPendingPhotoUsers();
});

const pendingPhotoCount = computed(() => pendingPhotoUserIds.value.length);
const mockUserOptions = computed(() => {
  return allProfilesLight.value
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

const resolveFilterParams = () => {
  switch (filterSelection.value) {
    case "registered":
      return { isAi: false, serverFilter: "" };
    case "ai":
      return { isAi: true, serverFilter: "" };
    default:
      return { isAi: null, serverFilter: filterSelection.value };
  }
};

const activeProfiles = computed(() => serverProfiles.value.map(buildProfileRow));

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
];

const tableHeaders = computed(() => {
  const headers = [{ title: "Profile", key: "profile", sortable: false }];
  if (mdAndUp.value) {
    headers.push({ title: "Tagline", key: "tagline", sortable: false });
  }
  headers.push({
    title: "Actions",
    key: "actions",
    sortable: false,
    align: "center",
  });
  return headers;
});

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

const markedCount = computed(() =>
  serverProfiles.value.filter((p) => p?.marked_for_deletion_at).length
);

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

const loadPage = async (page, perPage) => {
  if (page !== undefined) currentPage.value = page;
  if (perPage !== undefined) itemsPerPage.value = perPage;
  isTableLoading.value = true;
  try {
    const { isAi, serverFilter } = resolveFilterParams();
    const result = await getAdminProfiles(isAi, {
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: search.value || "",
      filter: serverFilter,
    });
    serverProfiles.value = toArray(result);
    totalItems.value = result.total || 0;
    await loadReplyStatus(serverProfiles.value);
  } catch (e) {
    console.error("[admin] loadPage failed:", e);
    serverProfiles.value = [];
    totalItems.value = 0;
  } finally {
    isTableLoading.value = false;
  }
};

const onTableOptions = ({ page, itemsPerPage: perPage }) => {
  loadPage(page, perPage);
};

let searchTimer = null;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    loadPage();
  }, 400);
});

watch(filterSelection, () => {
  currentPage.value = 1;
  loadPage();
});

watch(expanded, (next) => {
  (next || []).forEach((userId) => ensureActivityLoaded(userId));
});

const loadAllProfilesLight = async () => {
  try {
    const result = await getAdminProfiles(null, { limit: 5000, minimal: true });
    allProfilesLight.value = toArray(result);
  } catch (e) {
    console.warn("[admin] loadAllProfilesLight failed:", e);
    allProfilesLight.value = [];
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

const refreshReplyStatusFor = async (userId) => {
  if (!userId) return;
  try {
    const response = await $fetch("/api/admin/reply-status", {
      query: { user_ids: userId },
    });
    const map = response?.items || {};
    pendingReplyByUserId.value = {
      ...pendingReplyByUserId.value,
      [userId]: !!map[userId],
    };
  } catch (error) {
    console.error("[admin] loadReplyStatus error:", error);
  }
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

const openChatMessages = async (userId) => {
  if (!userId) return;
  activeMessageUserId.value = userId;
  chatDialogOpen.value = true;
  await loadChatMessages(userId);
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
  serverProfiles.value = serverProfiles.value.map((p) =>
    p?.user_id === userId ? { ...p, marked_for_deletion_at: nextValue } : p
  );
}

const syncProfileFlags = (userId, nextFlags) => {
  serverProfiles.value = serverProfiles.value.map((p) =>
    p?.user_id === userId ? { ...p, ...nextFlags } : p
  );
};

const getAdminFlags = (profile) => {
  if (!profile?.user_id) {
    return { force_online: false, is_simulated: false };
  }
  const userId = profile.user_id;
  if (!adminFlagsByUserId.value[userId]) {
    adminFlagsByUserId.value = {
      ...adminFlagsByUserId.value,
      [userId]: {
        force_online: !!profile.force_online,
        is_simulated: !!profile.is_simulated,
      },
    };
  }
  return adminFlagsByUserId.value[userId];
};

const isAdminFlagsSaving = (userId) =>
  !!adminFlagsSavingByUserId.value[userId];

const adminFlagsStatus = (userId) => adminFlagsStatusByUserId.value[userId] || "";

const saveAdminFlagsFor = async (profile) => {
  const userId = profile?.user_id;
  if (!userId) return;
  const flags = getAdminFlags(profile);
  adminFlagsSavingByUserId.value = {
    ...adminFlagsSavingByUserId.value,
    [userId]: true,
  };
  adminFlagsStatusByUserId.value = {
    ...adminFlagsStatusByUserId.value,
    [userId]: "",
  };
  try {
    const res = await $fetch("/api/admin/profiles-flags", {
      method: "PATCH",
      body: {
        user_id: userId,
        force_online: flags.force_online,
        is_simulated: flags.is_simulated,
      },
    });
    if (res?.item) {
      syncProfileFlags(userId, res.item);
      adminFlagsByUserId.value = {
        ...adminFlagsByUserId.value,
        [userId]: {
          force_online: !!res.item.force_online,
          is_simulated: !!res.item.is_simulated,
        },
      };
    } else {
      syncProfileFlags(userId, {
        force_online: !!flags.force_online,
        is_simulated: !!flags.is_simulated,
      });
    }

    if (flags.is_simulated) {
      await refreshReplyStatusFor(userId);
    } else {
      const nextPending = { ...pendingReplyByUserId.value };
      delete nextPending[userId];
      pendingReplyByUserId.value = nextPending;
    }

    adminFlagsStatusByUserId.value = {
      ...adminFlagsStatusByUserId.value,
      [userId]: "Saved",
    };
  } catch (error) {
    console.error("[admin] flags save error:", error);
    adminFlagsStatusByUserId.value = {
      ...adminFlagsStatusByUserId.value,
      [userId]: "Save failed",
    };
  } finally {
    adminFlagsSavingByUserId.value = {
      ...adminFlagsSavingByUserId.value,
      [userId]: false,
    };
    setTimeout(() => {
      adminFlagsStatusByUserId.value = {
        ...adminFlagsStatusByUserId.value,
        [userId]: "",
      };
    }, 2000);
  }
};

const onAdminFlagToggle = (profile) => {
  const userId = profile?.user_id;
  if (!userId) return;
  const timers = adminFlagsSaveTimers.value;
  if (timers[userId]) {
    clearTimeout(timers[userId]);
  }
  adminFlagsStatusByUserId.value = {
    ...adminFlagsStatusByUserId.value,
    [userId]: "Saving...",
  };
  adminFlagsSaveTimers.value = {
    ...adminFlagsSaveTimers.value,
    [userId]: setTimeout(() => saveAdminFlagsFor(profile), 350),
  };
};

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
      const nextPending = { ...pendingReplyByUserId.value };
      deletedIds.forEach((id) => delete nextPending[id]);
      pendingReplyByUserId.value = nextPending;
    }
    if (res?.failed?.length) {
      purgeError.value = `Failed to delete ${res.failed.length} user(s).`;
      return;
    }
    purgeDialogOpen.value = false;
    await loadPage();
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

.admin-dashboard__card-text {
  padding-top: 12px;
  padding-bottom: 12px;
}

.admin-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.admin-select-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.admin-purge-wrap {
  display: flex;
  justify-content: flex-end;
}

.admin-table :deep(thead th) {
  white-space: nowrap;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  min-height: 38px !important;
  height: 38px !important;
  font-size: 0.88rem;
  line-height: 1.1;
}

.admin-table :deep(th[data-column="actions"]),
.admin-table :deep(td[data-column="actions"]) {
  text-align: center;
  justify-content: center;
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

.admin-avatar-wrap {
  position: relative;
  display: inline-flex;
}

.admin-gender-icon {
  position: absolute;
  left: -4px;
  bottom: -4px;
  background: transparent;
  border-radius: 999px;
  padding: 0;
  color: var(--admin-gender-color, #a855f7) !important;
}

.admin-flag-icon {
  position: absolute;
  right: -4px;
  top: -4px;
  background: transparent;
  border-radius: 999px;
  padding: 0;
  font-size: 17px;
  line-height: 1;
}

.admin-registered-badge {
  position: absolute;
  left: -6px;
  top: -6px;
  background: transparent;
}

.admin-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px 24px;
}

.admin-detail-item {
  min-width: 0;
}

@media (max-width: 1260px) {
  .admin-detail-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .admin-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .admin-detail-grid {
    grid-template-columns: 1fr;
  }
}

.admin-gender-icon.is-male {
  color: var(--admin-gender-color, #3b82f6) !important;
}

.admin-gender-icon.is-female {
  color: var(--admin-gender-color, #ec4899) !important;
}

.admin-gender-icon.is-other {
  color: var(--admin-gender-color, #a855f7) !important;
}

.admin-sort {
  min-width: 0;
}

.admin-filter {
  min-width: 0;
}

.admin-purge {
  white-space: nowrap;
}

.admin-mock-dialog {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.admin-mock-dialog :deep(.v-card-text) {
  overflow-y: auto;
}

.admin-mock-dialog :deep(.v-card-actions) {
  flex-shrink: 0;
}

.admin-actions {
  width: 100%;
  justify-content: center;
}

.admin-tagline-cell {
  display: inline-block;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-profile-subline--mobile {
  display: none;
}

.admin-profile-link {
  background: none;
  border: 0;
  padding: 0;
  color: #1d4ed8;
  cursor: pointer;
  text-align: left;
}

.admin-profile-link:hover {
  text-decoration: underline;
}

.admin-profile-link:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 960px) {
  .admin-profile-subline--desktop {
    display: none;
  }

  .admin-profile-subline--mobile {
    display: inline;
  }

  .admin-purge-wrap {
    justify-content: flex-start;
  }

  .admin-table :deep(thead th) {
    padding-top: 5px !important;
    padding-bottom: 5px !important;
    min-height: 34px !important;
    height: 34px !important;
    font-size: 0.8rem;
    line-height: 1.15;
  }
}
</style>
