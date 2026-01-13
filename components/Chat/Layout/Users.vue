<template>
  <v-card flat class="chat-users-container pa-2 d-flex flex-column h-100">
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
          @filter-changed="$emit('filter-changed', $event)"
          @update:showAi="$emit('update:showAi', $event)"
        />
      </div>
      <span v-if="showCount" class="header-count">
        {{ displayUsers.length }}
      </span>
    </div>

    <div class="users-section flex-grow-1 overflow-hidden min-h-0">
      <template v-if="isLoading">
        <v-skeleton-loader type="list-item@6" class="pa-2" />
      </template>
      <template v-else>
        <div class="users-content d-flex flex-column flex-grow-1 min-h-0">
          <div
            v-if="!displayUsers.length"
            class="pa-3 text-body-2 text-medium-emphasis"
          >
            {{ $t(emptyStateKey) }}
          </div>
          <v-virtual-scroll
            v-else
            class="users-virtual"
            :items="flatItems"
            :item-height="32"
            item-key="id"
          >
            <template #default="{ item }">
              <div
                v-if="item.type === 'group'"
                class="group-row"
                @click="toggleGroup(item.id)"
              >
                <v-icon size="16" class="group-caret">
                  {{ isGroupOpen(item.id) ? "mdi-chevron-down" : "mdi-chevron-right" }}
                </v-icon>
                <span class="group-label">{{ item.title }}</span>
                <span v-if="showCount" class="group-count">
                  {{ item.count }}
                </span>
              </div>
              <div
                v-else
                class="user-row"
                :class="{ selected: isSelected(item.user) }"
                @click="emit('user-selected', item.user)"
              >
                <span class="avatar-wrap">
                  <v-avatar size="26">
                    <v-img v-if="item.user.avatar_url" :src="item.user.avatar_url" cover />
                    <span v-else class="avatar-fallback">{{
                      (item.user.displayname || "?").slice(0, 1).toUpperCase()
                    }}</span>
                  </v-avatar>
                  <span
                    class="presence-dot"
                    :class="item.user.online ? 'on' : 'off'"
                  />
                  <span v-if="item.unread > 0" class="unread-badge">
                    <span class="unread-dot"></span>
                    <span class="unread-count">{{ item.unread }}</span>
                  </span>
                </span>
                <span class="user-title">
                  <v-tooltip
                    v-if="item.user.tagline"
                    :text="item.user.tagline"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <span v-bind="tooltipProps" class="displayname">
                        {{ item.user.displayname || "(no name)" }}
                      </span>
                    </template>
                  </v-tooltip>
                  <span v-else class="displayname">
                    {{ item.user.displayname || "(no name)" }}
                  </span>
                </span>
                <span class="flag-wrap">
                  <v-icon
                    v-if="item.user.gender_id === 1"
                    size="14"
                    class="gender-icon gender-male"
                  >
                    mdi-gender-male
                  </v-icon>
                  <v-icon
                    v-else-if="item.user.gender_id === 2"
                    size="14"
                    class="gender-icon gender-female"
                  >
                    mdi-gender-female
                  </v-icon>
                  <v-icon v-else size="14" class="gender-icon gender-other">
                    mdi-gender-non-binary
                  </v-icon>
                  <span class="flag" v-if="item.user.country_emoji">
                    {{ item.user.country_emoji }}
                  </span>
                  <div v-if="showActions" class="actions">
                    <v-menu location="end" offset="6">
                      <template #activator="{ props: menuProps }">
                        <v-btn
                          v-bind="menuProps"
                          icon="mdi-dots-horizontal"
                          size="x-small"
                          density="compact"
                          variant="text"
                          color="#1d3b58"
                          @click.stop
                        />
                      </template>
                      <v-list density="compact">
                        <v-list-item
                          value="view-profile"
                          :title="$t('components.activeChats.profile-title')"
                          prepend-icon="mdi-card-account-details-outline"
                          @click.stop="$emit('view-profile', item.user)"
                        />
                        <v-list-item
                          value="delete-chat"
                          :title="$t('components.activeChats.delete-title')"
                          prepend-icon="mdi-trash-can-outline"
                          @click.stop="$emit('delete-chat', item.user)"
                        />
                      </v-list>
                    </v-menu>
                  </div>
                </span>
              </div>
            </template>
          </v-virtual-scroll>
        </div>
      </template>
    </div>
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMessagesStore } from "@/stores/messagesStore";
import ChatLayoutFilterMenu from "./FilterMenu.vue";

