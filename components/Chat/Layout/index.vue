<template>
  <div class="chat-layout-root d-flex flex-column h-100 min-h-0">
    <v-container fluid class="d-flex flex-column h-100 min-h-0">
      <!-- Mobile controls: left drawer (Topics) + right drawer (Participants) -->
      <div
        class="d-md-none d-flex align-center justify-space-between px-2 py-2"
      >
        <v-btn
          icon
          variant="text"
          @click="leftOpen = true"
          aria-label="Show online participants"
        >
          <v-icon color="green-darken-2">mdi-account-multiple-outline</v-icon>
        </v-btn>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          @click="rightOpen = true"
          aria-label="Show active chat participants"
        >
          <v-icon>mdi-account-multiple-outline</v-icon>
        </v-btn>
      </div>
      <!-- Desktop / tablet (>= md): 3 columns -->
      <v-row
        v-if="!smAndDown"
        class="flex-grow-1 overflow-hidden min-h-0 d-none d-md-flex"
      >
        <!-- LEFT: Topics -->
        <v-col
          cols="12"
          md="3"
          class="pa-2 d-flex flex-column overflow-hidden min-h-0 d-none d-md-flex"
        >
          <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
            <div
              ref="leftScrollRef"
              class="flex-grow-1 overflow-auto min-h-0 users-scroll"
              style="flex: 1 1 0"
            >
              <ChatLayoutUsers
                v-if="tabVisibility.online"
                list-type="online"
                :users="usersWithPresence"
                :pinnedId="IMCHATTY_ID"
                :activeChats="activeChats"
                :selectedUserId="selectedUserId"
                :isLoading="isLoading"
                :user-profile="userProfile"
                :auth-status="auth.authStatus"
                :disable-filter-toggle="shouldDisableToggle"
                :show-ai="showAIUsers"
                @user-selected="selectUser"
                @filter-changed="updateFilters"
                @update:showAi="showAIUsers = $event"
              />
            </div>
          </v-card>

          <ClientOnly>
            <div class="d-none d-md-block mt-2">
              <ChatLayoutConsentPanel
                :auth-status="auth.authStatus"
                :user-profile="userProfile"
                @action="selectImChatty"
              />
            </div>
          </ClientOnly>
        </v-col>

        <!-- CENTER: Thread messages -->
        <v-col
          cols="12"
          md="7"
          class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
        >
          <!-- Sticky header -->
          <div class="messages-sticky-header d-none d-md-block">
            <div
              class="profile-header px-4 py-3 d-flex align-center justify-space-between"
            >
              <div class="d-flex align-center profile-header-left">
                <v-avatar size="44" color="primary" variant="tonal">
                  <v-img
                    v-if="selectedUser && selectedUser.avatar_url"
                    :src="selectedUser.avatar_url"
                    cover
                  />
                  <span
                    v-else
                    class="avatar-fallback text-body-2 font-weight-medium"
                  >
                    {{ selectedUserInitial }}
                  </span>
                </v-avatar>
                <div class="min-w-0 ml-3">
                  <div class="text-subtitle-1 font-weight-medium text-truncate">
                    {{ selectedUserTitle }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis text-truncate">
                    {{ selectedUserSubtitle }}
                  </div>
                </div>
              </div>

              <div class="d-flex align-center profile-header-actions">
                <v-chip
                  v-if="selectedUser"
                  size="small"
                  :color="selectedUser?.online ? 'success' : 'grey'"
                  variant="flat"
                  class="font-weight-medium mr-2"
                >
                  <v-icon size="14" class="mr-1">
                    {{
                      selectedUser?.online ? "mdi-circle" : "mdi-circle-outline"
                    }}
                  </v-icon>
                  {{
                    selectedUser?.online
                      ? $t("components.users.online")
                      : $t("components.users.offline")
                  }}
                </v-chip>
                <v-btn
                  icon
                  variant="text"
                  :disabled="!selectedUser"
                  :aria-expanded="String(panelOpen)"
                  aria-controls="thread-info-panel"
                  @click="panelOpen = !panelOpen"
                >
                  <v-icon
                    :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  />
                </v-btn>
              </div>
            </div>
          </div>

          <!-- Overlay panel that drops over the scrollable list -->
          <v-expand-transition>
            <v-card
              v-if="panelOpen"
              id="thread-info-panel"
              class="mx-1"
              elevation="6"
              :aria-hidden="String(!panelOpen)"
            >
              <div class="px-4 py-4">
                <template v-if="selectedUser">
                  <div
                    v-if="selectedUser?.tagline"
                    class="text-body-1 font-italic mb-3 text-truncate"
                    :title="selectedUser.tagline"
                  >
                    "{{ selectedUser.tagline }}"
                  </div>

                  <div
                    v-if="selectedUserMeta.length"
                    class="profile-meta-grid text-body-2 mb-3"
                  >
                    <div
                      v-for="item in selectedUserMeta"
                      :key="item.key"
                      class="d-flex align-center mb-2"
                    >
                      <v-icon size="18" class="mr-2 text-medium-emphasis">
                        {{ item.icon }}
                      </v-icon>
                      <span class="text-medium-emphasis mr-1">
                        {{ item.label }}:
                      </span>
                      <span class="text-truncate">{{ item.value }}</span>
                    </div>
                  </div>

                  <div
                    v-if="selectedUser?.bio"
                    class="profile-bio text-body-2 text-medium-emphasis mb-3"
                  >
                    {{ selectedUser.bio }}
                  </div>

                  <div
                    v-if="selectedUserInterests.length"
                    class="d-flex flex-wrap gap-2 mb-3"
                  >
                    <v-chip
                      v-for="interest in selectedUserInterests"
                      :key="interest"
                      size="small"
                      variant="outlined"
                      color="primary"
                    >
                      {{ interest }}
                    </v-chip>
                  </div>

                  <div class="d-flex flex-wrap gap-2">
                    <NuxtLink
                      v-if="profileLink"
                      :to="profileLink"
                      class="text-decoration-none"
                    >
                      <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-open-in-new"
                      >
                        View full profile
                      </v-btn>
                    </NuxtLink>
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-close"
                      @click="panelOpen = false"
                    >
                      Close
                    </v-btn>
                  </div>
                </template>
                <template v-else>
                  <div class="text-body-2 text-medium-emphasis">
                    Select a user to view profile details.
                  </div>
                </template>
              </div>
            </v-card>
          </v-expand-transition>

          <!-- Scrollable messages list -->
          <div
            ref="centerScrollRef"
            class="flex-grow-1 overflow-auto users-scroll min-h-0 px-2 py-2"
            style="flex: 1 1 0"
            @scroll.passive="
              panelOpen && autoCloseOnScroll && (panelOpen = false)
            "
          >
            <v-skeleton-loader
              v-if="loadingMsgs"
              type="list-item@6"
              class="pa-2"
            />

            <ChatLayoutOnboarding
              v-if="isPreAuth"
              ref="onbRef"
              :key="'onb'"
              :authStatus="auth.authStatus"
              :canSend="canSend"
              :isPreAuth="isPreAuth"
              :isBotSelected="isBotSelected"
              :consented="draftStore?.consented ?? false"
              @send="onSend"
              class="d-flex flex-column flex-grow-1 overflow-hidden"
            />

            <ChatLayoutRegular
              v-else
              ref="regRef"
              :key="`reg-${auth.authStatus}`"
              :authStatus="auth.authStatus"
              :me-id="auth.user?.id"
              :peer="chat.selectedUser"
            />
          </div>

          <!-- Composer -->
          <div class="border-t pt-2" style="flex: 0 0 auto">
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              class="w-100 mx-auto"
              @send="onSend"
            />
          </div>
        </v-col>

        <!-- RIGHT: Participants -->
        <v-col
          cols="12"
          md="2"
          class="pa-2 d-flex flex-column overflow-hidden d-none d-md-flex min-h-0"
        >
          <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
            <div
              ref="rightScrollRef"
              class="flex-grow-1 overflow-auto min-h-0 users-scroll"
              style="flex: 1 1 0"
            >
              <ChatLayoutUsers
                v-if="tabVisibility.active"
                list-type="active"
                :users="usersWithPresence"
                :pinnedId="IMCHATTY_ID"
                :activeChats="activeChats"
                :selectedUserId="selectedUserId"
                :isLoading="isLoading"
                :user-profile="userProfile"
                :auth-status="auth.authStatus"
                :disable-filter-toggle="shouldDisableToggle"
                :show-filters="false"
                :show-ai="showAIUsers"
                @user-selected="selectUser"
                @filter-changed="updateFilters"
                @update:showAi="showAIUsers = $event"
              />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Mobile (< md): only the Thread pane -->
      <v-row
        v-if="smAndDown"
        class="flex-grow-1 overflow-hidden min-h-0 d-flex d-md-none"
      >
        <v-col
          cols="12"
          class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
        >
          <div
            class="messages-sticky-header d-flex d-md-none px-3 py-2 align-center justify-space-between"
          >
            <div class="d-flex align-center mobile-profile-left">
              <v-avatar size="40" color="primary" variant="tonal">
                <v-img
                  v-if="selectedUser && selectedUser.avatar_url"
                  :src="selectedUser.avatar_url"
                  cover
                />
                <span
                  v-else
                  class="avatar-fallback text-body-2 font-weight-medium"
                >
                  {{ selectedUserInitial }}
                </span>
              </v-avatar>
              <div class="min-w-0 ml-2">
                <div class="text-subtitle-2 font-weight-medium text-truncate">
                  {{ selectedUserTitle }}
                </div>
                <div class="text-body-2 text-medium-emphasis text-truncate">
                  {{ selectedUserSubtitle }}
                </div>
              </div>
            </div>

            <v-btn
              icon
              variant="text"
              :disabled="!selectedUser"
              :aria-expanded="String(panelOpen)"
              aria-controls="thread-info-panel"
              @click="panelOpen = !panelOpen"
            >
              <v-icon
                :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              />
            </v-btn>
          </div>
          <v-expand-transition>
            <v-card
              v-if="panelOpen"
              id="thread-info-panel"
              class="mx-1"
              elevation="6"
              :aria-hidden="String(!panelOpen)"
            >
              <div class="px-4 py-4">
                <template v-if="selectedUser">
                  <div
                    v-if="selectedUser?.tagline"
                    class="text-body-1 font-italic mb-3 text-truncate"
                    :title="selectedUser.tagline"
                  >
                    "{{ selectedUser.tagline }}"
                  </div>

                  <div
                    v-if="selectedUserMeta.length"
                    class="profile-meta-grid text-body-2 mb-3"
                  >
                    <div
                      v-for="item in selectedUserMeta"
                      :key="item.key"
                      class="d-flex align-center mb-2"
                    >
                      <v-icon size="18" class="mr-2 text-medium-emphasis">
                        {{ item.icon }}
                      </v-icon>
                      <span class="text-medium-emphasis mr-1">
                        {{ item.label }}:
                      </span>
                      <span class="text-truncate">{{ item.value }}</span>
                    </div>
                  </div>

                  <div
                    v-if="selectedUser?.bio"
                    class="profile-bio text-body-2 text-medium-emphasis mb-3"
                  >
                    {{ selectedUser.bio }}
                  </div>

                  <div
                    v-if="selectedUserInterests.length"
                    class="d-flex flex-wrap gap-2 mb-3"
                  >
                    <v-chip
                      v-for="interest in selectedUserInterests"
                      :key="interest"
                      size="small"
                      variant="outlined"
                      color="primary"
                    >
                      {{ interest }}
                    </v-chip>
                  </div>

                  <div class="d-flex flex-wrap gap-2">
                    <NuxtLink
                      v-if="profileLink"
                      :to="profileLink"
                      class="text-decoration-none"
                    >
                      <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-open-in-new"
                      >
                        View full profile
                      </v-btn>
                    </NuxtLink>
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-close"
                      @click="panelOpen = false"
                    >
                      Close
                    </v-btn>
                  </div>
                </template>
                <template v-else>
                  <div class="text-body-2 text-medium-emphasis">
                    Select a user to view profile details.
                  </div>
                </template>
              </div>
            </v-card>
          </v-expand-transition>

          <div
            ref="centerScrollRef"
            class="flex-grow-1 overflow-auto users-scroll min-h-0 px-2 py-2"
            style="flex: 1 1 0"
            @scroll.passive="
              panelOpen && autoCloseOnScroll && (panelOpen = false)
            "
          >
            <v-skeleton-loader
              v-if="loadingMsgs"
              type="list-item@6"
              class="pa-2"
            />
            <ChatLayoutOnboarding
              v-if="isPreAuth"
              ref="onbRef"
              :key="'onb'"
              :authStatus="auth.authStatus"
              :canSend="canSend"
              :isPreAuth="isPreAuth"
              :isBotSelected="isBotSelected"
              :consented="draftStore?.consented ?? false"
              @send="onSend"
              class="d-flex flex-column flex-grow-1 overflow-hidden"
            />

            <ChatLayoutRegular
              v-else
              ref="regRef"
              :key="`reg-${auth.authStatus}`"
              :authStatus="auth.authStatus"
              :me-id="auth.user?.id"
              :peer="chat.selectedUser"
            />
          </div>

          <div class="border-t pt-2" style="flex: 0 0 auto">
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              class="w-100 mx-auto"
              @send="onSend"
            />
          </div>
        </v-col>
      </v-row>
    </v-container>

    <!-- Mobile-only Drawers -->
    <v-navigation-drawer
      v-model="leftOpen"
      location="left"
      temporary
      class="d-md-none"
      width="320"
      aria-label="Topics drawer"
    >
      <div
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
        style="height: 100%"
      >
        <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
          <div
            ref="leftScrollRefMobile"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <!-- SAME content as desktop Topics column -->
            <ChatLayoutUsers
              v-if="tabVisibility.online"
              list-type="online"
              :users="usersWithPresence"
              :pinnedId="IMCHATTY_ID"
              :activeChats="activeChats"
              :selectedUserId="selectedUserId"
              :isLoading="isLoading"
              :user-profile="userProfile"
              :auth-status="auth.authStatus"
              :disable-filter-toggle="shouldDisableToggle"
              :show-ai="showAIUsers"
              @user-selected="selectUser"
              @filter-changed="updateFilters"
              @update:showAi="showAIUsers = $event"
            />
          </div>
        </v-card>
      </div>
    </v-navigation-drawer>

    <v-navigation-drawer
      v-model="rightOpen"
      location="right"
      temporary
      class="d-md-none"
      width="300"
      aria-label="Participants drawer"
    >
      <div
        class="pa-2 d-flex flex-column overflow-hidden min-h-0"
        style="height: 100%"
      >
        <v-card flat class="d-flex flex-column flex-grow-1 min-h-0">
          <div
            ref="rightScrollRefMobile"
            class="flex-grow-1 overflow-auto min-h-0 users-scroll"
            style="flex: 1 1 0"
          >
            <ChatLayoutUsers
              v-if="tabVisibility.active"
              list-type="active"
              :users="usersWithPresence"
              :pinnedId="IMCHATTY_ID"
              :activeChats="activeChats"
              :selectedUserId="selectedUserId"
              :isLoading="isLoading"
              :user-profile="userProfile"
              :auth-status="auth.authStatus"
              :disable-filter-toggle="shouldDisableToggle"
              :show-filters="false"
              :show-ai="showAIUsers"
              @user-selected="selectUser"
              @filter-changed="updateFilters"
              @update:showAi="showAIUsers = $event"
            />
          </div>
        </v-card>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, unref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useMessagesStore } from "@/stores/messagesStore";
