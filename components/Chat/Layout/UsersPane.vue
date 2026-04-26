<template>
  <div
    :id="paneId || undefined"
    :class="[
      'chat-pane-card flex min-h-0 flex-grow flex-col',
      cardClass,
    ]"
  >
    <div
      ref="scrollRef"
      :class="['flex-grow-1 overflow-auto min-h-0 users-scroll', scrollClass]"
      style="flex: 1 1 0"
    >
      <ChatLayoutUsers
        v-if="listVisible"
        :list-type="listType"
        :users="users"
        :pinned-id="pinnedId"
        :active-chats="activeChats"
        :language-practice-chat-ids="languagePracticeChatIds"
        :selected-user-id="selectedUserId"
        :is-loading="isLoading"
        :user-profile="userProfile"
        :auth-status="authStatus"
        :disable-filter-toggle="disableFilterToggle"
        :show-filters="showFilters"
        :show-ai="showAi"
        :show-language-practice-ai="showLanguagePracticeAi"
        :suppress-match-strip="suppressMatchStrip"
        @user-selected="$emit('user-selected', $event)"
        @filter-changed="$emit('filter-changed', $event)"
        @delete-chat="$emit('delete-chat', $event)"
        @activate-language-practice="$emit('activate-language-practice', $event)"
        @end-language-practice="$emit('end-language-practice', $event)"
        @view-profile="$emit('view-profile', $event)"
        @update:show-ai="$emit('update:show-ai', $event)"
        @update:show-language-practice-ai="$emit('update:show-language-practice-ai', $event)"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  paneId: { type: String, default: "" },
  cardClass: { type: String, default: "" },
  scrollClass: { type: String, default: "" },
  listVisible: { type: Boolean, default: true },
  listType: { type: String, required: true },
  users: { type: Array, default: () => [] },
  pinnedId: { type: String, default: "" },
  activeChats: { type: Array, default: () => [] },
  languagePracticeChatIds: { type: Array, default: () => [] },
  selectedUserId: { type: String, default: null },
  isLoading: { type: Boolean, default: false },
  userProfile: { type: Object, default: null },
  authStatus: { type: String, default: "" },
  disableFilterToggle: { type: Boolean, default: false },
  showFilters: { type: Boolean, default: true },
  showAi: { type: Boolean, default: true },
  showLanguagePracticeAi: { type: Boolean, default: false },
  suppressMatchStrip: { type: Boolean, default: false },
});

defineEmits([
  "user-selected",
  "filter-changed",
  "delete-chat",
  "activate-language-practice",
  "end-language-practice",
  "view-profile",
  "update:show-ai",
  "update:show-language-practice-ai",
]);

const scrollRef = ref(null);

defineExpose({
  scrollRef,
});
</script>