const props = defineProps({
  users: { type: Array, default: () => [] }, // expects { id/user_id, displayname, online }
  activeChats: { type: Array, default: () => [] },
  selectedUserId: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  pinnedId: {
    type: String,
    default: "a3962087-516b-48df-a3ff-3b070406d832", // ImChatty
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
});
const emit = defineEmits([
  "user-selected",
  "filter-changed",
  "update:showAi",
  "delete-chat",
  "view-profile",
]);

const msgs = useMessagesStore();
const { t } = useI18n();

const normalizedListType = computed(() =>
  ["online", "offline", "active"].includes(props.listType)
    ? props.listType
    : "online"
);

const idStr = (u) => String(u?.id ?? u?.user_id ?? "").trim();
const isPinned = (u) => props.pinnedId && idStr(u) === props.pinnedId;
const unreadFor = (u) => msgs.unreadByPeer?.[idStr(u)] || 0;

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

const filteredUsers = computed(() =>
  (props.users || []).filter((u) => !isInactiveAi(u))
);

const sortWithPin = (arr = []) =>
  [...arr].sort((a, b) => {
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (a.displayname || "").localeCompare(b.displayname || "");
  });

const onlineUsers = computed(() =>
  sortWithPin(filteredUsers.value.filter((u) => !!u.online && !u.hidden))
);
const offlineUsers = computed(() =>
  sortWithPin(filteredUsers.value.filter((u) => !u.online && !u.hidden))
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
  switch (normalizedListType.value) {
    case "active":
      return activeUsers.value;
    case "offline":
      return offlineUsers.value;
    default:
      return onlineUsers.value;
  }
});

const hideTagline = computed(() => normalizedListType.value === "active");
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

const aiUsers = computed(() =>
  displayUsers.value.filter((u) => u.is_ai && !u.hidden)
);
const humanUsers = computed(() =>
  displayUsers.value.filter((u) => !u.is_ai && !u.hidden)
);

const openedGroups = ref([]);
const initializedOpen = ref(false);
const manualOpened = ref(false);
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

watch(
  () => treeItems.value.map((g) => [g.id, g.count]),
  (items) => {
    const withUsers = items.filter(([, count]) => count > 0).map(([id]) => id);
    const validSet = new Set(items.map(([id]) => id));
    openedGroups.value = openedGroups.value.filter((id) => validSet.has(id));

    if (!initializedOpen.value) {
      openedGroups.value = withUsers;
      initializedOpen.value = true;
    } else if (!manualOpened.value && !openedGroups.value.length) {
      openedGroups.value = withUsers;
    }
  },
  { immediate: true, deep: true }
);

const isSelected = (u) =>
  props.selectedUserId && idStr(u) === String(props.selectedUserId);
const isGroupOpen = (id) => openedGroups.value.includes(id);
function toggleGroup(id) {
  manualOpened.value = true;
  if (isGroupOpen(id)) {
    openedGroups.value = openedGroups.value.filter((gid) => gid !== id);
  } else {
    openedGroups.value = [...openedGroups.value, id];
  }
}
</script>

<style scoped>
.chat-users-container {
  height: 100%;
}
.users-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  border-bottom: 1px solid rgba(13, 37, 63, 0.08);
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
  color: #5c677d;
}
.header-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.12);
  color: #1a5fb4;
  font-size: 12px;
  font-weight: 600;
}
.filter-trigger {
  display: flex;
  align-items: center;
}
.filter-trigger :deep(.v-btn) {
  color: #5c677d;
  font-size: 16px;
  min-height: 26px;
  height: 26px;
  width: 26px;
  padding: 0;
  margin-bottom: 0 !important;
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
  min-height: 0;
}

.users-virtual {
  flex: 1 1 auto;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px;
  color: #1a3b7a;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
}

.group-caret {
  color: rgba(26, 59, 122, 0.7);
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
  background: rgba(25, 118, 210, 0.12);
  color: #1a5fb4;
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
  background: rgba(25, 118, 210, 0.08);
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
  background: #e0e0e0;
  color: #555;
  font-weight: 600;
  font-size: 12px;
}

.presence-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px #fff;
}

.presence-dot.on {
  background: #20c997;
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
  color: #1a1f36;
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

.gender-icon {
  color: rgba(26, 31, 54, 0.6);
}

.gender-male {
  color: #1e88e5;
}

.gender-female {
  color: #ec407a;
}

.gender-other {
  color: #8e24aa;
}

.actions {
  display: inline-flex;
  align-items: center;
}

.flag {
  font-size: 14px;
}
</style>
