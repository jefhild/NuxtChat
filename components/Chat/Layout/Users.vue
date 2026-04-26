<template>
  <div class="chat-users-container">
    <div class="users-header px-1 py-1 mb-0">
      <div class="header-left">
        <span class="header-text">
          {{ $t(headingKey) }}
        </span>
        <ChatLayoutFilterMenu
          v-if="showFilters"
          class="filter-trigger"
          :user-profile="userProfile"
          :auth-status="authStatus"
          :disable-toggle="disableFilterToggle"
          :show-ai="showAi"
          :show-language-practice-ai="showLanguagePracticeAi"
          @filter-changed="$emit('filter-changed', $event)"
          @update:showAi="$emit('update:showAi', $event)"
          @update:showLanguagePracticeAi="$emit('update:showLanguagePracticeAi', $event)"
        />
      </div>
      <span v-if="showCount" class="header-count">
        {{ displayUsers.length }}
      </span>
    </div>

    <ChatMatchSummaryStrip
      v-if="showMatchStrip"
      :data="matchData"
      :loading="matchLoading"
      :active-filter="matchFilter"
      @refresh="handleRefresh"
      @filter-change="setMatchFilter($event)"
      @random-pick="handleRandomPick"
    />

    <div class="users-section flex-grow-1 overflow-hidden min-h-0">
      <template v-if="isLoading">
        <div class="users-skeleton" aria-hidden="true">
          <div v-for="index in 6" :key="index" class="users-skeleton-row">
            <span class="users-skeleton-avatar" />
            <span class="users-skeleton-lines">
              <span class="users-skeleton-line users-skeleton-line--primary" />
              <span class="users-skeleton-line users-skeleton-line--secondary" />
            </span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="users-content">
          <div
            v-if="!displayUsers.length"
            class="users-empty-state"
          >
            {{ $t(emptyStateKey) }}
          </div>
          <div
            v-else
            ref="virtualScrollRef"
            class="users-virtual"
          >
            <div
              class="users-virtual__inner"
              :style="{ height: `${virtualTotalSize}px` }"
            >
              <div
                v-for="row in virtualRows"
                :key="row.key"
                class="users-virtual__item"
                :class="{
                  'users-virtual__item--menu-open':
                    row.item.type === 'user' && isActionMenuOpen(row.item.user),
                }"
                :style="{
                  height: `${row.size}px`,
                  transform: `translateY(${row.start}px)`,
                }"
              >
                <template v-if="row.item.type === 'group'">
                  <div
                    class="group-row"
                    @click="toggleGroup(row.item.id)"
                  >
                    <i
                      :class="[
                        'mdi',
                        isGroupOpen(row.item.id) ? 'mdi-chevron-down' : 'mdi-chevron-right',
                        'group-caret'
                      ]"
                      aria-hidden="true"
                    />
                    <span class="group-label">{{ row.item.title }}</span>
                    <span v-if="showCount" class="group-count">
                      {{ row.item.count }}
                    </span>
                  </div>
                </template>
                <div
                  v-else
                  class="user-row"
                  :class="{ selected: isSelected(row.item.user) }"
                  @click="emit('user-selected', row.item.user)"
                >
                  <span class="avatar-wrap">
                    <span class="avatar-shell">
                      <img
                        v-if="row.item.user.avatar_url"
                        :src="row.item.user.avatar_url"
                        :alt="displayNameFor(row.item.user)"
                        class="avatar-image"
                      />
                      <span v-else class="avatar-fallback">{{
                        displayNameFor(row.item.user).slice(0, 1).toUpperCase()
                      }}</span>
                    </span>
                    <span
                      class="presence-dot"
                      :class="presenceClass(row.item.user)"
                    />
                    <span v-if="row.item.unread > 0" class="unread-badge">
                      <span class="unread-dot"></span>
                      <span class="unread-count">{{ row.item.unread }}</span>
                    </span>
                  </span>
                  <span class="user-title">
                    <span
                      class="displayname"
                      :title="taglineFor(row.item.user) || undefined"
                    >
                      {{ displayNameFor(row.item.user) }}
                    </span>
                  </span>
                  <span class="flag-wrap">
                    <i
                      :style="{ '--chat-gender-color': genderColorFor(row.item.user.gender_id) }"
                      :class="['mdi', genderIconFor(row.item.user.gender_id), 'gender-icon']"
                      aria-hidden="true"
                    />
                    <span class="flag" v-if="row.item.user.country_emoji">
                      {{ row.item.user.country_emoji }}
                    </span>
                    <button
                      v-if="hasLanguagePracticeChat(row.item.user)"
                      type="button"
                      class="language-practice-marker language-practice-marker--chat"
                      :title="t('components.users.languagePracticeChat')"
                      :aria-label="t('components.users.languagePracticeChat')"
                      @click.stop="emit('activate-language-practice', row.item.user)"
                    >
                      <i class="mdi mdi-translate" aria-hidden="true" />
                    </button>
                    <div
                      v-if="showActions"
                      class="actions"
                      @click.stop
                      @mousedown.stop
                      @pointerdown.stop
                    >
                      <button
                        type="button"
                        class="action-menu-btn"
                        :aria-expanded="String(isActionMenuOpen(row.item.user))"
                        aria-haspopup="menu"
                        @click.stop.prevent="toggleActionMenu(row.item.user)"
                      >
                        <i class="mdi mdi-dots-horizontal" aria-hidden="true" />
                      </button>
                      <div
                        v-if="isActionMenuOpen(row.item.user)"
                        class="action-menu"
                        role="menu"
                      >
                        <button
                          type="button"
                          class="action-menu__item"
                          role="menuitem"
                          @click.stop="onActionMenuClick('view-profile', row.item.user)"
                        >
                          <i class="mdi mdi-card-account-details-outline action-menu__icon" aria-hidden="true" />
                          <span>{{ $t('components.activeChats.profile-title') }}</span>
                        </button>
                        <button
                          v-if="hasLanguagePracticeChat(row.item.user)"
                          type="button"
                          class="action-menu__item"
                          role="menuitem"
                          @click.stop="onActionMenuClick('activate-language-practice', row.item.user)"
                        >
                          <i class="mdi mdi-translate action-menu__icon" aria-hidden="true" />
                          <span>{{ $t('components.activeChats.activate-language-practice-title') }}</span>
                        </button>
                        <button
                          type="button"
                          class="action-menu__item action-menu__item--danger"
                          role="menuitem"
                          @click.stop="onActionMenuClick('delete-chat', row.item.user)"
                        >
                          <i class="mdi mdi-trash-can-outline action-menu__icon" aria-hidden="true" />
                          <span>{{ $t('components.activeChats.delete-title') }}</span>
                        </button>
                      </div>
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { useI18n } from "vue-i18n";
import { useMessagesStore } from "@/stores/messagesStore";
import { useMatchCandidates, setMatchFilter } from "@/composables/useMatchCandidates";
import ChatLayoutFilterMenu from "./FilterMenu.vue";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const props = defineProps({
  users: { type: Array, default: () => [] }, // expects { id/user_id, displayname, online }
  activeChats: { type: Array, default: () => [] },
  selectedUserId: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  pinnedId: {
    type: String,
    default: "a3962087-516b-48df-a3ff-3b070406d832", // ImChatty
  },
  pinnedSlug: {
    type: String,
    default: "imchatty",
  },
  listType: {
    type: String,
    default: "online",
    validator: (val) => ["online", "offline", "active"].includes(val),
  },
  showCount: { type: Boolean, default: true },
  userProfile: { type: Object, default: null },
  authStatus: { type: String, default: "" },
  disableFilterToggle: { type: Boolean, default: false },
  showFilters: { type: Boolean, default: true },
  showAi: { type: Boolean, default: true },
  showLanguagePracticeAi: { type: Boolean, default: false },
  suppressMatchStrip: { type: Boolean, default: false },
  languagePracticeChatIds: { type: Array, default: () => [] },
});
const emit = defineEmits([
  "user-selected",
  "filter-changed",
  "update:showAi",
  "update:showLanguagePracticeAi",
  "delete-chat",
  "view-profile",
  "activate-language-practice",
  "end-language-practice",
]);