import { useChatStore } from "@/stores/chatStore";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { usePresenceStore2 } from "@/stores/presenceStore2"; // the minimal presence we made
import { useOnboardingAi } from "~/composables/useOnboardingAi";
import { useDisplay } from "vuetify";
import { useDb } from "@/composables/useDB";
import { useLocalePath } from "#imports";
import { useAiQuota } from "~/composables/useAiQuota";
import { useTabFilters } from "@/composables/useTabFilters";
import { useI18n } from "vue-i18n";

const auth = useAuthStore();
const chat = useChatStore();
const msgs = useMessagesStore();
const draft = useOnboardingDraftStore();
const draftStore = draft; // alias for template
const presence2 = usePresenceStore2();

const route = useRoute();
const { t } = useI18n();

const { smAndDown } = useDisplay();
const { getClient, getActiveChats, insertMessage } = useDb();
const supabase = getClient();

const onbRef = ref(null);
const filtersVisible = ref(true);

const leftOpen = ref(false);
const rightOpen = ref(false);
const panelOpen = ref(false);
const autoCloseOnScroll = false;

const localePath = useLocalePath();
const { tryConsume, limitReachedMessage } = useAiQuota();

const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const filters = reactive({
  gender_id: null,
  status_id: null,
  age_range: [18, 100],
  country_name: null,
  interests: null,
});

