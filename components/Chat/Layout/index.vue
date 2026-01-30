<template>
  <div class="chat-layout-root d-flex flex-column h-100 min-h-0">
    <v-container fluid class="d-flex flex-column h-100 min-h-0">
      <!-- Mobile controls: left drawer (Topics) + right drawer (Participants) -->
      <div
        class="d-md-none d-flex align-center justify-space-between px-2 py-2 chat-mobile-controls"
      >
        <v-btn
          icon
          variant="text"
          :class="{ 'chat-mobile-toggle--alert': showMobileUnreadAlert }"
          @click="leftOpen = true"
          aria-label="Show online participants"
        >
          <v-icon color="green-darken-2">mdi-account-multiple-outline</v-icon>
        </v-btn>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          :class="{ 'chat-mobile-toggle--alert': showMobileActiveAlert }"
          @click="rightOpen = true"
          aria-label="Show active chat participants"
        >
          <v-icon>mdi-chat-processing-outline</v-icon>
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
            <div v-if="consentPanelVisible" class="d-none d-md-block mt-2">
              <ChatLayoutConsentPanel
                :auth-status="auth.authStatus"
                :user-profile="userProfile"
                :show-close="auth.authStatus === 'authenticated'"
                @action="onConsentAction"
                @close="onConsentClose"
              />
            </div>
          </ClientOnly>
        </v-col>

        <!-- CENTER: Thread messages -->
        <v-col
          cols="12"
          :md="activePanelOpen ? 7 : 9"
          class="pa-2 d-flex flex-column overflow-hidden min-h-0 relative"
        >
          <div class="active-panel-rail">
            <v-tooltip text="Active chats" location="left">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  size="x-small"
                  class="active-panel-toggle"
                  :class="{ 'active-panel-toggle--alert': showActivePanelAlert }"
                  :aria-expanded="String(activePanelOpen)"
                  aria-controls="active-panel"
                  aria-label="Toggle active chats panel"
                  @click="activePanelOpen = !activePanelOpen"
                >
                  <v-icon
                    :icon="
                      activePanelOpen ? 'mdi-chevron-right' : 'mdi-chevron-left'
                    "
                  />
                </v-btn>
              </template>
            </v-tooltip>
          </div>
          <!-- Sticky header -->
          <div class="messages-sticky-header d-none d-md-block">
            <button
              class="profile-header profile-header-toggle px-4 py-3 d-flex align-center justify-space-between"
              type="button"
              :disabled="!selectedUser"
              :aria-expanded="String(panelOpen)"
              aria-controls="thread-info-panel"
              @click="panelOpen = !panelOpen"
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
                  <div
                    :class="[
                      'profile-header-title text-subtitle-1 font-weight-medium',
                      { 'text-truncate': smAndDown },
                    ]"
                  >
                    {{ selectedUserTitle }}
                  </div>
                  <div
                    :class="[
                      'profile-header-subtitle text-body-2 text-medium-emphasis',
                      { 'text-truncate': smAndDown },
                    ]"
                  >
                    {{ selectedUserSubtitle }}
                  </div>
                </div>
              </div>

              <div class="d-flex align-center profile-header-actions">
                <v-chip
                  v-if="selectedUser"
                  size="small"
                  :color="selectedUserPresenceColor"
                  variant="flat"
                  class="font-weight-medium mr-2"
                >
                  <v-icon size="14" class="mr-1">
                    {{ selectedUserPresenceIcon }}
                  </v-icon>
                  {{ selectedUserPresenceLabel }}
                </v-chip>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  :disabled="!selectedUser"
                  :aria-expanded="String(panelOpen)"
                  aria-controls="thread-info-panel"
                  @click.stop="panelOpen = !panelOpen"
                >
                  <v-icon
                    :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  />
                </v-btn>
              </div>
            </button>
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
                    v-if="selectedUserLocalized.tagline"
                    class="text-body-1 font-italic mb-3 text-truncate"
                    :title="selectedUserLocalized.tagline"
                  >
                    "{{ selectedUserLocalized.tagline }}"
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
                      <v-icon
                        size="18"
                        class="mr-2 meta-icon"
                        :class="item.color ? '' : 'text-medium-emphasis'"
                        :style="item.color ? { color: item.color } : undefined"
                      >
                        {{ item.icon }}
                      </v-icon>
                      <span class="text-medium-emphasis mr-1">
                        {{ item.label }}:
                      </span>
                      <span class="text-truncate">{{ item.value }}</span>
                    </div>
                  </div>

                  <div
                    v-if="selectedUserLocalized.bio"
                    class="profile-bio text-body-2 text-medium-emphasis mb-3"
                  >
                    {{ selectedUserLocalized.bio }}
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

                  <div class="d-flex align-center flex-wrap gap-2">
                    <v-btn
                      v-if="selectedUser"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-account-box-outline"
                      @click="openProfileDialog(selectedUser)"
                    >
                      View full profile
                    </v-btn>
                    <div class="d-flex align-center gap-2 ml-auto">
                      <v-tooltip
                        :text="t('components.chatheader.favorite-profile')"
                        location="top"
                      >
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <ButtonFavorite :profile="selectedUser" />
                          </span>
                        </template>
                      </v-tooltip>
                      <v-tooltip :text="blockTooltip" location="top">
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <v-btn
                              :color="
                                isSelectedUserBlocked
                                  ? 'red darken-2'
                                  : 'blue medium-emphasis'
                              "
                              icon="mdi-cancel"
                              size="small"
                              variant="text"
                              :disabled="isBlockDisabled"
                              aria-label="Block user"
                              @click="toggleBlockSelectedUser"
                            ></v-btn>
                          </span>
                        </template>
                      </v-tooltip>
                      <v-tooltip
                        :text="t('components.chatheader.share-profile')"
                        location="top"
                      >
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <v-btn
                              color="black medium-emphasis"
                              icon="mdi-share-variant"
                              size="small"
                              variant="text"
                              :disabled="!profileLink"
                              aria-label="Share profile"
                              @click="shareProfile"
                            ></v-btn>
                          </span>
                        </template>
                      </v-tooltip>
                    </div>
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
            @scroll.passive="onMobileScroll"
            @touchstart.passive="onMobileTouchStart"
            @touchmove.passive="onMobileTouchMove"
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
              :blocked-user-ids="blockedUsers"
            />
          </div>

          <!-- Composer -->
          <div class="border-t pt-2" style="flex: 0 0 auto">
            <v-alert
              v-if="isSelectedUserBlocked"
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mb-2"
            >
              {{ t("components.message.composer.blocked") }}
            </v-alert>
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              :blocked-user-ids="blockedUsers"
              class="w-100 mx-auto"
              @send="onSend"
            />
          </div>
        </v-col>

        <!-- RIGHT: Participants -->
        <v-col
          v-if="activePanelOpen"
          cols="12"
          md="2"
          class="pa-2 d-flex flex-column overflow-hidden d-none d-md-flex min-h-0"
        >
          <v-card
            id="active-panel"
            flat
            class="d-flex flex-column flex-grow-1 min-h-0 active-panel-card"
          >
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
                @delete-chat="openDeleteDialog"
                @view-profile="openProfileDialog"
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
          <button
            class="messages-sticky-header messages-sticky-header-button d-flex d-md-none px-3 py-2 align-center justify-space-between"
            type="button"
            :disabled="!selectedUser"
            :aria-expanded="String(panelOpen)"
            aria-controls="thread-info-panel"
            @click="panelOpen = !panelOpen"
          >
            <div class="d-flex align-center mobile-profile-left">
              <div class="mobile-avatar-wrap">
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
                <v-icon
                  v-if="selectedUser"
                  size="14"
                  class="mobile-gender-icon"
                  :class="{
                    'is-male': selectedUser?.gender_id === 1,
                    'is-female': selectedUser?.gender_id === 2,
                    'is-other':
                      selectedUser?.gender_id !== 1 &&
                      selectedUser?.gender_id !== 2,
                  }"
                >
                  {{
                    selectedUser?.gender_id === 1
                      ? "mdi-gender-male"
                      : selectedUser?.gender_id === 2
                      ? "mdi-gender-female"
                      : "mdi-gender-non-binary"
                  }}
                </v-icon>
              </div>
              <div class="min-w-0 ml-2 mobile-profile-info">
                <div
                  :class="[
                    'text-subtitle-2 font-weight-medium',
                    { 'text-truncate': smAndDown },
                  ]"
                >
                  {{ selectedUserTitle }}
                </div>
                <div class="text-body-2 text-medium-emphasis mobile-profile-subtitle">
                  {{ selectedUserSubtitle }}
                </div>
              </div>
            </div>

            <v-chip
              v-if="selectedUser"
              size="x-small"
              :color="selectedUserPresenceColor"
              variant="flat"
              class="font-weight-medium mobile-presence-pill"
            >
              <v-icon size="12" class="mr-1">
                {{ selectedUserPresenceIcon }}
              </v-icon>
              {{ selectedUserPresenceLabel }}
            </v-chip>

            <v-btn
              icon
              variant="text"
              :disabled="!selectedUser"
              :aria-expanded="String(panelOpen)"
              aria-controls="thread-info-panel"
              @click.stop="panelOpen = !panelOpen"
            >
              <v-icon
                :icon="panelOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              />
            </v-btn>
          </button>
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
                    v-if="selectedUserLocalized.tagline"
                    :class="[
                      'text-body-1 font-italic mb-3',
                      { 'text-truncate': smAndDown },
                    ]"
                    :title="selectedUserLocalized.tagline"
                  >
                    "{{ selectedUserLocalized.tagline }}"
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
                      <v-icon
                        size="18"
                        class="mr-2 meta-icon"
                        :class="item.color ? '' : 'text-medium-emphasis'"
                        :style="item.color ? { color: item.color } : undefined"
                      >
                        {{ item.icon }}
                      </v-icon>
                      <span class="text-medium-emphasis mr-1">
                        {{ item.label }}:
                      </span>
                      <span :class="{ 'text-truncate': smAndDown }">
                        {{ item.value }}
                      </span>
                    </div>
                  </div>

                  <div
                    v-if="selectedUserLocalized.bio"
                    class="profile-bio text-body-2 text-medium-emphasis mb-3"
                  >
                    {{ selectedUserLocalized.bio }}
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

                  <div class="d-flex align-center flex-wrap gap-2">
                    <v-btn
                      v-if="selectedUser"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-account-box-outline"
                      @click="openProfileDialog(selectedUser)"
                    >
                      View full profile
                    </v-btn>
                    <div class="d-flex align-center gap-2 ml-auto">
                      <v-tooltip
                        :text="t('components.chatheader.favorite-profile')"
                        location="top"
                      >
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <ButtonFavorite :profile="selectedUser" />
                          </span>
                        </template>
                      </v-tooltip>
                      <v-tooltip :text="blockTooltip" location="top">
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <v-btn
                              :color="
                                isSelectedUserBlocked
                                  ? 'red darken-2'
                                  : 'blue medium-emphasis'
                              "
                              icon="mdi-cancel"
                              size="small"
                              variant="text"
                              :disabled="isBlockDisabled"
                              aria-label="Block user"
                              @click="toggleBlockSelectedUser"
                            ></v-btn>
                          </span>
                        </template>
                      </v-tooltip>
                      <v-tooltip
                        :text="t('components.chatheader.share-profile')"
                        location="top"
                      >
                        <template #activator="{ props }">
                          <span v-bind="props">
                            <v-btn
                              color="black medium-emphasis"
                              icon="mdi-share-variant"
                              size="small"
                              variant="text"
                              :disabled="!profileLink"
                              aria-label="Share profile"
                              @click="shareProfile"
                            ></v-btn>
                          </span>
                        </template>
                      </v-tooltip>
                    </div>
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
              :blocked-user-ids="blockedUsers"
            />
          </div>

          <div class="border-t pt-2" style="flex: 0 0 auto">
            <v-alert
              v-if="isSelectedUserBlocked"
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mb-2"
            >
              {{ t("components.message.composer.blocked") }}
            </v-alert>
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              :blocked-user-ids="blockedUsers"
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
      class="d-md-none chat-mobile-drawer"
      width="320"
      :mobile="isMobileDrawer"
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
      class="d-md-none chat-mobile-drawer"
      width="300"
      :mobile="isMobileDrawer"
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
              @delete-chat="openDeleteDialog"
              @view-profile="openProfileDialog"
              @update:showAi="showAIUsers = $event"
            />
          </div>
        </v-card>
      </div>
    </v-navigation-drawer>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">
          {{ $t("components.activeChats.delete-title") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            {{ deletePrompt }}
          </div>
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            density="comfortable"
            class="mb-2"
          >
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deletingChat"
            @click="closeDeleteDialog"
          >
            {{ $t("components.activeChats.cancel") }}
          </v-btn>
          <v-btn
            color="red"
            variant="flat"
            :loading="deletingChat"
            @click="confirmDeleteChat"
          >
            {{ $t("components.activeChats.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="translationPromptOpen" max-width="460">
      <v-card>
        <v-card-title class="text-h6">
          {{ t("components.chatTranslation.promptTitle") }}
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            {{ translationPromptBody }}
          </div>
          <div class="text-caption text-medium-emphasis mb-2">
            {{ t("components.chatTranslation.promptHint") }}
          </div>
          <v-list density="compact" class="translation-choice-list">
            <v-list-item
              link
              @click="applyTranslationChoice('once')"
            >
              <v-list-item-title>
                {{ t("components.chatTranslation.optionOnce") }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ t("components.chatTranslation.optionOnceDesc") }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item
              link
              @click="applyTranslationChoice('always')"
            >
              <v-list-item-title>
                {{ t("components.chatTranslation.optionAlways") }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ t("components.chatTranslation.optionAlwaysDesc") }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item
              link
              @click="applyTranslationChoice('never')"
            >
              <v-list-item-title>
                {{ t("components.chatTranslation.optionNever") }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ t("components.chatTranslation.optionNeverDesc") }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="translationPromptOpen = false">
            {{ t("components.chatTranslation.optionNotNow") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="shareToast"
      :timeout="2500"
      color="primary"
      location="top"
    >
      {{ t("components.chatheader.profile-copied") }}
    </v-snackbar>

    <ProfileDialog
      v-model="isProfileDialogOpen"
      :slug="profileDialogSlug"
      :user-id="profileDialogUserId"
    />
  </div>
</template>

<script setup>
import {
  ref,
  unref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useMessagesStore } from "@/stores/messagesStore";
import { useChatStore } from "@/stores/chatStore";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { usePresenceStore2 } from "@/stores/presenceStore2"; // the minimal presence we made
import { useOnboardingAi } from "~/composables/useOnboardingAi";
import { useBlockedUsers } from "@/composables/useBlockedUsers";
import { useDisplay } from "vuetify";
import { useDb } from "@/composables/useDB";
import { useLocalePath } from "#imports";
import { useAiQuota } from "~/composables/useAiQuota";
import { useTabFilters } from "@/composables/useTabFilters";
import { useI18n } from "vue-i18n";
import { useFooterVisibility } from "~/composables/useFooterVisibility";
import ProfileDialog from "@/components/ProfileDialog.vue";
import {
  resolveProfileLocalization,
  normalizeLocale,
} from "@/composables/useProfileLocalization";

const auth = useAuthStore();
const chat = useChatStore();
const msgs = useMessagesStore();
const draft = useOnboardingDraftStore();
const draftStore = draft; // alias for template
const presence2 = usePresenceStore2();
const { blockedUsers, loadBlockedUsers } = useBlockedUsers();
const recentActiveIds = ref([]);
const recentActiveLoading = ref(false);
let recentActiveTimer = null;
const RECENT_ACTIVE_MINUTES = 10;
const RECENT_ACTIVE_POLL_MS = 5 * 60 * 1000;

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const { smAndDown } = useDisplay();
const hasMounted = ref(false);
const {
  createScrollHandler: createFooterScrollHandler,
  setTouchStart: setFooterTouchStart,
  handleTouchMove: handleFooterTouchMove,
  showFooter: showAppFooter,
} = useFooterVisibility();
const {
  getClient,
  getActiveChats,
  insertMessage,
  deleteChatWithUser,
  insertBlockedUser,
  unblockUser,
  getProfileTranslations,
  getUserProfileFunctionFromId,
  getTranslationPreference,
  upsertTranslationPreference,
} = useDb();
const supabase = getClient();

const onbRef = ref(null);
const filtersVisible = ref(true);

const leftOpen = ref(false);
const rightOpen = ref(false);
const activePanelOpen = ref(false);
const panelOpen = ref(false);
const autoCloseOnScroll = false;
const isProfileDialogOpen = ref(false);
const profileDialogUserId = ref(null);
const profileDialogSlug = ref(null);
const showConsentPanelAuth = ref(true);
const CONSENT_PANEL_HIDE_PREFIX = "consentPanelHidden:";
const footerScroll = createFooterScrollHandler("chat-mobile");
const consentAutoHideTimer = ref(null);
const translationPromptOpen = ref(false);
const translationPref = ref(null);
const translationPrefLoading = ref(false);
const pendingSendText = ref("");
const pendingTranslatePeerId = ref(null);

const localePath = useLocalePath();
const { tryConsume, limitReachedMessage } = useAiQuota();

const openProfileDialog = (user) => {
  profileDialogUserId.value = user?.user_id || user?.id || null;
  profileDialogSlug.value = user?.slug || null;
  isProfileDialogOpen.value = true;
};

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
const consentPanelVisible = computed(() =>
  auth.authStatus === "authenticated" ? showConsentPanelAuth.value : true
);
const isMobileDrawer = computed(() => hasMounted.value && smAndDown.value);

function loadConsentPanelPref(userId) {
  if (!import.meta.client || !userId) return;
  try {
    const raw = localStorage.getItem(`${CONSENT_PANEL_HIDE_PREFIX}${userId}`);
    showConsentPanelAuth.value = raw === "hidden" ? false : true;
  } catch {
    showConsentPanelAuth.value = true;
  }
}

function saveConsentPanelPref(userId, hidden) {
  if (!import.meta.client || !userId) return;
  try {
    const key = `${CONSENT_PANEL_HIDE_PREFIX}${userId}`;
    if (hidden) localStorage.setItem(key, "hidden");
    else localStorage.removeItem(key);
  } catch {}
}

function scheduleConsentAutoHide() {
  if (!import.meta.client) return;
  if (consentAutoHideTimer.value) {
    clearTimeout(consentAutoHideTimer.value);
    consentAutoHideTimer.value = null;
  }
  if (auth.authStatus !== "authenticated") return;
  if (!showConsentPanelAuth.value) return;
  consentAutoHideTimer.value = setTimeout(() => {
    onConsentClose();
  }, 3500);
}

const onMobileScroll = (event) => {
  if (!smAndDown.value) return;
  if (panelOpen.value && autoCloseOnScroll) {
    panelOpen.value = false;
  }
  const target = event?.target;
  const nextY =
    target && typeof target.scrollTop === "number" ? target.scrollTop : 0;
  footerScroll(nextY);
};

const onMobileTouchStart = (event) => {
  if (!smAndDown.value) return;
  const t = event.touches?.[0];
  if (!t) return;
  setFooterTouchStart("chat-mobile", t.clientY);
};

const onMobileTouchMove = (event) => {
  if (!smAndDown.value) return;
  const t = event.touches?.[0];
  if (!t) return;
  handleFooterTouchMove("chat-mobile", t.clientY);
};

onMounted(() => {
  hasMounted.value = true;
  // ensure drawers don't render mobile server-side then stay off on desktop
  if (!smAndDown.value) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
  scheduleConsentAutoHide();
});

onMounted(() => {
  fetchRecentActiveIds();
  recentActiveTimer = window.setInterval(
    fetchRecentActiveIds,
    RECENT_ACTIVE_POLL_MS
  );
});

watch(
  () => auth.authStatus,
  (s) => {
    if (s !== "authenticated") {
      showConsentPanelAuth.value = true; // always show for non-auth flows
      if (consentAutoHideTimer.value) {
        clearTimeout(consentAutoHideTimer.value);
        consentAutoHideTimer.value = null;
      }
      return;
    }
    loadConsentPanelPref(auth.user?.id || null);
    scheduleConsentAutoHide();
  },
  { immediate: true }
);

watch(
  () => auth.user?.id,
  (uid) => {
    if (auth.authStatus === "authenticated") {
      loadConsentPanelPref(uid || null);
      scheduleConsentAutoHide();
    }
  }
);

watch(
  () => showConsentPanelAuth.value,
  () => {
    scheduleConsentAutoHide();
  }
);

// ---- Basic UI state
const messageDraft = ref("");
// const replyingToMessage = ref(null)
const regRef = ref(null);
const isLoading = ref(false);
const isTabVisible = ref(true);
const showAIUsers = ref(true);
const activeChats = ref([]);
const replyingToMessage = ref(null); // { id, content } | null
const deleteDialog = ref(false);
const deleteTarget = ref(null);
const deleteError = ref("");
const deletingChat = ref(false);
const isBlocking = ref(false);
const shareToast = ref(false);
const hasUnreadActiveChats = computed(() => {
  const unread = msgs.unreadByPeer || {};
  return (Array.isArray(activeChats.value) ? activeChats.value : []).some(
    (id) => (unread[String(id)] || 0) > 0
  );
});
const unreadCount = computed(() => msgs.totalUnread || 0);
const showActivePanelAlert = computed(
  () => hasUnreadActiveChats.value && !activePanelOpen.value
);
const showMobileActiveAlert = computed(
  () => hasUnreadActiveChats.value && !rightOpen.value
);
const showMobileUnreadAlert = computed(
  () => unreadCount.value > 0 && !leftOpen.value
);
const clearReply = () => {
  replyingToMessage.value = null;
};
// keep primitive since your realtime is working with it
const meId = auth.user?.id;

const fetchRecentActiveIds = async () => {
  if (recentActiveLoading.value) return;
  recentActiveLoading.value = true;
  try {
    const res = await $fetch("/api/presence/recent", {
      query: { minutes: RECENT_ACTIVE_MINUTES },
    });
    recentActiveIds.value = Array.isArray(res?.ids) ? res.ids : [];
  } catch (error) {
    console.warn("[presence][recent] fetch error", error);
  } finally {
    recentActiveLoading.value = false;
  }
};

const realtimeIds = computed(() => {
  const storeIds = Array.isArray(presence2.onlineUserIds)
    ? presence2.onlineUserIds
    : [];

  const presenceIds = storeIds.length
    ? storeIds
    : Object.keys(presence2?.channel?.presenceState?.() || {}).filter(
        (k) => !String(k).startsWith("observer:")
      );

  return presenceIds.map((s) => String(s).trim().toLowerCase());
});

const recentActiveNormalized = computed(() =>
  (Array.isArray(recentActiveIds.value) ? recentActiveIds.value : []).map((s) =>
    String(s).trim().toLowerCase()
  )
);

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

const isSelectedUserBlocked = computed(() => {
  const selectedId = selectedUserId.value;
  if (!selectedId) return false;
  return blockedUsers.value.some(
    (blockedId) => String(blockedId) === String(selectedId)
  );
});

const isSelfSelected = computed(() => {
  const userId = auth.user?.id;
  const selectedId = selectedUserId.value;
  if (!userId || !selectedId) return false;
  return String(userId) === String(selectedId);
});

const isBlockDisabled = computed(
  () => isBlocking.value || !selectedUserId.value || isSelfSelected.value
);

const blockTooltip = computed(() =>
  isSelectedUserBlocked.value
    ? t("components.chatheader.unblock-user")
    : t("components.chatheader.block-user")
);

const toggleBlockSelectedUser = async () => {
  const userId = auth.user?.id;
  const blockedUserId = selectedUserId.value;
  if (!userId || !blockedUserId) {
    if (!userId) {
      router.push(localePath("/signin"));
    }
    return;
  }
  if (isBlockDisabled.value) return;
  isBlocking.value = true;
  try {
    if (isSelectedUserBlocked.value) {
      const result = await unblockUser(userId, blockedUserId);
      if (result?.error) return;
      blockedUsers.value = blockedUsers.value.filter(
        (id) => String(id) !== String(blockedUserId)
      );
    } else {
      const error = await insertBlockedUser(userId, blockedUserId);
      if (error) return;
      if (
        !blockedUsers.value.some(
          (id) => String(id) === String(blockedUserId)
        )
      ) {
        blockedUsers.value = [...blockedUsers.value, blockedUserId];
      }
    }
  } finally {
    isBlocking.value = false;
  }
};

const shareProfile = async () => {
  if (!profileLink.value || typeof window === "undefined") return;
  const url = new URL(profileLink.value, window.location.origin).toString();
  let copied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      copied = true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      copied = true;
    }
  } catch (error) {
    console.warn("[chat][share] copy failed", error);
  } finally {
    if (copied) {
      shareToast.value = true;
    }
  }
};

const selectedUserInitial = computed(() => {
  const name = selectedUserLocalized.value.displayname || "";
  const trimmed = name.trim();
  if (trimmed.length) return trimmed[0].toUpperCase();
  return "?";
});

const deleteTargetName = computed(() => {
  if (!deleteTarget.value) return t("components.activeChats.unknown-user");
  const localized = resolveProfileLocalization({
    profile: deleteTarget.value,
    readerLocale: locale?.value,
  });
  return localized.displayname || deleteTarget.value?.displayname || t("components.activeChats.unknown-user");
});
const deletePrompt = computed(() =>
  t("components.activeChats.delete-with-user", { name: deleteTargetName.value })
);

const selectedUserTranslations = ref([]);
const selectedUserPhotoCount = ref(0);
const selectedUserWithTranslations = computed(() => {
  if (!selectedUser.value) return null;
  return {
    ...selectedUser.value,
    profile_translations: selectedUserTranslations.value,
  };
});

const selectedUserLocalized = computed(() =>
  resolveProfileLocalization({
    profile: selectedUserWithTranslations.value,
    readerLocale: locale?.value,
    taglineMaxLength: 0,
  })
);

const selectedUserTitle = computed(() => {
  const user = selectedUser.value;
  if (!user) return "Select a user to start chatting";
  const parts = [];
  if (selectedUserLocalized.value.displayname)
    parts.push(String(selectedUserLocalized.value.displayname));
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
  if (selectedUserLocalized.value.tagline)
    return String(selectedUserLocalized.value.tagline);
  if (selectedUserLocation.value) return selectedUserLocation.value;
  if (selectedUserLocalized.value.bio || user.bio) {
    return String(selectedUserLocalized.value.bio || user.bio).trim();
  }
  return "No additional details yet.";
});

const loadSelectedUserTranslations = async (userId) => {
  if (!userId) {
    selectedUserTranslations.value = [];
    return;
  }
  try {
    const { data } = await getProfileTranslations(userId);
    selectedUserTranslations.value = data || [];
  } catch (err) {
    console.warn("[chat] selected user translations failed:", err);
    selectedUserTranslations.value = [];
  }
};

const selectedUserMeta = computed(() => {
  const user = selectedUser.value;
  if (!user) return [];
  const meta = [];
  if (user.age) {
    meta.push({
      key: "age",
      icon: "mdi-cake-variant",
      color: "#2563eb",
      label: "Age",
      value: String(user.age),
    });
  }
  if (user.gender) {
    const photosLabel = t("components.profile-gallery.count-short", {
      count: selectedUserPhotoCount.value,
    });
    const genderValue = String(user.gender);
    const genderKey = genderValue.toLowerCase();
    let genderIcon = "mdi-gender-male-female";
    let genderColor = "#7c3aed";
    if (genderKey === "male") {
      genderIcon = "mdi-gender-male";
      genderColor = "#2563eb";
    } else if (genderKey === "female") {
      genderIcon = "mdi-gender-female";
      genderColor = "#ec4899";
    }
    meta.push({
      key: "gender",
      icon: genderIcon,
      color: genderColor,
      label: "Gender",
      value: `${genderValue} (${photosLabel})`,
    });
  }
  if (selectedUserLocation.value) {
    meta.push({
      key: "location",
      icon: "mdi-map-marker",
      color: "#16a34a",
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

const loadSelectedUserPhotoCount = async (userId) => {
  if (!userId) {
    selectedUserPhotoCount.value = 0;
    return;
  }
  try {
    const res = await $fetch("/api/profile/photos-public", {
      query: { userId },
    });
    selectedUserPhotoCount.value = Number(res?.count || 0);
  } catch (err) {
    console.warn("[chat] selected user photo count failed:", err);
    selectedUserPhotoCount.value = 0;
  }
};

const selectedUserInterests = computed(() => {
  const raw = selectedUser.value?.looking_for;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry.length);
});

const loadingMsgs = computed(() => chat.loading);
const peerPreferredLocaleOverride = ref(null);

const loadPeerPreferredLocale = async (userId) => {
  if (!userId) {
    peerPreferredLocaleOverride.value = null;
    return;
  }
  try {
    const data = await getUserProfileFunctionFromId(userId);
    const profile = Array.isArray(data) ? data[0] : data;
    peerPreferredLocaleOverride.value = normalizeLocale(
      profile?.preferred_locale
    );
  } catch (err) {
    console.warn("[chat] selected user preferred locale failed:", err);
    peerPreferredLocaleOverride.value = null;
  }
};

const loadTranslationPreference = async (ownerId, receiverId) => {
  if (!ownerId || !receiverId) {
    translationPref.value = null;
    return;
  }
  translationPrefLoading.value = true;
  try {
    const { data } = await getTranslationPreference(ownerId, receiverId);
    translationPref.value = data || null;
  } finally {
    translationPrefLoading.value = false;
  }
};

watch(
  () => auth.user?.id,
  (userId) => {
    if (userId) {
      loadBlockedUsers(userId);
    } else {
      blockedUsers.value = [];
    }
  },
  { immediate: true }
);

watch(selectedUserId, () => {
  panelOpen.value = false;
});

watch(
  selectedUserId,
  (userId) => {
    loadSelectedUserPhotoCount(userId);
  },
  { immediate: true }
);

watch(
  selectedUserId,
  (userId) => {
    loadPeerPreferredLocale(userId);
  },
  { immediate: true }
);

watch(
  [() => auth.user?.id, selectedUserId],
  ([ownerId, receiverId]) => {
    const peer = chat.selectedUser;
    if (!ownerId || !receiverId || peer?.is_ai) {
      translationPref.value = null;
      return;
    }
    loadTranslationPreference(ownerId, receiverId);
  },
  { immediate: true }
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

// ———————————————————————————————————————————
// Props
// ———————————————————————————————————————————
const props = defineProps({
  user: Object,
  userProfile: Object,
  authStatus: { type: String, required: true },
});
const userProfile = computed(() => props.userProfile || null);
const mePreferredLocale = computed(() =>
  normalizeLocale(userProfile.value?.preferred_locale || locale.value)
);
const peerPreferredLocale = computed(() => {
  const direct = normalizeLocale(chat.selectedUser?.preferred_locale);
  return direct || peerPreferredLocaleOverride.value || null;
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
  if (!auth.isProfileComplete) return false;
  if (isBotSelected.value) return true;
  return ["anon_authenticated", "authenticated"].includes(auth.authStatus);
});

const usersWithPresence = computed(() => {
  // ——— presence dependency (reactive) ———
  // console.log('[usersWithPresence] src len =', Array.isArray(chat.users) ? chat.users.length : 'n/a');

  const realtimeSet = new Set(realtimeIds.value);
  const recentActiveSet = new Set(recentActiveNormalized.value);

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
      const forcedOnline = u.force_online === true;
      const manualStatus = String(u.manual_status || "").trim().toLowerCase();
      const isRealtimeOnline = realtimeSet.has(resolvePresenceKey(u));
      const isRecentActive = recentActiveSet.has(resolvePresenceKey(u));

      let presence = "offline";
      if (manualStatus === "away") {
        presence = "away";
      } else if (manualStatus === "offline" && !forcedOnline) {
        presence = "offline";
      } else if (u.is_ai) {
        presence = "online";
      } else if (isRealtimeOnline) {
        presence = "online";
      } else if (isRecentActive) {
        presence = "away";
      } else if (forcedOnline) {
        presence = "away";
      } else {
        presence = "offline";
      }

      const online = presence !== "offline";

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
        presence,
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

const selectedUserPresence = computed(() => {
  const presence = selectedUser.value?.presence;
  if (presence === "online" || presence === "away" || presence === "offline") {
    return presence;
  }
  return selectedUser.value?.online ? "online" : "offline";
});

const selectedUserPresenceLabel = computed(() => {
  if (selectedUserPresence.value === "online") {
    return t("components.users.online");
  }
  if (selectedUserPresence.value === "away") {
    return "Away";
  }
  return t("components.users.offline");
});

const selectedUserPresenceIcon = computed(() =>
  selectedUserPresence.value === "offline" ? "mdi-circle-outline" : "mdi-circle"
);

const selectedUserPresenceColor = computed(() => {
  if (selectedUserPresence.value === "online") return "success";
  if (selectedUserPresence.value === "away") return "warning";
  return "grey";
});

const translationTargetLabel = computed(() => {
  const code = peerPreferredLocale.value;
  if (!code) return null;
  const label = t(
    `components.profile-language.options.${code}`,
    code.toUpperCase()
  );
  return label || code.toUpperCase();
});

const translationPromptBody = computed(() => {
  const name = selectedUser.value?.displayname || t("components.chatTranslation.someone");
  const language = translationTargetLabel.value || t("components.chatTranslation.theirLanguage");
  return t("components.chatTranslation.promptBody", { name, language });
});

watch(
  () => selectedUser.value?.user_id || selectedUser.value?.id,
  (userId) => {
    loadSelectedUserTranslations(userId);
  },
  { immediate: true }
);

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

async function onConsentAction() {
  selectImChatty();

  // If we're in the pre-auth onboarding flow, treat this as a "Yes" to consent
  if (!isPreAuth.value) return;

  try {
    if (onbRef.value?.acceptConsent) {
      await onbRef.value.acceptConsent();
      return;
    }
    await sendUserMessage("yes");
  } catch (e) {
    console.warn("[consent] failed to trigger accept:", e);
  }
}

function onConsentClose() {
  if (auth.authStatus === "authenticated") {
    showConsentPanelAuth.value = false;
    saveConsentPanelPref(auth.user?.id || null, true);
  }
}

onBeforeUnmount(() => {
  if (consentAutoHideTimer.value) {
    clearTimeout(consentAutoHideTimer.value);
    consentAutoHideTimer.value = null;
  }
  if (recentActiveTimer) {
    clearInterval(recentActiveTimer);
    recentActiveTimer = null;
  }
});

function openDeleteDialog(user) {
  deleteTarget.value = user || null;
  deleteError.value = "";
  deleteDialog.value = !!user;
}

function closeDeleteDialog() {
  deleteDialog.value = false;
  deleteTarget.value = null;
  deleteError.value = "";
}

async function confirmDeleteChat() {
  if (!deleteTarget.value || !meId) return;
  const peerId = deleteTarget.value.user_id || deleteTarget.value.id;
  if (!peerId) return;

  deletingChat.value = true;
  deleteError.value = "";
  try {
    const err = await deleteChatWithUser(meId, peerId);
    if (err) throw err;

    // update active list + unread counts locally
    const peerIdStr = String(peerId);
    chat.activeChats = (chat.activeChats || []).filter(
      (id) => String(id) !== peerIdStr
    );
    activeChats.value = (activeChats.value || []).filter(
      (id) => String(id) !== peerIdStr
    );
    if (msgs?.unreadByPeer) {
      msgs.unreadByPeer = { ...msgs.unreadByPeer, [peerIdStr]: 0 };
    }

    // if deleted chat was selected, fall back to first available user
    if (String(selectedUserId.value || "") === peerIdStr) {
      const fallback = usersWithPresence.value.find((u) => {
        const uid = u.user_id ?? u.id;
        return String(uid) !== peerIdStr;
      });
      chat.setSelectedUser(fallback || null);
    }

    // refresh active list from server in background
    refreshActiveChats();

    closeDeleteDialog();
  } catch (err) {
    console.error("[ChatLayout] delete chat error", err);
    deleteError.value =
      err?.message ||
      t("components.activeChats.delete-confirm");
  } finally {
    deletingChat.value = false;
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

const resetTranslationPromptState = () => {
  pendingSendText.value = "";
  pendingTranslatePeerId.value = null;
};

watch(translationPromptOpen, (open) => {
  if (!open) resetTranslationPromptState();
});

const maybePromptTranslation = async (text, selectedPeer, toId, sendingToBot) => {
  if (!text) return true;
  if (sendingToBot || selectedPeer?.is_ai) return true;
  const ownerId = auth.user?.id;
  if (!ownerId || !toId) return true;

  const meLocale = mePreferredLocale.value;
  const peerLocale = peerPreferredLocale.value;
  if (!meLocale || !peerLocale || meLocale === peerLocale) return true;

  if (!translationPref.value && !translationPrefLoading.value) {
    await loadTranslationPreference(ownerId, toId);
  }

  const mode = translationPref.value?.mode || "ask";
  if (mode === "always" || mode === "never") return true;

  pendingSendText.value = text;
  pendingTranslatePeerId.value = toId;
  translationPromptOpen.value = true;
  return false;
};

const applyTranslationChoice = async (mode) => {
  const text = pendingSendText.value;
  const peerId = pendingTranslatePeerId.value;
  translationPromptOpen.value = false;

  if (!text || !peerId) return;
  if (String(peerId) !== String(selectedUserId.value)) return;

  const ownerId = auth.user?.id;
  if (!ownerId) return;

  if (mode === "always" || mode === "never") {
    await upsertTranslationPreference(ownerId, peerId, mode);
    translationPref.value = {
      ...(translationPref.value || {}),
      owner_id: ownerId,
      receiver_id: peerId,
      mode,
    };
  }

  await onSend(text, { bypassTranslationPrompt: true, translationMode: mode });
};

const translateChatMessage = async (text, targetLocale) => {
  if (!text || !targetLocale) return null;
  try {
    const res = await $fetch("/api/chat/translate", {
      method: "POST",
      body: {
        text,
        targetLocale,
        sourceLocaleHint: mePreferredLocale.value || null,
      },
    });
    if (!res?.ok) return null;
    const sourceLocale = normalizeLocale(res.sourceLocale);
    const translatedText =
      typeof res.translatedText === "string" ? res.translatedText : null;
    const payload = {
      original_language: sourceLocale || mePreferredLocale.value || null,
    };
    if (translatedText && sourceLocale && sourceLocale !== targetLocale) {
      payload.translated_content = translatedText;
      payload.translated_language = targetLocale;
      payload.translation_engine = res.engine || "openai";
      payload.translation_created_at = new Date().toISOString();
    }
    return payload;
  } catch (err) {
    console.warn("[chat] translate failed:", err);
    return null;
  }
};

async function onSend(
  text,
  { bypassTranslationPrompt = false, translationMode = null } = {}
) {
  const selectedPeer = selectedUser.value || chat.selectedUser;
  const toId = selectedPeer?.user_id || selectedPeer?.id;
  const sendingToBot = toId === IMCHATTY_ID;
  if (isSelectedUserBlocked.value) return;

  if (!bypassTranslationPrompt) {
    const proceed = await maybePromptTranslation(
      text,
      selectedPeer,
      toId,
      sendingToBot
    );
    if (!proceed) return;
  }

  // pre-auth onboarding
  if (isPreAuth.value && sendingToBot) {
    if (draft.stage === "finalizing") return; // avoid double-sends while saving profile
    try {
      onbRef.value?.setTyping(true); // show dots immediately
      await sendUserMessage(text); // <-- your existing call
    } finally {
      onbRef.value?.setTyping(false); // safety off-switch
    }
    return;
  }

  // translate if needed (DM only)
  let translationPayload = null;
  const mode = translationMode || translationPref.value?.mode || "ask";
  const shouldTranslate = mode === "always" || mode === "once";
  const targetLocale = peerPreferredLocale.value;
  if (shouldTranslate && targetLocale && !sendingToBot) {
    translationPayload = await translateChatMessage(text, targetLocale);
  }

  // optimistic local send
  regRef.value?.appendLocalAndSend?.(text, translationPayload);

  if (
    selectedPeer &&
    selectedPeer.presence === "away" &&
    !selectedPeer.is_ai &&
    !sendingToBot
  ) {
    const name = selectedUserLocalized.value?.displayname || "User";
    let msg = t("components.away.reply", { name });
    if (auth.authStatus === "anon_authenticated") {
      const link = localePath({
        path: "/settings",
        query: { linkEmail: "1" },
      });
      msg += ` [${t("components.away.link-cta")}](${link}).`;
    }
    regRef.value?.setTyping?.(true);
    regRef.value?.appendPeerLocal?.(msg, {
      senderId: IMCHATTY_ID,
      senderName: "ImChatty",
      senderAvatar: "/images/imchatty-avatar.png",
    });
    setTimeout(() => regRef.value?.setTyping?.(false), 700);
  }

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

.active-panel-rail {
  --active-rail-width: 34px;
  position: absolute;
  top: 12px;
  bottom: 12px;
  right: 6px;
  width: var(--active-rail-width);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.active-panel-toggle {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  width: 28px;
  height: 28px;
}

.active-panel-toggle--alert,
.chat-mobile-toggle--alert {
  animation: active-panel-pulse 1.6s ease-in-out infinite;
  border-color: rgba(220, 38, 38, 0.6);
  box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45),
    0 0 16px rgba(220, 38, 38, 0.3);
}

.active-panel-toggle--alert :deep(.v-icon),
.chat-mobile-toggle--alert :deep(.v-icon) {
  color: rgba(220, 38, 38, 0.95);
}

.active-panel-toggle :deep(.v-icon) {
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.active-panel-card {
  transition: opacity 0.2s ease, transform 0.25s ease;
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
.profile-header-toggle {
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
}
.profile-header-toggle:disabled {
  cursor: default;
  opacity: 0.6;
}
.messages-sticky-header-button {
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
}
.messages-sticky-header-button:disabled {
  cursor: default;
  opacity: 0.6;
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
.meta-icon {
  position: relative;
  top: -2px;
}
.profile-bio {
  white-space: pre-line;
}
.chat-mobile-controls {
  margin-top: -20px;
  margin-bottom: 2px;
}
.mobile-profile-info {
  min-width: 0;
}
.mobile-profile-subtitle {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mobile-presence-pill {
  margin-left: auto;
  margin-right: 8px;
}
.mobile-avatar-wrap {
  position: relative;
  display: inline-flex;
}
.mobile-gender-icon {
  position: absolute;
  right: -3px;
  bottom: -3px;
  background: #fff;
  border-radius: 999px;
  padding: 3px;
  color: #1d3b58;
}
.mobile-gender-icon.is-male {
  color: #2563eb;
}
.mobile-gender-icon.is-female {
  color: #ec4899;
}
.mobile-gender-icon.is-other {
  color: #7c3aed;
}
.chat-mobile-drawer {
  z-index: 1700 !important;
}
.chat-mobile-drawer :deep(.v-overlay__content),
.chat-mobile-drawer :deep(.v-navigation-drawer) {
  top: var(--nav2-offset, 0px) !important;
  height: calc(100vh - var(--nav2-offset, 0px)) !important;
}
.translation-choice-list :deep(.v-list-item) {
  border-radius: 10px;
}
.translation-choice-list :deep(.v-list-item:hover) {
  background: rgba(37, 99, 235, 0.08);
}

@keyframes active-panel-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55),
      0 0 16px rgba(220, 38, 38, 0.35);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0),
      0 0 18px rgba(220, 38, 38, 0.2);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0),
      0 0 16px rgba(220, 38, 38, 0.25);
  }
}
</style>