const msgs = useMessagesStore();
const { t, locale } = useI18n();
const USER_ROW_HEIGHT = 32;
const USERS_OVERSCAN = 10;

// ── Match candidates ──────────────────────────────────────────────────────────
const { data: matchData, loading: matchLoading, refreshPending: matchRefreshPending, matchFilter, fetchCandidates } = useMatchCandidates();

const shouldFetchMatches = computed(() =>
  props.listType === "online" &&
  ["anon_authenticated", "authenticated"].includes(props.authStatus)
);
// Show the strip if intake data is available, OR while a bust+refresh is in
// flight (keeps it visible while the new candidate fetch resolves)
const showMatchStrip = computed(
  () => shouldFetchMatches.value &&
    !props.suppressMatchStrip &&
    (!!matchData.value?.intake || matchRefreshPending.value)
);

watch(shouldFetchMatches, (val) => { if (val) fetchCandidates(); }, { immediate: true });

// When index.vue sets matchFilter to "random" via setMatchFilter(), trigger a random pick
// When set to "ai", auto-expand the AI PERSONAS group
watch(matchFilter, (val) => {
  if (val === "random") handleRandomPick();
  if (val === "ai" && !openedGroups.value.includes("ai-group")) {
    openedGroups.value = [...openedGroups.value, "ai-group"];
  }
});