// ---- Onboarding AI helpers
const { sendUserMessage } = useOnboardingAi();

const { tabFilters, canShow, setMany } = useTabFilters();

// v-model proxy: allows the child to "assign" a new object,
// but we merge it into the existing reactive state.
const tabFiltersModel = computed({
  get: () => tabFilters,
  set: (val) => setMany(val || {}),
});

const tabVisibility = computed(() => ({
  online: canShow("online"),
  offline: canShow("offline"),
  active: canShow("active"),
}));

// ---- Basic UI state
const messageDraft = ref("");
// const replyingToMessage = ref(null)
const regRef = ref(null);
const isProfileDialogOpen = ref(false);
const isLoading = ref(false);
const isTabVisible = ref(true);
const modalUser = ref(null);
const showAIUsers = ref(true);
const activeChats = ref([]);
const replyingToMessage = ref(null); // { id, content } | null
const clearReply = () => {
  replyingToMessage.value = null;
};
// keep primitive since your realtime is working with it
const meId = auth.user?.id;

const onlineIds = computed(() => {
  // primary: the store getter
  const storeIds = Array.isArray(presence2.onlineUserIds)
    ? presence2.onlineUserIds
    : [];

  if (storeIds.length) {
    return storeIds.map((s) => String(s).trim().toLowerCase());
  }

  // fallback: read the channel's raw presence map (ignore observer:*)
  const raw = presence2?.channel?.presenceState?.() || {};
  return Object.keys(raw)
    .filter((k) => !String(k).startsWith("observer:"))
    .map((k) => k.trim().toLowerCase());
});

