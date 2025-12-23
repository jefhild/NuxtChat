<template>
  <v-card flat class="chat-users-container pa-2 d-flex flex-column h-100">
    <div class="users-header px-3 py-2 mb-2">
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
      <v-chip
        v-if="showCount"
        size="small"
        :color="chipColor"
        variant="tonal"
        class="font-weight-medium"
      >
        {{ displayUsers.length }}
      </v-chip>
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
          <v-treeview
            v-else
            v-model:opened="openedGroups"
            v-model:activated="activatedNodes"
            :items="treeItems"
            item-title="title"
            item-value="id"
            item-children="children"
            density="compact"
            color="primary"
            open-on-click
            activatable
            fluid
            lines="two"
            :indent="2"
            :prepend-gap="0"
            class="user-treeview"
            @update:activated="handleActivated"
            @update:opened="handleOpened"
          >
            <template #prepend="{ item }">
              <div v-if="item.type !== 'group'" class="avatar-wrap">
                <v-avatar size="34">
                  <v-img
                    v-if="item.user.avatar_url"
                    :src="item.user.avatar_url"
                    cover
                  />
                  <span v-else class="avatar-fallback">
                    {{
                      (item.user.displayname || "?").slice(0, 1).toUpperCase()
                    }}
                  </span>
                </v-avatar>
                <span
                  class="presence-dot"
                  :class="item.user.online ? 'on' : 'off'"
                />
                <span v-if="item.unread > 0" class="unread-badge">
                  <span class="unread-dot"></span>
                  <span class="unread-count">{{ item.unread }}</span>
                </span>
              </div>
            </template>

            <template #title="{ item }">
              <div v-if="item.type === 'group'" class="group-title">
                <span class="group-label">{{ item.title }}</span>
                <v-chip
                  v-if="showCount"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="group-chip"
                >
                  {{ item.count }}
                </v-chip>
              </div>
              <div v-else class="user-title">
                <div class="displayname">
                  {{ item.user.displayname || "(no name)" }}
                </div>
                <div
                  v-if="!hideTagline && item.user.tagline"
                  class="tagline text-medium-emphasis"
                >
                  • {{ item.user.tagline?.slice(0, 35) }}
                </div>
              </div>
            </template>

            <template #append="{ item }">
              <template v-if="item.type !== 'group'">
                <span class="flag-wrap">
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
                          density="comfortable"
                          variant="text"
                          color="#1d3b58"
                          @click.stop
                        />
                      </template>
                      <v-list density="compact">
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
              </template>
            </template>
          </v-treeview>
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

const chipColor = computed(() => {
  switch (normalizedListType.value) {
    case "active":
      return "success";
    case "offline":
      return "gray";
    default:
      return "primary";
  }
});

const aiUsers = computed(() =>
  displayUsers.value.filter((u) => u.is_ai && !u.hidden)
);
const humanUsers = computed(() =>
  displayUsers.value.filter((u) => !u.is_ai && !u.hidden)
);

const openedGroups = ref([]);
const activatedNodes = ref([]);
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

const itemLookup = computed(() => {
  const map = new Map();
  treeItems.value.forEach((group) => {
    map.set(group.id, group);
    (group.children || []).forEach((child) => map.set(child.id, child));
  });
  return map;
});

watch(
  () => props.selectedUserId,
  (id) => {
    activatedNodes.value = id ? [String(id)] : [];
  },
  { immediate: true }
);

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

function handleActivated(values) {
  const incoming = Array.isArray(values) ? values : [];
  const userIds = incoming.filter(
    (id) => itemLookup.value.get(id)?.type === "user"
  );
  const lastId = userIds[userIds.length - 1] || null;
  activatedNodes.value = lastId ? [lastId] : [];
  if (!lastId) return;
  const node = itemLookup.value.get(lastId);
  if (node?.type === "user") emit("user-selected", node.user);
}

function handleOpened(val) {
  manualOpened.value = true;
  openedGroups.value = Array.isArray(val) ? val : [];
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
  border: 1px solid rgba(13, 37, 63, 0.08);
  border-radius: 10px;
  background: #f4f6f8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-text {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #5c677d;
}
.filter-trigger {
  display: flex;
  align-items: center;
}
.filter-trigger :deep(.v-btn) {
  color: #5c677d;
  font-size: 18px;
}
.users-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.users-content {
  flex: 1 1 auto;
  min-height: 0;
}

.user-treeview :deep(.v-list-item__content) {
  min-width: 0;
}

.user-treeview :deep(.v-list-item) {
  /* padding-left: 0 !important; */
  padding-right: 6px;
}

.user-treeview :deep(.v-treeview-node--group .v-list-item) {
  min-height: 28px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.user-treeview {
  margin-left: 0;
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  font-weight: 600;
  font-size: 12px;
  line-height: 1.1;
  color: blue;
}

.group-label {
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.group-chip {
  height: 22px;
  font-weight: 600;
}

.user-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.displayname {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tagline {
  margin-left: 6px;
  font-size: 12px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-wrap {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  overflow: visible;
  flex: 0 0 auto;
}

.avatar-wrap :is(.v-avatar, .v-avatar .v-img, img) {
  position: relative;
  z-index: 0;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #e0e0e0;
  color: #555;
  font-weight: 600;
}

.presence-dot {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 9px;
  height: 9px;
  border-radius: 9999px;
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
  right: -10px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  height: 16px;
  border-radius: 9999px;
  background: #ff3b30;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #fff;
  opacity: 0.9;
}

.unread-count {
  font-variant-numeric: tabular-nums;
}

.flag {
  font-size: 18px;
}

.actions {
  position: absolute;
  top: -20px;
  right: 1px;
  z-index: 2;
}

.flag-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  margin-left: 6px;
}
</style>