// Clear the match filter when the strip gets suppressed (Ezra flow starts)
// so a hidden filter can't silently warp the user list
watch(() => props.suppressMatchStrip, (suppressed) => {
  if (suppressed && matchFilter.value) setMatchFilter(null);
});

function handleRefresh() {
  setMatchFilter(null);
  fetchCandidates(true);
}

function handleRandomPick() {
  const pool = [
    ...(matchData.value?.online || []),
    ...(matchData.value?.ai || []),
  ];
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const user =
    (props.users || []).find((u) => idStr(u) === pick.user_id) ||
    { ...pick, id: pick.user_id };
  emit("user-selected", user);
}
// ─────────────────────────────────────────────────────────────────────────────

const normalizedListType = computed(() =>
  ["online", "offline", "active"].includes(props.listType)
    ? props.listType
    : "online"
);

const idStr = (u) => String(u?.user_id ?? u?.id ?? "").trim();
const languagePracticeChatIdSet = computed(
  () => new Set((props.languagePracticeChatIds || []).map((id) => String(id)))
);
const slugStr = (u) =>
  String(u?.slug ?? u?.profile_slug ?? u?.username_slug ?? "")
    .trim()
    .toLowerCase();
const isPinned = (u) => {
  if (props.pinnedId && idStr(u) === props.pinnedId) return true;
  if (props.pinnedSlug && slugStr(u) === String(props.pinnedSlug).toLowerCase()) {
    return true;
  }
  return false;
};
const unreadFor = (u) => msgs.unreadByPeer?.[idStr(u)] || 0;
const hasLanguagePracticeChat = (u) =>
  languagePracticeChatIdSet.value.has(idStr(u));
const normalizedGenderId = (genderId) => Number(genderId);
const genderIconFor = (genderId) => {
  const id = normalizedGenderId(genderId);
  if (id === 1) return "mdi-gender-male";
  if (id === 2) return "mdi-gender-female";
  return "mdi-gender-non-binary";
};
const genderColorFor = (genderId) => {
  const id = normalizedGenderId(genderId);
  if (id === 1) return "#3b82f6";
  if (id === 2) return "#ec4899";
  return "#a855f7";
};
const displayNameFor = (u) =>
  resolveProfileLocalization({
    profile: u,
    readerLocale: locale?.value,
  }).displayname || "(no name)";
const taglineFor = (u) =>
  resolveProfileLocalization({
    profile: u,
    readerLocale: locale?.value,
  }).tagline;

const isInactiveAi = (u) => {
  if (!u?.is_ai) return false;
  // Accept multiple field names coming from different RPCs; any explicit false disables the bot.
  const flags = [
    u.is_active,
    u.ai_is_active,
    u.persona_is_active,
    u.persona?.is_active,
    u.profile?.is_active,
  ];
  return flags.some((flag) => flag === false);
};

// Source list: override with API candidates when offline or ai pill is active
const sourceUsers = computed(() => {
  if (matchFilter.value === "offline") {
    return (matchData.value?.offline || []).map((c) => ({
      ...c,
      id: c.user_id,
      online: false,
      presence: "offline",
    }));
  }
  if (matchFilter.value === "ai") {
    return (matchData.value?.ai || []).map((c) => ({
      ...c,
      id: c.user_id,
      is_ai: true,
      online: true,
      presence: "online",
    }));
  }
  return props.users || [];
});

