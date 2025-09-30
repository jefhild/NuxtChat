<template>
  <!-- OUTER SHELL: fixed to viewport height -->
  <v-container fluid>
    <v-row no-gutters
      ><v-col>
        <ChatLayoutTabFilters v-model="tabFiltersModel" class="mb-1 ml-1"/>
        <ChatLayoutFilterMenu
          :userProfile="userProfile || null"
          :disableToggle="shouldDisableToggle"
          :authStatus="authStatus"
          @filter-changed="updateFilters"
        />
      </v-col>

      <!-- <v-col v-if="userProfile"
        >{{ userProfile.displayname }} - {{ authStatus }}</v-col
      > -->

      <v-col>
        <ChatLayoutToggleAi
          v-model="showAIUsers"
          :disabled="shouldDisableToggle"
      /></v-col>

      <!-- <v-col>
        <ChatLayoutTabFilters v-model="tabFiltersModel" />
      </v-col> -->
    </v-row>

    <!-- BODY: fills remaining height, overflow hidden so children manage scroll -->
    <v-row class="flex-grow-1 overflow-hidden">
      <!-- USERS COLUMN -->
      <v-col cols="12" md="4" class="pa-2 d-flex flex-column overflow-hidden">
        <template v-if="smAndDown">
          <!-- <v-expansion-panels multiple class="flex-grow-1 overflow-hidden"> -->

          <v-expansion-panels
            v-model="openPanels"
            multiple
            class="flex-grow-1 overflow-hidden"
          >
            <v-expansion-panel>
              <!-- <v-expansion-panel-title class="bg-blue-lighten-5 py-1 px-2"> -->
              <v-expansion-panel-title
                hide-actions
                class="bg-blue-lighten-5 py-1 px-2 d-flex justify-center position-relative"
              >
                <ChatLayoutHeader
                  :currentUser="user"
                  :selectedUser="chat.selectedUser"
                />

                <v-btn
                  size="small"
                  icon
                  variant="text"
                  class="header-chevron"
                  :aria-label="openPanels.includes(0) ? 'Collapse' : 'Expand'"
                  :aria-expanded="String(openPanels.includes(0))"
                  @click.stop="togglePanel0"
                >
                  <v-icon
                    :icon="
                      openPanels.includes(0)
                        ? 'mdi-chevron-up'
                        : 'mdi-chevron-down'
                    "
                  />
                </v-btn>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pa-0">
                <!-- Scroll area -->
                <div class="flex-grow-1 overflow-auto px-2 py-2 users-scroll">
                  <ChatLayoutUsers
                    v-if="
                      tabVisibility.online ||
                      tabVisibility.offline ||
                      tabVisibility.active
                    "
                    :users="usersWithPresence"
                    :pinnedId="IMCHATTY_ID"
                    :activeChats="activeChats"
                    :selectedUserId="selectedUserId"
                    :showAIUsers="showAIUsers"
                    :tab-visibility="tabVisibility"
                    :isLoading="isLoading"
                    @user-selected="selectUser"
                  />
                  <SettingsProfileCard
                    v-if="userProfile && !smAndDown"
                    :profile="userProfile"
                    class="mt-2"
                  />
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>

        <template v-else>
          <!-- Scroll area on desktop -->
          <div class="flex-grow-1 overflow-auto users-scroll">
            <ChatLayoutUsers
              v-if="
                tabVisibility.online ||
                tabVisibility.offline ||
                tabVisibility.active
              "
              :users="usersWithPresence"
              :activeChats="activeChats"
              :pinnedId="IMCHATTY_ID"
              :selectedUserId="selectedUserId"
              :showAIUsers="showAIUsers"
              :tab-visibility="tabVisibility"
              :isLoading="isLoading"
              @user-selected="selectUser"
            />
          </div>
        </template>
      </v-col>

      <!-- MESSAGES COLUMN -->
      <v-col cols="12" md="8" class="pa-2 d-flex flex-column overflow-hidden">
        <!-- Optional sticky header inside messages column -->
        <div class="messages-sticky-header" v-if="!smAndDown">
          <ChatLayoutHeader
            :currentUser="user"
            :selectedUser="chat.selectedUser"
            :profileLink="profileLink"
            @open-profile="openProfileDialog"
          />
        </div>

        <!-- Onboarding or Regular chat -->
        <div class="flex-grow-1 d-flex flex-column overflow-hidden">
          <!-- {{ isPreAuth }} -->
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
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4" class="pa-2 d-flex flex-column overflow-hidden">
        <v-card
          v-if="!smAndDown"
          class="d-flex flex-column fill-height"
          color="grey-lighten-4"
          rounded="lg"
          flat
        >
          <div class="ml-2 text-subtitle-2 font-weight-medium">
            {{ headerText.line1 }}
          </div>
          <div class="ml-2 text-body-2 text-medium-emphasis">
            {{ headerText.line2 }}
          </div></v-card
        >
      </v-col>
      <v-col
        cols="12"
        md="8"
        class="pa-2 d-flex flex-column overflow-hidden chat-col"
      >
        <ChatLayoutMessageComposer
          v-model:draft="messageDraft"
          :peer-id="peerId"
          :me-id="meId"
          :conversation-key="conversationKey"
          class="w-100 mx-auto"
          @send="onSend"
        />
      </v-col>
    </v-row>
  </v-container>

  <!-- Profile modal unchanged -->
  <v-dialog v-model="isProfileDialogOpen" max-width="640">
    <v-card>
      <v-card-title class="d-flex justify-space-between">
        <span>{{ modalUser?.displayname }}, {{ modalUser?.age }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="isProfileDialogOpen = false"
        />
      </v-card-title>

      <v-card-text>
        <div class="d-flex">
          <v-avatar
            size="80"
            :image="getAvatar(modalUser?.avatar_url, modalUser?.gender_id)"
            class="mr-4"
          />
          <div>
            <div class="text-subtitle-1 mb-1">{{ modalUser?.tagline }}</div>
            <div class="text-body-2">{{ modalUser?.bio }}</div>
            <div class="text-caption mt-2">
              {{ modalUser?.country }} {{ modalUser?.country_emoji }}
              <span v-if="modalUser?.city">• {{ modalUser?.city }}</span>
            </div>
          </div>
        </div>

        <div
          class="mt-4"
          v-if="
            Array.isArray(modalUser?.looking_for) &&
            modalUser.looking_for.length
          "
        >
          <v-chip
            v-for="(tag, i) in modalUser.looking_for"
            :key="i"
            class="mr-1 mb-1"
            size="small"
          >
            {{ tag }}
          </v-chip>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <NuxtLink :to="profileLink" class="text-decoration-none">
          <v-btn variant="outlined" size="small">View full profile</v-btn>
        </NuxtLink>
        <v-btn color="primary" :to="`/chat?userslug=${modalUser.slug}`"
          >Message</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, unref, computed, onMounted, onBeforeUnmount } from "vue";
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

