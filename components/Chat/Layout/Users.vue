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
          @filter-changed="$emit('filter-changed', $event)"
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
          <ChatLayoutUserList
            v-else
            :key="presenceVersion"
            :users="displayUsers"
            :selectedUserId="selectedUserId"
            :unread-by-peer="msgs.unreadByPeer"
            :hide-tagline="normalizedListType === 'active'"
            @user-selected="$emit('user-selected', $event)"
          />
        </div>
      </template>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { useMessagesStore } from "@/stores/messagesStore";
import { usePresenceStore2 } from "@/stores/presenceStore2";
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
});
defineEmits(["user-selected", "filter-changed"]);

const msgs = useMessagesStore();
const presence = usePresenceStore2();
const presenceVersion = computed(() =>
  Array.isArray(presence.onlineUserIds) ? presence.onlineUserIds.join(",") : ""
);

const normalizedListType = computed(() =>
  ["online", "offline", "active"].includes(props.listType)
    ? props.listType
    : "online"
);

const idStr = (u) => String(u?.id ?? u?.user_id ?? "").trim();
const isPinned = (u) => props.pinnedId && idStr(u) === props.pinnedId;

const sortWithPin = (arr = []) =>
  [...arr].sort((a, b) => {
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (a.displayname || "").localeCompare(b.displayname || "");
  });

const onlineUsers = computed(() =>
  sortWithPin(props.users.filter((u) => !!u.online && !u.hidden))
);
const offlineUsers = computed(() =>
  sortWithPin(props.users.filter((u) => !u.online && !u.hidden))
);

const activeSet = computed(
  () => new Set((props.activeChats || []).map((id) => String(id)))
);
const activeUsers = computed(() =>
  sortWithPin(
    props.users.filter(
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
</style>