const filteredUsers = computed(() => {
  const src = sourceUsers.value.filter((u) => !isInactiveAi(u));

  // Offline and AI filters source directly from API data — no secondary ID filter needed
  if (!matchFilter.value || matchFilter.value === "offline" || matchFilter.value === "ai") return src;

  const ids = new Set();
  if (matchFilter.value === "online") {
    (matchData.value?.online || []).forEach((c) => ids.add(c.user_id));
  }
  // If match data hasn't loaded yet, don't fall back to all users — show empty
  if (!matchData.value) return src;
  if (!ids.size) return [];
  return src.filter((u) => ids.has(idStr(u)));
});

const sortWithPin = (arr = []) =>
  [...arr].sort((a, b) => {
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return displayNameFor(a).localeCompare(displayNameFor(b));
  });

const presenceValue = (u) => {
  const p = u?.presence;
  if (p === "online" || p === "away" || p === "offline" || p === "agent") return p;
  return u?.online ? "online" : "offline";
};

const presenceClass = (u) => {
  const p = presenceValue(u);
  if (p === "away") return "away";
  if (p === "agent") return "agent";
  return p === "online" ? "on" : "off";
};

const onlineUsers = computed(() =>
  sortWithPin(
    filteredUsers.value.filter(
      (u) => presenceValue(u) !== "offline" && !u.hidden
    )
  )
);
const offlineUsers = computed(() =>
  sortWithPin(
    filteredUsers.value.filter(
      (u) => presenceValue(u) === "offline" && !u.hidden
    )
  )
);

const activeSet = computed(
  () => new Set((props.activeChats || []).map((id) => String(id)))
);
const activeUsers = computed(() =>
  sortWithPin(
    filteredUsers.value.filter(
      (u) => activeSet.value.has(idStr(u)) && !u.hidden
    )
  )
);

const displayUsers = computed(() => {
  // Offline/AI match filter: bypass presence split — show API candidates directly
  if (matchFilter.value === "offline" || matchFilter.value === "ai") return sortWithPin(filteredUsers.value);
  switch (normalizedListType.value) {
    case "active":
      return activeUsers.value;
    case "offline":
      return offlineUsers.value;
    default:
      return onlineUsers.value;
  }
});

const showActions = computed(() => normalizedListType.value === "active");

const headingKey = computed(() => {
  switch (normalizedListType.value) {
    case "active":
      return "components.users.active";
    case "offline":
      return "components.users.offline";
    default:
      return "components.users.online";
  }
});

const emptyStateKey = computed(() => {
  switch (normalizedListType.value) {
    case "active":
      return "components.users.none-active";
    case "offline":
      return "components.users.none-offline";
    default:
      return "components.users.no-anonymous";
  }
});

const featuredUser = computed(
  () => displayUsers.value.find((u) => isPinned(u) && !u.hidden) || null
);
const isHoneySimulatedUser = (u) =>
  !!u?.is_ai && !!u?.honey_enabled && !!u?.is_simulated;
const aiUsers = computed(() => {
  // Only show mood-matched AI personas when a filter pill is active
  if (matchFilter.value && matchData.value?.ai?.length) {
    // Build a lookup from the full props.users list to preserve gender/country/etc.
    const fullById = new Map((props.users || []).map((u) => [idStr(u), u]));
    return matchData.value.ai
      .map((c) => ({
        ...(fullById.get(c.user_id) || {}),
        ...c,
        id: c.user_id,
        is_ai: true,
        online: true,
        presence: "online",
      }))
      .filter((u) => !isHoneySimulatedUser(u) && !u.hidden && !isPinned(u));
  }
  // No filter active (or no matches) — show all online AI personas
  return displayUsers.value.filter(
    (u) => u.is_ai && !isHoneySimulatedUser(u) && !u.hidden && !isPinned(u)
  );
});
const humanUsers = computed(() =>
  displayUsers.value.filter(
    (u) => (!u.is_ai || isHoneySimulatedUser(u)) && !u.hidden && !isPinned(u)
  )
);

const openedGroups = ref([]);
const initializedOpen = ref(false);
const manualOpened = ref(false);
const actionMenuById = ref({});
const defaultOpenedGroups = (groupIds = []) =>
  groupIds.filter((id) => id === "human-group");
const translateOrFallback = (key, fallback) => {
  const val = t(key);
  return val && val !== key ? val : fallback;
};

