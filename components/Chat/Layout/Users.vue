<template>
  <v-card flat class="chat-users-container pa-2">
    <v-tabs v-model="tab" grow>
      <v-tab v-if="tabVisibility.online" :value="0">
        {{ $t("components.users.online") }}
        <v-badge color="primary" :content="onlineUsers.length" inline />
      </v-tab>
      <v-tab v-if="tabVisibility.offline" :value="1">
        {{ $t("components.users.offline") }}
        <v-badge color="gray" :content="offlineUsers.length" inline />
      </v-tab>
      <v-tab v-if="tabVisibility.active" :value="2">
        {{ $t("components.users.active") }}
        <v-badge color="success" :content="activeUsers.length" inline />
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- Online -->
      <v-window-item v-if="tabVisibility.online" :value="0">
        <template v-if="isLoading">
          <v-skeleton-loader type="list-item@6" class="pa-2" />
        </template>
        <template v-else>
          <div
            v-if="!onlineUsers.length"
            class="pa-3 text-body-2 text-medium-emphasis"
          >
            {{ $t("components.users.no-anonymous") }}
          </div>
          <ChatLayoutUserList
            v-else
            :key="presenceVersion"
            :users="onlineUsers"
            :selectedUserId="selectedUserId"
            :height="420"
            :unread-by-peer="msgs.unreadByPeer"
            @user-selected="$emit('user-selected', $event)"
          />
        </template>
      </v-window-item>

      <!-- Offline -->
      <v-window-item v-if="tabVisibility.offline" :value="1">
        <template v-if="isLoading">
          <v-skeleton-loader type="list-item@6" class="pa-2" />
        </template>
        <template v-else>
          <div
            v-if="!offlineUsers.length"
            class="pa-3 text-body-2 text-medium-emphasis"
          >
            {{ $t("components.users.none-offline") }}
          </div>
          <ChatLayoutUserList
            v-else
            :key="presenceVersion"
            :users="offlineUsers"
            :selectedUserId="selectedUserId"
            :height="420"
            :unread-by-peer="msgs.unreadByPeer"
            @user-selected="$emit('user-selected', $event)"
          />
        </template>
      </v-window-item>

      <!-- Active -->
      <v-window-item v-if="tabVisibility.active" :value="2">
        <template v-if="isLoading">
          <v-skeleton-loader type="list-item@6" class="pa-2" />
        </template>
        <template v-else>
          <div
            v-if="!activeUsers.length"
            class="pa-3 text-body-2 text-medium-emphasis"
          >
            {{ $t("components.users.none-active") }}
          </div>
          <ChatLayoutUserList
            v-else
            :key="presenceVersion"
            :users="activeUsers"
            :selectedUserId="selectedUserId"
            :height="420"
            :unread-by-peer="msgs.unreadByPeer"
            @user-selected="$emit('user-selected', $event)"
          />
        </template>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup>
import { ref, computed } from "vue";
import { useMessagesStore } from "@/stores/messagesStore";
import { usePresenceStore2 } from "@/stores/presenceStore2";
const presence = usePresenceStore2();
const presenceVersion = computed(() => presence.onlineUserIds.join(","));

const msgs = useMessagesStore();

const tab = ref(0);
const props = defineProps({
  users: { type: Array, default: () => [] }, // expects { id/user_id, displayname, online }
  activeChats: { type: Array, default: () => [] },
  selectedUserId: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  pinnedId: {
    type: String,
    default: "a3962087-516b-48df-a3ff-3b070406d832", // ImChatty
  },
  tabVisibility: {
    type: Object,
    default: () => ({ online: true, offline: true, active: true }),
  },
});
defineEmits(["user-selected"]);

const idStr = (u) => String(u?.id ?? u?.user_id ?? "").trim();
const isPinned = (u) => props.pinnedId && idStr(u) === props.pinnedId;

const sortWithPin = (arr = []) => {
  return [...arr].sort((a, b) => {
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (a.displayname || "").localeCompare(b.displayname || "");
  });
};

const onlineUsers = computed(() =>
  sortWithPin(props.users.filter((u) => !!u.online && !u.hidden))
);
const offlineUsers = computed(() =>
  sortWithPin(props.users.filter((u) => !u.online && !u.hidden))
);

const activeSet = computed(
  () => new Set((props.activeChats || []).map(String))
);
const activeUsers = computed(() =>
  sortWithPin(props.users.filter((u) => activeSet.value.has(idStr(u))))
);

const visibleValues = computed(() => {
  const out = [];
  if (props.tabVisibility.online) out.push(0);
  if (props.tabVisibility.offline) out.push(1);
  if (props.tabVisibility.active) out.push(2);
  return out;
});

watch(
  [visibleValues, tab],
  () => {
    if (!visibleValues.value.includes(tab.value)) {
      tab.value = visibleValues.value[0] ?? 0; // default to first visible, or 0
    }
  },
  { immediate: true }
);
</script>