const openPanels = ref([0]); // start open; use [] if you want it closed initially
const togglePanel0 = () => {
  const idx = openPanels.value.indexOf(0);
  openPanels.value =
    idx === -1
      ? [...openPanels.value, 0]
      : openPanels.value.filter((n) => n !== 0);
};

const selectedUserId = computed(
  () => chat.selectedUser?.user_id || chat.selectedUser?.id || null
);

const selectedUserRaw = computed(() => chat.selectedUser || null);

const selectedUser = computed(() => {
  const raw = selectedUserRaw.value;
  if (!raw) return null;
  const rawId = raw.user_id ?? raw.id;
  if (!rawId) return raw;
  const match = usersWithPresence.value.find((u) => {
    const uid = u.user_id ?? u.id;
    return String(uid) === String(rawId);
  });
  return match || raw;
});

const selectedUserInitial = computed(() => {
  const name = selectedUser.value?.displayname || "";
  const trimmed = name.trim();
  if (trimmed.length) return trimmed[0].toUpperCase();
  return "?";
});

const selectedUserTitle = computed(() => {
  const user = selectedUser.value;
  if (!user) return "Select a user to start chatting";
  const parts = [];
  if (user.displayname) parts.push(String(user.displayname));
  if (user.age) parts.push(String(user.age));
  return parts.join(", ");
});