const treeItems = computed(() => {
  const makeUserNode = (u) => ({
    id: idStr(u),
    type: "user",
    user: u,
    unread: unreadFor(u),
  });

  const groups = [
    {
      id: "human-group",
      title: translateOrFallback("components.users.realHumans", "Real Humans"),
      users: humanUsers.value,
    },
    {
      id: "ai-group",
      title: translateOrFallback(
        "components.users.aiAgents",
        "AI Personas"
      ),
      users: aiUsers.value,
    },
  ];

  return groups.map((g) => ({
    id: g.id,
    type: "group",
    title: g.title,
    count: g.users.length,
    children: g.users.map((u) => makeUserNode(u)),
  }));
});

const flatItems = computed(() => {
  const items = [];
  if (featuredUser.value) {
    items.push({
      id: idStr(featuredUser.value),
      type: "user",
      user: featuredUser.value,
      unread: unreadFor(featuredUser.value),
    });
  }
  treeItems.value.forEach((group) => {
    items.push({
      id: group.id,
      type: "group",
      title: group.title,
      count: group.count,
    });
    if (openedGroups.value.includes(group.id)) {
      (group.children || []).forEach((child) => {
        items.push({
          id: child.id,
          type: "user",
          user: child.user,
          unread: child.unread,
        });
      });
    }
  });
  return items;
});

const virtualScrollRef = ref(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: flatItems.value.length,
    getScrollElement: () => virtualScrollRef.value,
    estimateSize: () => USER_ROW_HEIGHT,
    overscan: USERS_OVERSCAN,
    getItemKey: (index) => flatItems.value[index]?.id ?? index,
  }))
);

const virtualRows = computed(() =>
  rowVirtualizer.value
    .getVirtualItems()
    .map((row) => ({
      ...row,
      item: flatItems.value[row.index],
    }))
    .filter((row) => row.item)
);

const virtualTotalSize = computed(() => rowVirtualizer.value.getTotalSize());

watch(
  () => treeItems.value.map((g) => [g.id, g.count]),
  (items) => {
    const withUsers = items.filter(([, count]) => count > 0).map(([id]) => id);
    const validSet = new Set(items.map(([id]) => id));
    openedGroups.value = openedGroups.value.filter((id) => validSet.has(id));

    if (!initializedOpen.value) {
      openedGroups.value = defaultOpenedGroups(withUsers);
      initializedOpen.value = true;
    } else if (!manualOpened.value && !openedGroups.value.length) {
      openedGroups.value = defaultOpenedGroups(withUsers);
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => flatItems.value.length,
  () => {
    rowVirtualizer.value.measure();
  }
);

const isSelected = (u) =>
  props.selectedUserId && idStr(u) === String(props.selectedUserId);

const menuId = (u) => idStr(u);
const isActionMenuOpen = (u) => !!actionMenuById.value[menuId(u)];
function setActionMenuOpen(u, isOpen) {
  const id = menuId(u);
  if (!id) return;
  actionMenuById.value = {
    ...actionMenuById.value,
    [id]: !!isOpen,
  };
}
function toggleActionMenu(u) {
  const id = menuId(u);
  if (!id) return;
  const next = !actionMenuById.value[id];
  actionMenuById.value = { [id]: next };
}
function closeActionMenus() {
  actionMenuById.value = {};
}
function onActionMenuClick(action, u) {
  const id = menuId(u);
  if (id) {
    actionMenuById.value = {
      ...actionMenuById.value,
      [id]: false,
    };
  }
  if (action === "view-profile") {
    emit("view-profile", u);
    return;
  }
  if (action === "end-language-practice") {
    emit("end-language-practice", u);
    return;
  }
  if (action === "activate-language-practice") {
    emit("activate-language-practice", u);
    return;
  }
  if (action === "delete-chat") {
    emit("delete-chat", u);
  }
}

function onDocumentPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".actions")) return;
  closeActionMenus();
}

function onDocumentKeydown(event) {
  if (event.key === "Escape") {
    closeActionMenus();
  }
}