const auth = useAuthStore();
const chat = useChatStore();
const msgs = useMessagesStore();
const draft = useOnboardingDraftStore();
const draftStore = draft; // alias for template
const presence2 = usePresenceStore2();

const route = useRoute();
const router = useRouter();

const { smAndDown } = useDisplay();
const { getClient, getActiveChats, insertMessage } = useDb();
const supabase = getClient();

const onbRef = ref(null);

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

const headerText = computed(() => {
  switch (auth.authStatus) {
    case "unauthenticated":
      return {
        line1: "Please consent to our terms.",
        line2: "unauthenticated",
      };

    case "guest":
    case "onboarding":
      return {
        line1: "Welcome, " + draft.displayName + " you're almost there!",
        line2: "guest",
      };

    case "anon_authenticated":
      return {
        line1:
          draft.displayName ||
          (auth.userProfile?.displayname
            ? auth.userProfile.displayname +
              " " +
              (auth.userProfile.country_emoji || "")
            : null) ||
          "(anonymous user)",
        line2:
          draft.age ||
          (auth.userProfile?.age
            ? auth.userProfile.age + " " + (auth.userProfile.gender || "")
            : null) ||
          "(anonymous guest)",
      };

    case "authenticated":
      return {
        line1:
          draft.displayName ||
          (auth.userProfile?.displayname
            ? auth.userProfile.displayname +
              " " +
              (auth.userProfile.country_emoji || "")
            : null) ||
          "(anonymous user)",
        line2:
          draft.age ||
          (auth.userProfile?.age
            ? auth.userProfile.age + " " + (auth.userProfile.gender || "")
            : null) ||
          "(authenticated user)",
      };

    default:
      return { line1: "", line2: "" };
  }
});

// ———————————————————————————————————————————
// Props
// ———————————————————————————————————————————
const props = defineProps({
  user: Object,
  userProfile: Object,
  authStatus: { type: String, required: true },
});

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
  await chat.fetchActiveChats(); // server-filtered baseline
  chat.initActiveChatsWatcher(); // realtime merge on new messages
  chat.initializeDefaultUser(auth.authStatus); // ideally selects ImChatty pre-auth
  // startProfilesRealtime();
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
        props?.userProfile || null,
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
</script>

<style scoped>
/* Fix outer height to viewport; 100dvh is mobile-friendly */
.chat-shell {
  height: 100dvh; /* or calc(100dvh - var(--app-toolbar-height)) if you have a fixed app bar */
}

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
</style>