const selectedUserLocation = computed(() => {
  const user = selectedUser.value;
  if (!user) return "";
  const location = [user.city, user.country].filter(Boolean).join(", ");
  const emoji = user.country_emoji ? String(user.country_emoji).trim() : "";
  if (emoji && location) return `${emoji} ${location}`;
  return emoji || location;
});

const selectedUserSubtitle = computed(() => {
  const user = selectedUser.value;
  if (!user) return "Pick someone from the list on the left.";
  if (user.tagline) return String(user.tagline);
  if (selectedUserLocation.value) return selectedUserLocation.value;
  if (user.bio) {
    const bio = String(user.bio).trim();
    return bio.length > 80 ? `${bio.slice(0, 77)}...` : bio;
  }
  return "No additional details yet.";
});

const selectedUserMeta = computed(() => {
  const user = selectedUser.value;
  if (!user) return [];
  const meta = [];
  if (user.age) {
    meta.push({
      key: "age",
      icon: "mdi-cake-variant",
      label: "Age",
      value: String(user.age),
    });
  }
  if (user.gender) {
    meta.push({
      key: "gender",
      icon: "mdi-gender-male-female",
      label: "Gender",
      value: String(user.gender),
    });
  }
  if (selectedUserLocation.value) {
    meta.push({
      key: "location",
      icon: "mdi-map-marker",
      label: "Location",
      value: selectedUserLocation.value,
    });
  }
  if (user.relationship_status) {
    meta.push({
      key: "relationship-status",
      icon: "mdi-heart-outline",
      label: "Status",
      value: String(user.relationship_status),
    });
  }
  return meta;
});

const selectedUserInterests = computed(() => {
  const raw = selectedUser.value?.looking_for;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry.length);
});

const loadingMsgs = computed(() => chat.loading);

watch(selectedUserId, () => {
  panelOpen.value = false;
});

// alias for clarity (ref)
const peerId = selectedUserId;

// stable key for typing channel / DM room
const conversationKey = computed(() =>
  meId && peerId.value
    ? [String(meId), String(peerId.value)].sort().join(":")
    : null
);
const profileLink = computed(() => {
  const u = chat.selectedUser;
  if (!u) return null;
  const gender = genderSegmentFromUser(u);
  const slug = u.slug || u.profile_slug || u.username_slug || null;
  if (!gender || !slug) return null;
  return localePath(`/profiles/${gender}/${slug}`);
});

const shouldDisableToggle = computed(() =>
  ["unauthenticated", "guest", "onboarding"].includes(auth.authStatus)
);

// ———————————————————————————————————————————
// Props
// ———————————————————————————————————————————
const props = defineProps({
  user: Object,
  userProfile: Object,
  authStatus: { type: String, required: true },
});
const userProfile = computed(() => props.userProfile || null);

if (typeof window !== "undefined") window.__presenceFromLayout = presence2;

// ———————————————————————————————————————————
// Actions
// ———————————————————————————————————————————
function updateFilters(f) {
  filters.gender_id = f.gender_id == null ? null : Number(f.gender_id);
  filters.status_id = f.status_id == null ? null : Number(f.status_id);
  filters.age_range = Array.isArray(f.age_range) ? f.age_range : [18, 100];
  filters.country_name = f.country_name ?? null;
  filters.interests =
    Array.isArray(f.interests) && f.interests.length ? f.interests : null;
}