const isGroupOpen = (id) => openedGroups.value.includes(id);
function toggleGroup(id) {
  manualOpened.value = true;
  if (isGroupOpen(id)) {
    openedGroups.value = openedGroups.value.filter((gid) => gid !== id);
  } else {
    openedGroups.value = [...openedGroups.value, id];
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<style scoped>
.chat-users-container {
  height: 100%;
  background: transparent !important;
  display: flex;
  flex-direction: column;
  padding: 0.25rem;
}
.users-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-text {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #cbd5e1;
}
.header-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.24);
  color: #dbeafe;
  font-size: 12px;
  font-weight: 600;
}
.filter-trigger {
  display: flex;
  align-items: center;
}
.filter-trigger :deep(.filter-menu-trigger) {
  margin-bottom: 0;
}
.users-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding-top: 2px;
}
.users-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.users-virtual {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.users-virtual__inner {
  position: relative;
  width: 100%;
}

.users-virtual__item {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 0;
}

.users-virtual__item--menu-open {
  z-index: 80;
}

.users-empty-state {
  padding: 0.75rem;
  color: #cbd5e1 !important;
  font-size: 0.875rem;
}

.users-skeleton {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.users-skeleton-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.users-skeleton-avatar,
.users-skeleton-line {
  display: block;
  background: linear-gradient(90deg, rgba(51, 65, 85, 0.7), rgba(71, 85, 105, 0.95), rgba(51, 65, 85, 0.7));
  background-size: 200% 100%;
  animation: users-skeleton-pulse 1.6s ease-in-out infinite;
}

.users-skeleton-avatar {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.users-skeleton-lines {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.users-skeleton-line {
  height: 0.5rem;
  border-radius: 999px;
}

.users-skeleton-line--primary {
  width: 55%;
}

.users-skeleton-line--secondary {
  width: 32%;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
}

.group-caret {
  color: #94a3b8;
  font-size: 1rem;
}

.group-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-count {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.24);
  color: #dbeafe;
  font-size: 11px;
  font-weight: 700;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 4px;
  border-radius: 8px;
  cursor: pointer;
}

.user-row.selected {
  background: rgba(59, 130, 246, 0.24);
}

.avatar-wrap {
  position: relative;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-on-surface), 0.14);
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-weight: 600;
  font-size: 12px;
}

.avatar-shell {
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.88);
}

.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.presence-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 0.98);
}

.presence-dot.on {
  background: #20c997;
}

.presence-dot.away {
  background: #f59e0b;
}

.presence-dot.agent {
  background: #818cf8;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 0.98), 0 0 4px 1px rgba(129, 140, 248, 0.6);
}

.presence-dot.off {
  background: #bdbdbd;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  height: 14px;
  border-radius: 9999px;
  background: #ff3b30;
  color: #fff;
  font-size: 9px;
  line-height: 1;
}

.unread-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #fff;
  opacity: 0.9;
}

.unread-count {
  font-variant-numeric: tabular-nums;
}

.user-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.displayname {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flag-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.language-practice-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  appearance: none;
  border: 1px solid rgba(114, 230, 126, 0.45);
  border-radius: 999px;
  color: #72e67e;
  background: rgba(42, 96, 58, 0.1);
  cursor: pointer;
  line-height: 1;
}

.language-practice-marker i {
  font-size: 0.8125rem;
}

.language-practice-marker--chat {
  border-color: rgba(114, 230, 126, 0.9);
  background: rgba(114, 230, 126, 0.22);
  box-shadow: 0 0 0 1px rgba(114, 230, 126, 0.12);
}

.gender-icon {
  color: var(--chat-gender-color, rgba(var(--v-theme-on-surface), 0.65)) !important;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.actions {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.action-menu-btn {
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(148, 163, 184, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-menu-btn:hover {
  background: rgba(30, 41, 59, 0.45);
}

.action-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  min-width: 12rem;
  padding: 0.35rem;
  border-radius: 0.85rem;
  border: 1px solid rgb(var(--color-border) / 0.9);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface)),
    rgb(var(--color-surface) / 0.98)
  );
  box-shadow:
    0 18px 36px rgb(2 6 23 / 0.42),
    0 0 0 1px rgb(255 255 255 / 0.03);
  overflow: hidden;
  z-index: 30;
}

.action-menu__item {
  width: 100%;
  border: 0;
  border-radius: 0.65rem;
  background: transparent;
  color: rgb(var(--color-foreground));
  padding: 0.5rem 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-align: left;
  font-size: 0.85rem;
}

.action-menu__item:hover {
  background: rgb(var(--color-foreground) / 0.08);
}

.action-menu__item--danger {
  color: rgb(var(--color-danger));
}

.action-menu__icon {
  flex: 0 0 auto;
}

.flag {
  font-size: 14px;
}

@keyframes users-skeleton-pulse {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