// ---- Auth-gated computed flags
const isPreAuth = computed(() =>
  ["unauthenticated", "guest", "onboarding"].includes(auth.authStatus)
);
const isBotSelected = computed(() => {
  const sel = chat.selectedUser;
  const sid = sel?.user_id || sel?.id;
  return sid === IMCHATTY_ID;
});
const canSend = computed(() => {
  if (isBotSelected.value) return true;
  return ["anon_authenticated", "authenticated"].includes(auth.authStatus);
});

const usersWithPresence = computed(() => {
  // ——— presence dependency (reactive) ———
  // console.log('[usersWithPresence] src len =', Array.isArray(chat.users) ? chat.users.length : 'n/a');

  const onlineSet = new Set(onlineIds.value);

  const resolvePresenceKey = (u) =>
    String(u?.user_id ?? u?.auth_user_id ?? u?.uid ?? u?.id ?? "")
      .trim()
      .toLowerCase();

  const meKey = String(auth.user?.id ?? "")
    .trim()
    .toLowerCase();

  // ——— normalize filters once ———
  const want = {
    gender: filters.gender_id == null ? null : Number(filters.gender_id),
    status: filters.status_id == null ? null : Number(filters.status_id),
    range:
      Array.isArray(filters.age_range) && filters.age_range.length === 2
        ? [Number(filters.age_range[0]), Number(filters.age_range[1])]
        : null,
    country:
      filters.country_name &&
      filters.country_name.toLowerCase() !== "all countries"
        ? String(filters.country_name).trim().toLowerCase()
        : null,
    interests:
      Array.isArray(filters.interests) && filters.interests.length
        ? filters.interests.map((s) => String(s).toLowerCase())
        : null,
  };

  const src = Array.isArray(chat.users) ? chat.users : [];

  const list = src
    .map((u) => {
      // IMPORTANT: keep your outward-facing id the same (user_id || id)
      const rawUid = u.user_id ?? u.id;
      const id = String(rawUid ?? "");

      // presence check uses the *auth id* resolver (lowercased)
      const online = u.is_ai ? true : onlineSet.has(resolvePresenceKey(u));

      const genderFromStr =
        typeof u.gender === "string"
          ? { male: 1, female: 2, other: 3 }[u.gender.toLowerCase()] ?? null
          : null;

      const interests_set = new Set(
        Array.isArray(u.looking_for)
          ? u.looking_for.map((s) => String(s).toLowerCase())
          : []
      );

      return {
        ...u, // spread first
        id, // keep original outward id
        user_id: rawUid, // keep original auth id too
        online, // override any stale u.online
        presence: online ? "online" : "offline",
        gender_id_norm:
          u.gender_id != null ? Number(u.gender_id) : genderFromStr,
        status_id_norm: u.status_id != null ? Number(u.status_id) : null,
        age_norm: u.age != null ? Number(u.age) : null,
        country_norm: u.country ? String(u.country).trim().toLowerCase() : null,
        interests_set,
      };
    })
    // don’t show myself (compare using presence key, not UI id)
    .filter((u) => resolvePresenceKey(u) !== meKey)
    // hide AI if toggled off
    .filter((u) => (showAIUsers.value ? true : !u.is_ai))
    // gender filter
    .filter((u) =>
      want.gender == null ? true : u.gender_id_norm === want.gender
    )
    // profile status filter (not presence)
    .filter((u) =>
      want.status == null ? true : u.status_id_norm === want.status
    )
    // age filter
    .filter((u) => {
      if (!want.range) return true;
      const [min, max] = want.range;
      const a = u.age_norm;
      if (a == null || Number.isNaN(a)) return true;
      return a >= min && a <= max;
    })
    // country filter
    .filter((u) => (want.country ? u.country_norm === want.country : true))
    // interests (any)
    .filter((u) => {
      if (!want.interests) return true;
      const wantSet = new Set(want.interests);
      if (!(u.interests_set instanceof Set)) return true;
      for (const i of wantSet) if (u.interests_set.has(i)) return true;
      return false;
    });

  // pin ImChatty first, then alpha
  const pinned = list.find(
    (u) => String(u.id) === IMCHATTY_ID || String(u.user_id) === IMCHATTY_ID
  );
  const others = list.filter(
    (u) => String(u.id) !== IMCHATTY_ID && String(u.user_id) !== IMCHATTY_ID
  );

  return [
    ...(pinned ? [pinned] : []),
    ...others.sort((a, b) =>
      (a.displayname || "").localeCompare(b.displayname || "")
    ),
  ];
});

function selectUser(u) {
  chat.setSelectedUser(u);
  if (smAndDown.value) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
}

const pendingSelectImChatty = ref(false);

function selectImChatty() {
  // reuse your existing finder
  const target = findUserByIdOrSlug({ id: IMCHATTY_ID, slug: "imchatty" });
  if (target) {
    chat.setSelectedUser(target);
    pendingSelectImChatty.value = false;
  } else {
    // users not loaded yet → try again when they appear
    pendingSelectImChatty.value = true;
  }
}

// ---- Profiles realtime so new profiles appear without reload
let profilesChan = null;
function startProfilesRealtime() {
  if (profilesChan) return;
  profilesChan = supabase.channel("rt:profiles");

  const refetch = async () => {
    await chat.fetchChatUsers();
  };
  profilesChan.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "profiles" },
    refetch
  );
  profilesChan.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "profiles" },
    refetch
  );
  profilesChan.subscribe((s) => console.log("[profiles][status]", s));
}

// ———————————————————————————————————————————
// URL-driven selection (?userId|id, ?userSlug|slug, or ?imchatty)
// ———————————————————————————————————————————
const selectedFromRouteOnce = ref(false);

function normStr(v) {
  if (v == null) return null;
  if (Array.isArray(v)) v = v[0];
  const s = String(v).trim();
  return s.length ? s : null;
}

function findUserByIdOrSlug({ id, slug }) {
  const idNorm = id ? String(id).trim().toLowerCase() : null;
  const slugNorm = slug ? String(slug).trim().toLowerCase() : null;
  const list = Array.isArray(chat.users) ? chat.users : [];
  return list.find((u) => {
    const uid = String(u?.user_id ?? u?.id ?? "")
      .trim()
      .toLowerCase();
    if (idNorm && uid && uid === idNorm) return true;
    const s = String(u?.slug ?? u?.profile_slug ?? u?.username_slug ?? "")
      .trim()
      .toLowerCase();
    if (slugNorm && s && s === slugNorm) return true;
    return false;
  });
}

async function trySelectFromRoute() {
  if (selectedFromRouteOnce.value) return; // don’t override a manual selection

  const q = route.query;
  const id = normStr(q.userId ?? q.id);
  const slug = normStr(q.userslug ?? q.slug);
  const wantsImChatty =
    Object.prototype.hasOwnProperty.call(q, "imchatty") ||
    normStr(q.imchatty) === "true";

  let target = null;
  if (id || slug) {
    target = findUserByIdOrSlug({ id, slug });
  } else if (wantsImChatty) {
    target = findUserByIdOrSlug({ id: IMCHATTY_ID, slug: null });
  }

  if (target) {
    chat.setSelectedUser(target);
    selectedFromRouteOnce.value = true;
  }
}

// ---- Lifecycle
onMounted(async () => {
  draftStore.hydrate?.();
  refreshActiveChats();

  await chat.fetchChatUsers();
  await chat.fetchActiveChats();
  chat.initActiveChatsWatcher();
  chat.initializeDefaultUser(auth.authStatus);
});

onMounted(() => {
  const v = localStorage.getItem("chat.filtersVisible");
  if (v !== null) filtersVisible.value = v === "true";
});
watch(filtersVisible, (v) => {
  localStorage.setItem("chat.filtersVisible", String(v));
});

onBeforeUnmount(async () => {
  if (profilesChan) {
    try {
      await supabase.removeChannel(profilesChan);
    } catch {}
    profilesChan = null;
  }
});

watch(() => auth.user?.id, refreshActiveChats);

watch(
  () => [
    filters.gender_id,
    filters.status_id,
    filters.age_range?.[0],
    filters.age_range?.[1],
    filters.country_name,
    filters.interests?.join("|"),
  ],
  refreshActiveChats,
  { deep: false }
);

// react to query changes and to users list loading
watch(
  () => [
    route.query.userId,
    route.query.id,
    route.query.userSlug,
    route.query.slug,
    route.query.imchatty,
    Array.isArray(chat.users) ? chat.users.length : 0,
  ],
  async () => {
    await nextTick();
    await trySelectFromRoute();
  }
);

async function onSend(text) {
  const selectedPeer = chat.selectedUser; // ✅ define a local alias
  const toId = selectedPeer?.user_id || selectedPeer?.id;
  const sendingToBot = toId === IMCHATTY_ID;

  // pre-auth onboarding
  if (isPreAuth.value && sendingToBot) {
    try {
      onbRef.value?.setTyping(true); // show dots immediately
      await sendUserMessage(text); // <-- your existing call
    } finally {
      onbRef.value?.setTyping(false); // safety off-switch
    }
    return;
  }

  // optimistic local send
  regRef.value?.appendLocalAndSend?.(text);

  // BOT path only
  if ((selectedPeer?.is_ai || sendingToBot) && meId && toId) {
    // ✅ (optional but recommended) show local typing bubble in Regular3
    regRef.value?.setTyping?.(true);

    const { allowed, used, remaining, limit } = await tryConsume();
    if (!allowed) {
      const msg = limitReachedMessage(auth.authStatus, limit);

      // 1) show in current thread
      regRef.value?.appendPeerLocal?.(msg);

      // 2) persist (current bot thread)
      try {
        await insertMessage(meId, toId, msg);
      } catch (e) {}

      // 3) also persist to ImChatty thread (optional)
      try {
        const imchatty = chat.getUserById?.(IMCHATTY_ID);
        if (imchatty) {
          await insertMessage(meId, IMCHATTY_ID, msg);
          chat.addActivePeer?.(IMCHATTY_ID);
        }
      } catch (e) {}

      regRef.value?.setTyping?.(false);
      return;
    }

    const history = regRef.value?.getLastMessages?.(10, selectedPeer) || [];
    const replyTo = replyingToMessage.value?.content ?? null;

    try {
      const aiText = await fetchAiResponse(
        text,
        selectedPeer,
        userProfile.value,
        history,
        replyTo
      );
      if (aiText) regRef.value?.appendPeerLocal?.(aiText);
      await insertMessage(meId, toId, aiText);
    } catch (e) {
      console.error("[AI] fetch/insert failed", e);
    } finally {
      // ✅ always clear local typing bubble for bot
      regRef.value?.setTyping?.(false);
    }
  }
}

function openProfileDialog(user) {
  modalUser.value = user;
  isProfileDialogOpen.value = true;
}

function genderSegmentFromUser(u) {
  if (!u) return null;
  if (typeof u.gender === "string") {
    const g = u.gender.toLowerCase();
    if (g === "male" || g === "female" || g === "other") return g;
  }
  const id = Number(u.gender_id ?? u.gender_id_norm);
  return { 1: "male", 2: "female", 3: "other" }[id] || null;
}

function mapCountryToId(countryName) {
  // if you have a lookup already, use it; otherwise pass null to RPC
  return null;
}

async function refreshActiveChats() {
  const me = auth.user?.id;
  if (!me) {
    activeChats.value = [];
    return;
  }

  const genderId = filters.gender_id ?? null;
  const minAge = Array.isArray(filters.age_range)
    ? Number(filters.age_range[0])
    : 18;
  const maxAge = Array.isArray(filters.age_range)
    ? Number(filters.age_range[1])
    : 99;
  const isAnon = null; // or your anon toggle
  const interests = filters.interests ?? null;
  const country_id = mapCountryToId(filters.country_name);
  const status_id = filters.status_id ?? null;

  const { data, error } = await getActiveChats(
    me,
    genderId,
    minAge,
    maxAge,
    isAnon,
    interests,
    country_id,
    status_id
  );
  if (error) return console.error("[activeChats] rpc error", error);

  // normalize to array of IDs
  activeChats.value = (data || [])
    .map((r) => String(r.peer_id ?? r.user_id ?? r.id ?? ""))
    .filter(Boolean);
}

// 🔹 helper to call your /api/aiChat endpoint
async function fetchAiResponse(
  message,
  aiUser,
  userProfile,
  historyArr = [],
  replyToStr = null
) {
  try {
    const safeHistory = Array.isArray(unref(historyArr))
      ? unref(historyArr).slice(-10)
      : [];

    const payload = {
      aiUser: aiUser?.persona_key || aiUser?.displayname, // stable key if you have it
      userName: userProfile?.displayname ?? null,
      userMessage: message,
      userGender: userProfile?.gender ?? null,
      userAge: userProfile?.age ?? null,
      history: safeHistory, // ✅ no .value here
      replyTo: replyToStr ?? null, // ✅ string or null
    };

    const res = await $fetch("/api/aiChat", { method: "POST", body: payload });
    return res?.success ? res.aiResponse : null;
  } catch (e) {
    console.error("[AI] fetchAiResponse error", e);
    return null;
  }
}

function toggleFilters() {
  filtersVisible.value = !filtersVisible.value;
  // debug line; remove after verifying
  console.debug("[filtersVisible]", filtersVisible.value);
}
</script>

<style scoped>
/* Keep the messages header visible while content scrolls */
.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

/* Nice, minimal scroll areas */
.users-scroll,
.messages-scroll {
  overscroll-behavior: contain;
}

/* Utility if you need it for any inner wrappers */
.overflow-hidden {
  overflow: hidden !important;
}
.overflow-auto {
  overflow: auto !important;
}

.chat-col {
  max-width: 800px;
}

.header-chevron {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.profile-header {
  gap: 16px;
}
.profile-header-left,
.mobile-profile-left {
  gap: 12px;
}
.profile-header-actions {
  gap: 8px;
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}
.profile-meta-grid {
  column-gap: 24px;
}
.profile-bio {
  white-space: pre-line;
}
</style>
