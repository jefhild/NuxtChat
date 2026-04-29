<template>
  <div class="chat-layout-root">
    <div class="chat-layout-shell">
      <!-- Mobile controls: left drawer (Topics) + right drawer (Participants) -->
      <div
        v-if="showMobileControls && isMobileLayout"
        class="chat-mobile-controls"
      >
        <button
          type="button"
          class="chat-mobile-toggle"
          :class="{
            'chat-mobile-toggle--alert': showMobileUnreadAlert,
            'chat-mobile-toggle--open': leftOpen,
          }"
          @click="leftOpen = !leftOpen"
          aria-label="Show online participants"
          title="Show online participants"
        >
          <i class="mdi mdi-account-multiple-outline chat-mobile-toggle__icon chat-mobile-toggle__icon--online" aria-hidden="true" />
          <span class="chat-mobile-toggle__label">Online</span>
        </button>
        <div class="chat-mobile-controls__spacer" />
        <button
          type="button"
          class="chat-mobile-toggle"
          :class="{
            'chat-mobile-toggle--alert': showMobileActiveAlert,
            'chat-mobile-toggle--open': rightOpen,
          }"
          @click="rightOpen = !rightOpen"
          aria-label="Show active chat participants"
          title="Show active chat participants"
        >
          <i class="mdi mdi-chat-processing-outline chat-mobile-toggle__icon chat-mobile-toggle__icon--active" aria-hidden="true" />
          <span class="chat-mobile-toggle__label">Active</span>
        </button>
      </div>
      <!-- Desktop / tablet (>= md): 3 columns -->
      <div
        v-if="!isMobileLayout"
        class="chat-grid-row"
      >
        <!-- LEFT: Topics -->
        <div class="chat-desktop-col chat-desktop-col--left">
          <ChatLayoutUsersPane
            :list-visible="tabVisibility.online"
            list-type="online"
            :users="usersWithPresence"
            :pinned-id="IMCHATTY_ID"
            :active-chats="activeChats"
            :language-practice-chat-ids="languagePracticeSessionUserIds"
            :selected-user-id="selectedUserId"
            :is-loading="isLoading"
            :user-profile="userProfile"
            :auth-status="auth.authStatus"
            :disable-filter-toggle="shouldDisableToggle"
            :show-ai="showAIUsers"
            :show-language-practice-ai="showLanguagePracticeAIUsers"
            :suppress-match-strip="suppressMatchStrip"
            @user-selected="selectUser"
            @filter-changed="updateFilters"
            @activate-language-practice="activateLanguagePracticeChat"
            @update:show-ai="showAIUsers = $event"
            @update:show-language-practice-ai="showLanguagePracticeAIUsers = $event"
          />

          <ClientOnly>
            <div v-if="consentPanelVisible" class="chat-consent-panel-wrap">
              <ChatLayoutConsentPanel
                :auth-status="auth.authStatus"
                :user-profile="userProfile"
                :show-close="auth.authStatus === 'authenticated'"
                @action="onConsentAction"
                @close="onConsentClose"
              />
            </div>
          </ClientOnly>
        </div>

        <!-- CENTER: Thread messages -->
        <div
          class="chat-desktop-col chat-thread-col"
          :class="activePanelOpen ? 'chat-thread-col--with-active' : 'chat-thread-col--full'"
        >
          <div class="active-panel-rail">
            <button
              type="button"
              class="active-panel-toggle"
              :class="{ 'active-panel-toggle--alert': showActivePanelAlert }"
              :aria-expanded="String(activePanelOpen)"
              aria-controls="active-panel"
              aria-label="Toggle active chats panel"
              title="Active chats"
              @click="activePanelOpen = !activePanelOpen"
            >
              <i
                :class="[
                  'mdi',
                  activePanelOpen ? 'mdi-chevron-right' : 'mdi-chevron-left',
                  'active-panel-toggle__icon'
                ]"
                aria-hidden="true"
              />
            </button>
          </div>
          <!-- Sticky header -->
          <div class="messages-sticky-header">
            <ChatLayoutThreadHeader
              :panel-open="panelOpen"
              :selected-user="selectedUser"
              :selected-user-initial="selectedUserInitial"
              :selected-user-avatar-decoration-url="selectedUserAvatarDecorationUrl"
              :selected-user-flag-emoji="selectedUserFlagEmoji"
              :selected-user-gender-class="selectedUserGenderClass"
              :selected-user-gender-color="selectedUserGenderColor"
              :selected-user-gender-icon="selectedUserGenderIcon"
              :selected-user-title="selectedUserTitle"
              :selected-user-subtitle="selectedUserSubtitle"
              :selected-user-presence-color="selectedUserPresenceColor"
              :selected-user-presence-icon="selectedUserPresenceIcon"
              :selected-user-presence-label="selectedUserPresenceLabel"
              :sm-and-down="smAndDown"
              @toggle="panelOpen = !panelOpen"
            />
          </div>

            <!-- Overlay panel that drops over the scrollable list -->
            <Transition name="chat-panel-expand">
              <ChatLayoutThreadInfoPanel
                :panel-open="panelOpen"
                :selected-user="selectedUser"
               :selected-user-localized="selectedUserLocalized"
               :selected-user-meta="selectedUserMeta"
               :selected-user-primary-meta-items="selectedUserPrimaryMetaItems"
               :selected-user-secondary-meta-items="selectedUserSecondaryMetaItems"
               :sm-and-down="smAndDown"
               :selected-user-panel-view="selectedUserPanelView"
               :selected-user-photo-count="selectedUserPhotoCount"
               :selected-user-photo-count-label="selectedUserPhotoCountLabel"
               :selected-user-photos-loading="selectedUserPhotosLoading"
               :selected-user-photo-slides="selectedUserPhotoSlides"
               :should-blur-selected-user-photos="shouldBlurSelectedUserPhotos"
               :locked-photo-cta-label="lockedPhotoCtaLabel"
               :selected-user-interests="selectedUserInterests"
               :get-looking-for-chip-style="getLookingForChipStyle"
               :block-tooltip="blockTooltip"
               :is-selected-user-blocked="isSelectedUserBlocked"
               :is-block-disabled="isBlockDisabled"
               :profile-link="profileLink"
               @open-photos="openSelectedUserPhotosPanel"
               @view-bio="selectedUserPanelView = 'bio'"
               @open-photo-access="openPhotoAccessFlow"
               @open-profile="openProfileDialog(selectedUser)"
                @toggle-block="toggleBlockSelectedUser"
                @share-profile="shareProfile"
              />
            </Transition>

          <ChatLayoutLanguagePracticeBanner
            v-if="languagePracticeSession && selectedUserId"
            :session="languagePracticeSession"
            @deactivate="deactivateLanguagePracticeMode"
          />

          <!-- Scrollable messages list -->
          <div
            ref="centerScrollRef"
            class="users-scroll chat-thread-scroll"
            style="flex: 1 1 0"
            @scroll.passive="onMobileScroll"
            @touchstart.passive="onMobileTouchStart"
            @touchmove.passive="onMobileTouchMove"
          >
            <div v-if="loadingMsgs" class="chat-loading-skeleton" aria-hidden="true">
              <div v-for="index in 6" :key="index" class="chat-loading-skeleton__row">
                <span class="chat-loading-skeleton__avatar" />
                <span class="chat-loading-skeleton__content">
                  <span class="chat-loading-skeleton__line chat-loading-skeleton__line--primary" />
                  <span class="chat-loading-skeleton__line chat-loading-skeleton__line--secondary" />
                </span>
              </div>
            </div>

            <ChatLayoutOnboarding
              v-if="isPreAuth && isBotSelected"
              ref="onbRef"
              :key="'onb'"
              :authStatus="auth.authStatus"
              :canSend="canSend"
              :isPreAuth="isPreAuth"
              :isBotSelected="isBotSelected"
              :consented="draftStore?.consented ?? false"
              @send="onSend"
              class="chat-thread-fill"
            />

            <ChatLayoutRegular
              v-else-if="selectedUserId"
              ref="regRef"
              :key="`reg-${auth.authStatus}`"
              :authStatus="auth.authStatus"
              :me-id="meId"
              :peer="chat.selectedUser"
              :blocked-user-ids="blockedUsers"
              :quick-replies="threadQuickReplies"
              :show-quick-replies="showThreadQuickReplies"
              @quick-reply="onThreadQuickReply"
            />
            <div
              v-else
              class="chat-inline-alert chat-inline-alert--info"
            >
              {{ t("components.message.composer.sign-in") }}
            </div>
          </div>

          <!-- Composer -->
          <div class="chat-composer-wrap" style="flex: 0 0 auto">
            <div
              v-if="isSelectedUserBlocked"
              class="chat-inline-alert chat-inline-alert--warning"
            >
              {{ t("components.message.composer.blocked") }}
            </div>
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              :blocked-user-ids="blockedUsers"
              :language-practice-mode="Boolean(languagePracticeSession)"
              class="chat-composer"
              @send="onSend"
            />
          </div>
        </div>

        <!-- RIGHT: Participants -->
        <div
          v-if="activePanelOpen"
          class="chat-desktop-col chat-desktop-col--right"
        >
          <ChatLayoutUsersPane
            pane-id="active-panel"
            card-class="active-panel-card"
            :list-visible="tabVisibility.active"
            list-type="active"
            :users="activePanelUsersWithPresence"
            :pinned-id="IMCHATTY_ID"
            :active-chats="activeChats"
            :language-practice-chat-ids="languagePracticeSessionUserIds"
            :selected-user-id="selectedUserId"
            :is-loading="isLoading"
            :user-profile="userProfile"
            :auth-status="auth.authStatus"
            :disable-filter-toggle="shouldDisableToggle"
            :show-filters="false"
            :show-ai="showAIUsers"
            :show-language-practice-ai="showLanguagePracticeAIUsers"
            @user-selected="selectUser"
            @filter-changed="updateFilters"
            @delete-chat="openDeleteDialog"
            @activate-language-practice="activateLanguagePracticeChat"
            @end-language-practice="endLanguagePracticeChat"
            @view-profile="openProfileDialog"
            @update:show-ai="showAIUsers = $event"
            @update:show-language-practice-ai="showLanguagePracticeAIUsers = $event"
          />
        </div>
      </div>

      <!-- Mobile (< md): only the Thread pane -->
      <div
        v-if="isMobileLayout"
        class="chat-grid-row"
      >
        <div class="chat-thread-col chat-thread-col--mobile">
          <ChatLayoutThreadHeader
            mobile
            :panel-open="panelOpen"
            :selected-user="selectedUser"
            :selected-user-initial="selectedUserInitial"
            :selected-user-avatar-decoration-url="selectedUserAvatarDecorationUrl"
            :selected-user-flag-emoji="selectedUserFlagEmoji"
            :selected-user-gender-class="selectedUserGenderClass"
            :selected-user-gender-color="selectedUserGenderColor"
            :selected-user-gender-icon="selectedUserGenderIcon"
            :selected-user-title="selectedUserTitle"
            :selected-user-subtitle="selectedUserSubtitle"
            :selected-user-presence-color="selectedUserPresenceColor"
            :selected-user-presence-icon="selectedUserPresenceIcon"
            :selected-user-presence-label="selectedUserPresenceLabel"
            :sm-and-down="smAndDown"
            @toggle="panelOpen = !panelOpen"
          />
          <Transition name="chat-panel-expand">
            <ChatLayoutThreadInfoPanel
              mobile
              :panel-open="panelOpen"
              :selected-user="selectedUser"
              :selected-user-localized="selectedUserLocalized"
              :selected-user-meta="selectedUserMeta"
              :selected-user-primary-meta-items="selectedUserPrimaryMetaItems"
              :selected-user-secondary-meta-items="selectedUserSecondaryMetaItems"
              :sm-and-down="smAndDown"
              :selected-user-panel-view="selectedUserPanelView"
              :selected-user-photo-count="selectedUserPhotoCount"
              :selected-user-photo-count-label="selectedUserPhotoCountLabel"
              :selected-user-photos-loading="selectedUserPhotosLoading"
              :selected-user-photo-slides="selectedUserPhotoSlides"
              :should-blur-selected-user-photos="shouldBlurSelectedUserPhotos"
              :locked-photo-cta-label="lockedPhotoCtaLabel"
              :selected-user-interests="selectedUserInterests"
              :get-looking-for-chip-style="getLookingForChipStyle"
              :block-tooltip="blockTooltip"
              :is-selected-user-blocked="isSelectedUserBlocked"
              :is-block-disabled="isBlockDisabled"
              :profile-link="profileLink"
              @open-photos="openSelectedUserPhotosPanel"
              @view-bio="selectedUserPanelView = 'bio'"
              @open-photo-access="openPhotoAccessFlow"
              @open-profile="openProfileDialog(selectedUser)"
              @toggle-block="toggleBlockSelectedUser"
              @share-profile="shareProfile"
            />
          </Transition>

          <ChatLayoutLanguagePracticeBanner
            v-if="languagePracticeSession && selectedUserId"
            :session="languagePracticeSession"
            @deactivate="deactivateLanguagePracticeMode"
          />

          <div
            ref="centerScrollRef"
            class="users-scroll chat-thread-scroll"
            style="flex: 1 1 0"
            @scroll.passive="
              panelOpen && autoCloseOnScroll && (panelOpen = false)
            "
          >
            <div v-if="loadingMsgs" class="chat-loading-skeleton" aria-hidden="true">
              <div v-for="index in 6" :key="index" class="chat-loading-skeleton__row">
                <span class="chat-loading-skeleton__avatar" />
                <span class="chat-loading-skeleton__content">
                  <span class="chat-loading-skeleton__line chat-loading-skeleton__line--primary" />
                  <span class="chat-loading-skeleton__line chat-loading-skeleton__line--secondary" />
                </span>
              </div>
            </div>
            <ChatLayoutOnboarding
              v-if="isPreAuth && isBotSelected"
              ref="onbRef"
              :key="'onb'"
              :authStatus="auth.authStatus"
              :canSend="canSend"
              :isPreAuth="isPreAuth"
              :isBotSelected="isBotSelected"
              :consented="draftStore?.consented ?? false"
              @send="onSend"
              class="chat-thread-fill"
            />

            <ChatLayoutRegular
              v-else-if="selectedUserId"
              ref="regRef"
              :key="`reg-${auth.authStatus}`"
              :authStatus="auth.authStatus"
              :me-id="meId"
              :peer="chat.selectedUser"
              :blocked-user-ids="blockedUsers"
              :quick-replies="threadQuickReplies"
              :show-quick-replies="showThreadQuickReplies"
              @quick-reply="onThreadQuickReply"
            />
            <div
              v-else
              class="chat-inline-alert chat-inline-alert--info"
            >
              {{ t("components.message.composer.sign-in") }}
            </div>
          </div>

          <div class="chat-composer-wrap" style="flex: 0 0 auto">
            <div
              v-if="isSelectedUserBlocked"
              class="chat-inline-alert chat-inline-alert--warning"
            >
              {{ t("components.message.composer.blocked") }}
            </div>
            <ChatLayoutMessageComposer
              v-model:draft="messageDraft"
              :peer-id="peerId"
              :me-id="meId"
              :conversation-key="conversationKey"
              :blocked-user-ids="blockedUsers"
              :language-practice-mode="Boolean(languagePracticeSession)"
              class="chat-composer"
              @send="onSend"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile-only Drawers -->
    <Teleport to="body">
      <div
        v-if="leftOpen && isMobileDrawer"
        class="chat-mobile-drawer"
      >
        <button
          type="button"
          class="chat-mobile-drawer__scrim"
          aria-label="Close topics drawer"
          @click="leftOpen = false"
        />
        <aside
          class="chat-mobile-drawer__panel chat-mobile-drawer__panel--left"
          aria-label="Topics drawer"
        >
          <div class="chat-mobile-drawer__content">
            <div class="chat-mobile-drawer__header">
              <span class="chat-mobile-drawer__title">
                {{ t("components.users.online") }}
              </span>
              <button
                type="button"
                class="chat-mobile-drawer__close"
                aria-label="Close online drawer"
                @click="leftOpen = false"
              >
                <i class="mdi mdi-close" aria-hidden="true" />
              </button>
            </div>
            <ChatLayoutUsersPane
              :list-visible="tabVisibility.online"
              list-type="online"
              :users="activePanelUsersWithPresence"
              :pinned-id="IMCHATTY_ID"
              :active-chats="activeChats"
              :language-practice-chat-ids="languagePracticeSessionUserIds"
              :selected-user-id="selectedUserId"
              :is-loading="isLoading"
              :user-profile="userProfile"
              :auth-status="auth.authStatus"
              :disable-filter-toggle="shouldDisableToggle"
              :show-ai="showAIUsers"
              :show-language-practice-ai="showLanguagePracticeAIUsers"
              :suppress-match-strip="suppressMatchStrip"
              @user-selected="selectUser"
              @filter-changed="updateFilters"
              @activate-language-practice="activateLanguagePracticeChat"
              @update:show-ai="showAIUsers = $event"
              @update:show-language-practice-ai="showLanguagePracticeAIUsers = $event"
            />
          </div>
        </aside>
      </div>

      <div
        v-if="rightOpen && isMobileDrawer"
        class="chat-mobile-drawer"
      >
        <button
          type="button"
          class="chat-mobile-drawer__scrim"
          aria-label="Close participants drawer"
          @click="rightOpen = false"
        />
        <aside
          class="chat-mobile-drawer__panel chat-mobile-drawer__panel--right"
          aria-label="Participants drawer"
        >
          <div class="chat-mobile-drawer__content">
            <div class="chat-mobile-drawer__header">
              <span class="chat-mobile-drawer__title">
                {{ t("components.users.active") }}
              </span>
              <button
                type="button"
                class="chat-mobile-drawer__close"
                aria-label="Close active chats drawer"
                @click="rightOpen = false"
              >
                <i class="mdi mdi-close" aria-hidden="true" />
              </button>
            </div>
            <ChatLayoutUsersPane
              :list-visible="tabVisibility.active"
              list-type="active"
              :users="activePanelUsersWithPresence"
              :pinned-id="IMCHATTY_ID"
              :active-chats="activeChats"
              :language-practice-chat-ids="languagePracticeSessionUserIds"
              :selected-user-id="selectedUserId"
              :is-loading="isLoading"
              :user-profile="userProfile"
              :auth-status="auth.authStatus"
              :disable-filter-toggle="shouldDisableToggle"
              :show-filters="false"
              :show-ai="showAIUsers"
              :show-language-practice-ai="showLanguagePracticeAIUsers"
              @user-selected="selectUser"
              @filter-changed="updateFilters"
              @delete-chat="openDeleteDialog"
              @activate-language-practice="activateLanguagePracticeChat"
              @end-language-practice="endLanguagePracticeChat"
              @view-profile="openProfileDialog"
              @update:show-ai="showAIUsers = $event"
              @update:show-language-practice-ai="showLanguagePracticeAIUsers = $event"
            />
          </div>
        </aside>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="deleteDialog"
        class="chat-overlay"
        @click="closeDeleteDialog"
      >
        <div
          class="chat-modal chat-modal--delete"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('components.activeChats.delete-title')"
          @click.stop
        >
          <div class="chat-modal__title">
            {{ $t("components.activeChats.delete-title") }}
          </div>
          <div class="chat-modal__body">
            <div class="chat-modal__text">
              {{ deletePrompt }}
            </div>
            <div v-if="deleteError" class="chat-modal__alert chat-modal__alert--error">
              {{ deleteError }}
            </div>
          </div>
          <div class="chat-modal__actions">
            <button
              type="button"
              class="chat-btn chat-btn--ghost"
              :disabled="deletingChat"
              @click="closeDeleteDialog"
            >
              {{ $t("components.activeChats.cancel") }}
            </button>
            <button
              type="button"
              class="chat-btn chat-btn--danger"
              :disabled="deletingChat"
              @click="confirmDeleteChat"
            >
              {{ deletingChat ? $t("components.activeChats.confirm") + "..." : $t("components.activeChats.confirm") }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="translationPromptOpen"
        class="chat-overlay"
        @click="translationPromptOpen = false"
      >
        <div
          class="chat-modal chat-modal--translation"
          role="dialog"
          aria-modal="true"
          :aria-label="t('components.chatTranslation.promptTitle')"
          @click.stop
        >
          <div class="chat-modal__title">
            {{ t("components.chatTranslation.promptTitle") }}
          </div>
          <div class="chat-modal__body">
            <div class="chat-modal__text">
              {{ translationPromptBody }}
            </div>
            <div class="chat-modal__hint">
              {{ t("components.chatTranslation.promptHint") }}
            </div>
            <div class="translation-choice-list">
              <button
                type="button"
                class="translation-choice-item"
                @click="applyTranslationChoice('once')"
              >
                <span class="translation-choice-item__title">
                  {{ t("components.chatTranslation.optionOnce") }}
                </span>
                <span class="translation-choice-item__subtitle">
                  {{ t("components.chatTranslation.optionOnceDesc") }}
                </span>
              </button>
              <button
                type="button"
                class="translation-choice-item"
                @click="applyTranslationChoice('always')"
              >
                <span class="translation-choice-item__title">
                  {{ t("components.chatTranslation.optionAlways") }}
                </span>
                <span class="translation-choice-item__subtitle">
                  {{ t("components.chatTranslation.optionAlwaysDesc") }}
                </span>
              </button>
              <button
                type="button"
                class="translation-choice-item"
                @click="applyTranslationChoice('never')"
              >
                <span class="translation-choice-item__title">
                  {{ t("components.chatTranslation.optionNever") }}
                </span>
                <span class="translation-choice-item__subtitle">
                  {{ t("components.chatTranslation.optionNeverDesc") }}
                </span>
              </button>
            </div>
          </div>
          <div class="chat-modal__actions">
            <button
              type="button"
              class="chat-btn chat-btn--ghost"
              @click="translationPromptOpen = false"
            >
              {{ t("components.chatTranslation.optionNotNow") }}
            </button>
          </div>
        </div>
      </div>

      <div class="chat-toast-stack">
        <div
          v-if="shareToast"
          class="chat-toast chat-toast--primary"
          role="status"
          aria-live="polite"
        >
          {{ t("components.chatheader.profile-copied") }}
        </div>
        <div
          v-if="languagePracticeToastOpen"
          :class="['chat-toast', toastColorClass(languagePracticeToastColor)]"
          role="status"
          aria-live="polite"
        >
          {{ languagePracticeToastMessage }}
        </div>
      </div>
    </Teleport>

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
  nextTick,
} from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { useMessagesStore } from "@/stores/messagesStore";
import { useChatStore } from "@/stores/chatStore";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { usePresenceStore2 } from "@/stores/presenceStore2"; // the minimal presence we made
import { useOnboardingAi } from "~/composables/useOnboardingAi";
import { useBlockedUsers } from "@/composables/useBlockedUsers";
import { useDb } from "@/composables/useDB";
import { useResponsiveDisplay } from "@/composables/useResponsiveDisplay";
import { useLocalePath, useRoute } from "#imports";
import { useAiQuota } from "~/composables/useAiQuota";
import { useTabFilters } from "@/composables/useTabFilters";
import { useI18n } from "vue-i18n";
import { useFooterVisibility } from "~/composables/useFooterVisibility";
import { bustMatchCache, setMatchFilter, useMatchCandidates } from "@/composables/useMatchCandidates";
import { useLanguagePracticeSession } from "@/composables/useLanguagePracticeSession";
import ProfileDialog from "@/components/ProfileDialog.vue";
import {
  markMoodFeedPromptShown,
  shouldSuppressMoodFeedPrompt,
} from "@/utils/moodFeedPromptState";
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
const {
  fetchActiveLanguagePracticeSession,
  endLanguagePracticeSession,
} = useLanguagePracticeSession();
const recentActiveIds = ref([]);
const recentActiveLoading = ref(false);
let recentActiveTimer = null;
const RECENT_ACTIVE_MINUTES = 10;
const RECENT_ACTIVE_POLL_MS = 5 * 60 * 1000;
const AWAY_NOTICE_COOLDOWN_MS = 15 * 60 * 1000;
const AWAY_NOTICE_STORAGE_KEY = "awayNoticeCooldown:v1";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const PREAUTH_STATUSES = ["anonymous", "unauthenticated", "guest", "onboarding"];

// Suppress the match strip while the Ezra mood-capture or next-step flow is active
// (prevents a brief flash of stale match data before Ezra's first message)
// "matched" stage is excluded — that's when we *want* the strip to appear
const suppressMatchStrip = computed(() => {
  const captureActive = ["prompt", "confirm", "clarify"].includes(draft.liveMoodStage || "");
  const nextStepActive = ["choose", "dormant"].includes(draft.liveMoodNextStepStage || "");
  return captureActive || nextStepActive;
});

const { smAndDown } = useResponsiveDisplay();
const hasMounted = ref(false);
const isMobileLayout = computed(() => hasMounted.value && smAndDown.value);
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
  getAvatarDecorationFromId,
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
const awayNoticeMap = ref(null);
const languagePracticeSession = ref(null);
const languagePracticeSessionUserIds = ref([]);
const isLanguagePracticeModeRequested = computed(() => {
  const mode = normStr(route.query.mode)?.toLowerCase();
  return mode === "language" || mode === "language-practice";
});

const localePath = useLocalePath();
const { tryConsume, limitReachedMessage } = useAiQuota();

const openProfileDialog = (user) => {
  profileDialogUserId.value = user?.user_id || user?.id || null;
  profileDialogSlug.value = user?.slug || null;
  isProfileDialogOpen.value = true;
};

const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const IMCHATTY_SLUG = "imchatty";
const isImchattyUser = (u) => {
  const id = String(u?.id ?? u?.user_id ?? "").trim();
  if (id && id === IMCHATTY_ID) return true;
  const slug = String(u?.slug ?? u?.profile_slug ?? u?.username_slug ?? "")
    .trim()
    .toLowerCase();
  return slug === IMCHATTY_SLUG;
};
const filters = reactive({
  gender_id: null,
  status_id: null,
  age_range: [18, 100],
  country_name: null,
  interests: null,
});

// ---- Onboarding AI helpers
const { sendUserMessage } = useOnboardingAi();
const { fetchCandidates: refreshMatchCandidates } = useMatchCandidates();

const { tabFilters, canShow, setMany } = useTabFilters();

function loadAwayNoticeMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AWAY_NOTICE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAwayNoticeMap(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      AWAY_NOTICE_STORAGE_KEY,
      JSON.stringify(map || {})
    );
  } catch {}
}

function getAwayNoticeMap() {
  if (!awayNoticeMap.value) awayNoticeMap.value = loadAwayNoticeMap();
  return awayNoticeMap.value;
}

function canShowAwayNotice(userId) {
  if (!userId) return false;
  const map = getAwayNoticeMap();
  const last = Number(map[userId] || 0);
  if (!Number.isFinite(last) || last <= 0) return true;
  return Date.now() - last > AWAY_NOTICE_COOLDOWN_MS;
}

function markAwayNoticeShown(userId) {
  if (!userId) return;
  const map = getAwayNoticeMap();
  map[userId] = Date.now();
  awayNoticeMap.value = map;
  saveAwayNoticeMap(map);
}

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
  awayNoticeMap.value = loadAwayNoticeMap();
  // ensure drawers don't render mobile server-side then stay off on desktop
  if (!smAndDown.value) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
  scheduleConsentAutoHide();
});

watch(
  () => smAndDown.value,
  (isMobileNow) => {
    if (!hasMounted.value || isMobileNow) return;
    leftOpen.value = false;
    rightOpen.value = false;
  }
);

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
const showLanguagePracticeAIUsers = ref(false);
const activeChats = ref([]);
const endedAiPeers = ref(new Set());
const replyingToMessage = ref(null); // { id, content } | null
const deleteDialog = ref(false);
const deleteTarget = ref(null);
const deleteError = ref("");
const deletingChat = ref(false);
const isBlocking = ref(false);
const shareToast = ref(false);
const languagePracticeToastOpen = ref(false);
const languagePracticeToastMessage = ref("");
const languagePracticeToastColor = ref("primary");
const shareToastTimer = ref(null);
const languagePracticeToastTimer = ref(null);
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

function mergeActiveChatIds(ids = []) {
  const incoming = (Array.isArray(ids) ? ids : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (!incoming.length) return;
  const seen = new Set(activeChats.value.map((id) => String(id)));
  activeChats.value = [
    ...incoming.filter((id) => !seen.has(id)),
    ...activeChats.value,
  ];
}

watch(
  () => chat.activeChats,
  (ids) => {
    mergeActiveChatIds(ids);
  },
  { immediate: true, deep: true }
);
const openLeftDrawer = () => {
  leftOpen.value = true;
};
const openRightDrawer = () => {
  rightOpen.value = true;
};
defineExpose({
  openLeftDrawer,
  openRightDrawer,
  showMobileUnreadAlert,
  showMobileActiveAlert,
});
const clearReply = () => {
  replyingToMessage.value = null;
};
const normalizeQueryId = (v) => {
  if (v == null) return null;
  if (Array.isArray(v)) v = v[0];
  const s = String(v).trim();
  return s.length ? s : null;
};

const isAdmin = computed(() => !!auth.userProfile?.is_admin);
const asUserId = computed(() =>
  normalizeQueryId(route.query.asUser ?? route.query.asuser ?? route.query.as_user)
);
// effective "me" for chat: admin may impersonate via ?asUser=
const meId = computed(() =>
  isAdmin.value && asUserId.value ? asUserId.value : auth.user?.id || null
);

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
  const userId = meId.value;
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
  const userId = meId.value;
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
const selectedUserPhotos = ref([]);
const selectedUserPhotosLoading = ref(false);
const selectedUserPanelView = ref("bio");
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

const browserLocale = computed(() => {
  if (!import.meta.client || typeof navigator === "undefined") return "en";
  const value = String(navigator.language || "").trim().toLowerCase();
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("zh")) return "zh";
  return "en";
});

const languagePracticeIndicatorUserIds = computed(() =>
  Array.from(
    new Set(
      (Array.isArray(chat.users) ? chat.users : [])
        .map((user) => String(user?.user_id ?? user?.id ?? "").trim())
        .filter(Boolean)
        .filter((id) => id !== String(meId.value || ""))
    )
  )
);

const languagePracticeIndicatorUserIdsKey = computed(() =>
  languagePracticeIndicatorUserIds.value.join(",")
);

const selectedUserLocation = computed(() => {
  const user = selectedUser.value;
  if (!user) return "";
  const location = [user.city, user.country].filter(Boolean).join(", ");
  const emoji = user.country_emoji ? String(user.country_emoji).trim() : "";
  if (emoji && location) return `${emoji} ${location}`;
  return emoji || location;
});

const selectedUserFlagEmoji = computed(() => {
  const user = selectedUser.value;
  if (!user?.country_emoji) return "";
  return String(user.country_emoji).trim();
});

const selectedUserGenderIcon = computed(() => {
  const genderId = Number(selectedUser.value?.gender_id);
  if (genderId === 1) return "mdi-gender-male";
  if (genderId === 2) return "mdi-gender-female";
  return "mdi-gender-non-binary";
});

const selectedUserGenderClass = computed(() => {
  const genderId = Number(selectedUser.value?.gender_id);
  if (genderId === 1) return "is-male";
  if (genderId === 2) return "is-female";
  return "is-other";
});

const selectedUserGenderColor = computed(() => {
  const genderId = Number(selectedUser.value?.gender_id);
  if (genderId === 1) return "#3b82f6";
  if (genderId === 2) return "#ec4899";
  return "#a855f7";
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
      value: `${genderValue}`,
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

const selectedUserMetaByKey = computed(() => {
  const map = new Map();
  for (const item of selectedUserMeta.value || []) {
    map.set(item.key, item);
  }
  return map;
});

const selectedUserPrimaryMetaItems = computed(() => {
  const age = selectedUserMetaByKey.value.get("age");
  const gender = selectedUserMetaByKey.value.get("gender");
  const location = selectedUserMetaByKey.value.get("location");
  return [age, gender, location].filter(Boolean);
});

const selectedUserSecondaryMetaItems = computed(() =>
  (selectedUserMeta.value || []).filter(
    (item) =>
      item.key !== "age" &&
      item.key !== "gender" &&
      item.key !== "location"
  )
);

const canViewSelectedUserPhotos = computed(
  () => auth.authStatus === "authenticated"
);

const selectedUserPhotoCountLabel = computed(() =>
  t("components.profile-gallery.count-short", {
    count: selectedUserPhotoCount.value,
  })
);

const selectedUserPhotoSlides = computed(() => {
  if (selectedUserPhotos.value.length) {
    return selectedUserPhotos.value.map((photo) => ({
      id: photo.id,
      url: photo.url || photo.public_url || "",
    }));
  }
  if (selectedUserPhotoCount.value > 0) {
    const fallbackUrl = String(selectedUser.value?.avatar_url || "").trim();
    return Array.from(
      { length: Math.min(selectedUserPhotoCount.value, 6) },
      (_, idx) => ({
        id: `placeholder-${idx}`,
        url: fallbackUrl,
      })
    );
  }
  return [];
});

const shouldBlurSelectedUserPhotos = computed(
  () => !canViewSelectedUserPhotos.value && selectedUserPhotoCount.value > 0
);

const lockedPhotoCtaLabel = computed(() =>
  auth.authStatus === "anon_authenticated"
    ? t("components.profile-email-link.cta")
    : t("components.profile-gallery.signin")
);

const openPhotoAccessFlow = () => {
  if (auth.authStatus === "anon_authenticated") {
    navigateTo({ path: localePath("/settings"), query: { linkEmail: "1" } });
    return;
  }
  navigateTo(localePath("/signin"));
};

const openSelectedUserPhotosPanel = () => {
  if (!selectedUserPhotoCount.value) return;
  selectedUserPanelView.value = "photos";
};

const loadSelectedUserPhotosData = async (userId) => {
  if (!userId) {
    selectedUserPhotoCount.value = 0;
    selectedUserPhotos.value = [];
    return;
  }
  selectedUserPhotosLoading.value = true;
  try {
    const res = await $fetch("/api/profile/photos-public", {
      query: { userId },
    });
    selectedUserPhotoCount.value = Number(res?.count || 0);
    selectedUserPhotos.value = Array.isArray(res?.photos) ? res.photos : [];
  } catch (err) {
    console.warn("[chat] selected user photo count failed:", err);
    selectedUserPhotoCount.value = 0;
    selectedUserPhotos.value = [];
  } finally {
    selectedUserPhotosLoading.value = false;
  }
};

const selectedUserInterests = computed(() => {
  const raw = selectedUser.value?.looking_for;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry.length);
});

const LOOKING_FOR_CHIP_COLORS = {
  love: "#ef4444",
  fun: "#3b82f6",
  "nothing serious": "#22c55e",
  men: "#3b82f6",
  women: "#ec4899",
  friends: "#f97316",
};

const getLookingForChipStyle = (interest) => {
  const key = String(interest || "").trim().toLowerCase();
  const color = LOOKING_FOR_CHIP_COLORS[key] || "#818cf8";
  return {
    "--profile-looking-for-color": color,
    "--profile-looking-for-bg": `${color}24`,
    "--profile-looking-for-border": `${color}80`,
  };
};

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
  () => meId.value,
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
  selectedUserPanelView.value = "bio";
});

watch(
  selectedUserId,
  (userId) => {
    loadSelectedUserPhotosData(userId);
  },
  { immediate: true }
);

watch(
  () => auth.authStatus,
  () => {
    if (selectedUserId.value) {
      loadSelectedUserPhotosData(selectedUserId.value);
    }
  }
);

watch(
  selectedUserId,
  (userId) => {
    loadPeerPreferredLocale(userId);
  },
  { immediate: true }
);

watch(
  [() => meId.value, selectedUserId],
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

async function loadLanguagePracticeSession() {
  if (
    !isLanguagePracticeModeRequested.value ||
    !meId.value ||
    !selectedUserId.value ||
    (isAdmin.value && asUserId.value)
  ) {
    languagePracticeSession.value = null;
    return;
  }

  const ownerId = String(meId.value);
  const selectedPeerId = String(selectedUserId.value);
  languagePracticeSession.value = null;

  try {
    const session = await fetchActiveLanguagePracticeSession(selectedPeerId);
    if (String(selectedUserId.value || "") !== selectedPeerId) return;

    const learnerId = String(session?.learner_user_id || "");
    const partnerId = String(session?.partner_user_id || "");
    const matchesSelectedPair =
      session &&
      ((learnerId === ownerId && partnerId === selectedPeerId) ||
        (learnerId === selectedPeerId && partnerId === ownerId));

    languagePracticeSession.value = matchesSelectedPair ? session : null;
    if (matchesSelectedPair) {
      chat.addActivePeer(selectedPeerId);
      mergeActiveChatIds([selectedPeerId]);
    }
  } catch (error) {
    console.warn("[chat][language-practice] session load failed:", error);
    if (String(selectedUserId.value || "") === selectedPeerId) {
      languagePracticeSession.value = null;
    }
  }
}

watch(
  [() => meId.value, selectedUserId, isLanguagePracticeModeRequested],
  loadLanguagePracticeSession,
  {
    immediate: true,
  }
);

async function loadLanguagePracticeIndicators() {
  if (!meId.value || (isAdmin.value && asUserId.value)) {
    languagePracticeSessionUserIds.value = [];
    return;
  }

  const requestedUserIds = languagePracticeIndicatorUserIds.value;
  if (!requestedUserIds.length) {
    languagePracticeSessionUserIds.value = [];
    return;
  }

  const requestedKey = languagePracticeIndicatorUserIdsKey.value;

  try {
    const response = await $fetch("/api/language-practice/indicators", {
      query: {
        userIds: requestedKey,
      },
    });

    if (languagePracticeIndicatorUserIdsKey.value !== requestedKey) return;

    languagePracticeSessionUserIds.value = Array.isArray(response?.session_user_ids)
      ? response.session_user_ids
      : [];
  } catch (error) {
    console.warn("[chat][language-practice] indicator load failed:", error);
    if (languagePracticeIndicatorUserIdsKey.value === requestedKey) {
      languagePracticeSessionUserIds.value = [];
    }
  }
}

function showLanguagePracticeToast(message, color = "primary") {
  languagePracticeToastMessage.value = message;
  languagePracticeToastColor.value = color;
  languagePracticeToastOpen.value = true;
}

watch(
  [() => meId.value, languagePracticeIndicatorUserIdsKey],
  loadLanguagePracticeIndicators,
  {
    immediate: true,
  }
);

// stable key for typing channel / DM room
const conversationKey = computed(() =>
  meId.value && peerId.value
    ? [String(meId.value), String(peerId.value)].sort().join(":")
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
  PREAUTH_STATUSES.includes(auth.authStatus)
);

// ———————————————————————————————————————————
// Props
// ———————————————————————————————————————————
const props = defineProps({
  user: Object,
  userProfile: Object,
  authStatus: { type: String, required: true },
  showMobileControls: { type: Boolean, default: true },
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
  PREAUTH_STATUSES.includes(auth.authStatus)
);
const isBotSelected = computed(() => {
  const sel = chat.selectedUser;
  return isImchattyUser(sel);
});
const canSend = computed(() => {
  if (!auth.isProfileComplete) return false;
  if (isBotSelected.value) return true;
  return ["anon_authenticated", "authenticated"].includes(auth.authStatus);
});

const MOOD_MAX_ATTEMPTS = 3;
const moodPromptBusy = ref(false);
const moodPromptDeferTimer = ref(null);
const lastBotSubmission = ref({ text: "", at: 0 });
const moodQuickReplies = computed(() => {
  if (draftStore.moodFeedStage === "confirm") {
    return [t("onboarding.yes"), t("onboarding.no")];
  }
  if (draftStore.moodFeedStage === "prompt") {
    return [];
  }
  return [];
});

const showMoodQuickReplies = computed(
  () =>
    ["authenticated", "anon_authenticated"].includes(auth.authStatus) &&
    isBotSelected.value &&
    ["prompt", "confirm"].includes(draftStore.moodFeedStage)
);

const liveMoodConfirmQuickReplies = computed(() => {
  if (
    draftStore.liveMoodStage === "confirm" &&
    String(selectedUserId.value || "") ===
      String(draftStore.liveMoodPersonaUserId || "")
  ) {
    return [
      t("onboarding.yes"),
      t("onboarding.close"),
      t("onboarding.notReally"),
    ];
  }
  return [];
});

const liveMoodClarifierQuickReplies = computed(() => {
  if (
    draftStore.liveMoodStage === "clarify" &&
    String(selectedUserId.value || "") ===
      String(draftStore.liveMoodPersonaUserId || "")
  ) {
    return Array.isArray(draftStore.liveMoodClarifierOptions)
      ? draftStore.liveMoodClarifierOptions
      : [];
  }
  return [];
});

const showLiveMoodConfirmQuickReplies = computed(
  () =>
    ["authenticated", "anon_authenticated"].includes(auth.authStatus) &&
    liveMoodConfirmQuickReplies.value.length > 0
);

const showLiveMoodClarifierQuickReplies = computed(
  () =>
    ["authenticated", "anon_authenticated"].includes(auth.authStatus) &&
    liveMoodClarifierQuickReplies.value.length > 0
);

const MATCH_FILTER_PILLS = ["🟢 Online", "⭕ Offline", "🤖 AI", "🎲 Random"];
const languagePracticePostOnboardingQuickReplies = computed(() => [
  t("onboarding.languagePractice.quickReplies.browsePartners"),
  t("onboarding.languagePractice.quickReplies.answerMoodQuestion"),
  t("onboarding.languagePractice.quickReplies.keepChatting"),
]);

const liveMoodNextStepQuickReplies = computed(() => {
  if (
    ["choose", "dormant", "matched", "language_practice"].includes(
      draftStore.liveMoodNextStepStage
    ) &&
    String(selectedUserId.value || "") ===
      String(draftStore.liveMoodPersonaUserId || "")
  ) {
    if (draftStore.liveMoodNextStepStage === "language_practice") {
      return languagePracticePostOnboardingQuickReplies.value;
    }
    if (draftStore.liveMoodNextStepStage === "dormant") {
      return ["Find a match"];
    }
    if (draftStore.liveMoodNextStepStage === "matched") {
      return MATCH_FILTER_PILLS;
    }
    return getLiveMoodNextStepChoices(draftStore.liveMoodCandidate);
  }
  return [];
});

const showLiveMoodNextStepQuickReplies = computed(
  () =>
    ["authenticated", "anon_authenticated"].includes(auth.authStatus) &&
    liveMoodNextStepQuickReplies.value.length > 0
);

const threadQuickReplies = computed(() =>
  showLiveMoodClarifierQuickReplies.value
    ? liveMoodClarifierQuickReplies.value
    : showLiveMoodConfirmQuickReplies.value
    ? liveMoodConfirmQuickReplies.value
    : showLiveMoodNextStepQuickReplies.value
    ? liveMoodNextStepQuickReplies.value
    : moodQuickReplies.value
);

const showThreadQuickReplies = computed(
  () =>
    showLiveMoodClarifierQuickReplies.value ||
    showLiveMoodConfirmQuickReplies.value ||
    showLiveMoodNextStepQuickReplies.value ||
    showMoodQuickReplies.value
);

watch(
  () => auth.authStatus,
  (status) => {
    if (["authenticated", "anon_authenticated"].includes(status)) {
      maybeTriggerMoodPrompt();
    }
  }
);

onMounted(() => {
  if (["authenticated", "anon_authenticated"].includes(auth.authStatus)) {
    maybeTriggerMoodPrompt();
  }
});

const MOOD_WORDS = {
  yes: {
    en: ["yes", "y", "yeah", "yep", "sure", "ok", "okay"],
    fr: ["oui", "o", "d'accord", "ok"],
    ru: ["да", "ок", "ok", "хорошо"],
    zh: ["是", "好", "好的", "行", "可以", "ok"],
  },
  no: {
    en: ["no", "n", "nope", "nah"],
    fr: ["non", "n"],
    ru: ["нет", "не"],
    zh: ["不", "不是", "不对", "不行", "不可以"],
  },
  skip: {
    en: ["skip", "later", "not now"],
    fr: ["passer", "plus tard", "pas maintenant"],
    ru: ["пропустить", "позже", "не сейчас"],
    zh: ["跳过", "稍后", "现在不"],
  },
};

const SOFT_MOOD_YES_WORDS = {
  en: [
    "mostly",
    "pretty much",
    "thats right",
    "that's right",
    "sounds right",
    "kind of",
    "sort of",
    "that is better",
    "thats better",
    "that's better",
    "better",
    "yeah that is better",
    "yeah thats better",
    "yeah that's better",
    "yes thats better",
    "yes that's better",
  ],
  fr: [
    "c est mieux",
    "cest mieux",
    "c est bien",
    "oui c est mieux",
    "oui cest mieux",
    "mieux",
    "ca va",
    "ça va",
    "ca me va",
    "ça me va",
  ],
  ru: [
    "так лучше",
    "это лучше",
    "да так лучше",
    "вроде да",
    "пожалуй",
  ],
  zh: [
    "这样更对",
    "这样更好",
    "这更像",
    "是这样",
  ],
};

const MOOD_CLOSE_WORDS = {
  en: ["close", "pretty close", "close enough", "kind of", "sort of"],
  fr: ["plutot", "plutôt", "presque", "assez proche"],
  ru: ["почти", "близко", "скорее да"],
  zh: ["接近", "差不多", "比较接近"],
};

const LIVE_MOOD_DIRECT_HINTS = {
  emotion: {
    lonely: {
      en: ["lonely", "alone"],
      fr: ["seul", "seule", "solitaire"],
      ru: ["одиноко", "одинок", "одинока"],
      zh: ["孤独", "寂寞"],
    },
    calm: {
      en: ["calm", "chill", "relaxed"],
      fr: ["calme", "tranquille", "posé"],
      ru: ["спокойно", "спокойный", "спокойная"],
      zh: ["平静", "轻松", "冷静"],
    },
    annoyed: {
      en: ["annoyed", "irritated"],
      fr: ["agacé", "agace", "énervé", "enerve"],
      ru: ["раздражен", "раздражена", "раздражает"],
      zh: ["烦", "烦躁"],
    },
    overwhelmed: {
      en: ["overwhelmed", "stressed", "exhausted"],
      fr: ["submergé", "submerge", "stressé", "stresse", "débordé", "deborde"],
      ru: ["перегружен", "перегружена", "устал", "устала"],
      zh: ["不堪重负", "压力大", "累坏了"],
    },
    playful: {
      en: ["playful", "fun", "flirty"],
      fr: ["joueur", "taquin", "drague"],
      ru: ["игриво", "игривый", "флирт"],
      zh: ["俏皮", "调情", "好玩"],
    },
    curious: {
      en: ["curious", "wondering", "thinking"],
      fr: ["curieux", "curieuse", "je pense", "réfléchis", "reflechis"],
      ru: ["любопытно", "интересно", "думаю"],
      zh: ["好奇", "在想", "思考"],
    },
    hopeful: {
      en: ["hopeful", "optimistic", "romantic"],
      fr: ["plein d espoir", "pleine d espoir", "optimiste", "romantique"],
      ru: ["надеюсь", "надежда", "романтично"],
      zh: ["有希望", "期待", "浪漫"],
    },
    sad: {
      en: ["sad", "down", "upset"],
      fr: ["triste", "abattu"],
      ru: ["грустно", "печально"],
      zh: ["难过", "伤心"],
    },
  },
  intent: {
    be_heard: {
      en: ["be heard", "listen to me", "hear me out", "vent"],
      fr: ["m ecouter", "écouter", "ecouter", "vider mon sac"],
      ru: ["выслушай", "выговориться", "хочу чтобы меня выслушали"],
      zh: ["听我说", "倾诉", "想被听见"],
    },
    listen: {
      en: ["listen", "listener", "someone to listen"],
      fr: ["écouter", "ecouter", "quelqu un pour écouter", "oreille attentive"],
      ru: ["послушать", "слушать", "кто то чтобы выслушал"],
      zh: ["听", "倾听", "有人听我说"],
    },
    distract_me: {
      en: ["distract me", "take my mind off", "light"],
      fr: ["distrais moi", "me changer les idées", "leger", "légère", "legere"],
      ru: ["отвлеки", "отвлечься"],
      zh: ["分散注意力", "让我转移一下", "轻松点"],
    },
    deep_talk: {
      en: ["deep", "deep talk", "serious", "real talk"],
      fr: ["profond", "discussion profonde", "parler sérieusement", "parler serieusement"],
      ru: ["глубоко", "глубокий разговор", "серьезно", "серьезный разговор"],
      zh: ["深入", "深聊", "认真聊"],
    },
    casual_chat: {
      en: ["casual", "casual chat", "light chat", "chill chat"],
      fr: ["discussion légère", "discussion legere", "léger", "leger", "tranquille"],
      ru: ["просто поболтать", "легкий разговор", "спокойно поболтать"],
      zh: ["随便聊", "轻松聊", "闲聊"],
    },
    meet_someone_similar: {
      en: ["someone similar", "same mood", "like me"],
      fr: ["quelqu un comme moi", "meme humeur", "même humeur"],
      ru: ["кто то похожий", "в таком же настроении", "как я"],
      zh: ["类似的人", "一样心情的人", "和我一样"],
    },
  },
  energy: {
    drained: {
      en: ["drained", "tired", "low energy", "exhausted"],
      fr: ["fatigué", "fatigue", "fatiguée", "épuisé", "epuise"],
      ru: ["устал", "устала", "без сил"],
      zh: ["累", "疲惫", "没劲"],
    },
    normal: {
      en: ["normal", "fine", "steady"],
      fr: ["normal", "ça va", "ca va"],
      ru: ["нормально", "обычно"],
      zh: ["还好", "正常", "一般"],
    },
    wired: {
      en: ["wired", "energized", "hyped"],
      fr: ["énergique", "energetique", "à fond", "a fond"],
      ru: ["энергично", "заряжен", "заряжена"],
      zh: ["兴奋", "有劲", "精力很足"],
    },
  },
};

const moodLocaleKey = computed(() => normalizeLocale(locale.value) || "en");
const canSeeHoneyBots = computed(() => auth.authStatus !== "authenticated");

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesMoodWord(value, group, labelFallback = "") {
  const norm = normalizeText(value);
  if (!norm) return false;
  const lang = moodLocaleKey.value || "en";
  const words = MOOD_WORDS[group]?.[lang] || [];
  const label = normalizeText(labelFallback);
  return words.includes(norm) || (label && norm === label);
}

function isMoodYes(text) {
  return matchesMoodWord(text, "yes", t("onboarding.yes"));
}
function isMoodNo(text) {
  return matchesMoodWord(text, "no", t("onboarding.no"));
}
function isMoodSkip(text) {
  return matchesMoodWord(text, "skip", t("onboarding.moodFeed.skip"));
}

function isDuplicateBotSubmission(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const now = Date.now();
  const prev = lastBotSubmission.value || {};
  const isDuplicate =
    prev.text === normalized &&
    now - Number(prev.at || 0) < 1200;
  lastBotSubmission.value = { text: normalized, at: now };
  return isDuplicate;
}

function onThreadQuickReply(label) {
  if (!label) return;
  onSend(label, { bypassTranslationPrompt: true });
}

function buildUsersWithPresence({ includeLanguagePracticeAi = false } = {}) {
  // ——— presence dependency (reactive) ———
  // console.log('[usersWithPresence] src len =', Array.isArray(chat.users) ? chat.users.length : 'n/a');

  const realtimeSet = new Set(realtimeIds.value);
  const recentActiveSet = new Set(recentActiveNormalized.value);

  const resolvePresenceKey = (u) =>
    String(u?.user_id ?? u?.auth_user_id ?? u?.uid ?? u?.id ?? "")
      .trim()
      .toLowerCase();

  const meKey = String(meId.value ?? "")
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
      const isImchatty = isImchattyUser(u);

      const isHoneyBot = !!u.is_ai && !!u.honey_enabled;
      let presence = "offline";
      if (manualStatus === "away") {
        presence = "away";
      } else if (manualStatus === "offline" && !forcedOnline && !isImchatty) {
        presence = "offline";
      } else if (isImchatty) {
        // ImChatty should always be available as the pinned onboarding bot.
        presence = "online";
      } else if (u.is_ai && !isHoneyBot) {
        presence = "online";
      } else if (forcedOnline) {
        // Honey bots can be managed via simulated-presence controls.
        // For these, "force online" should make them appear as online.
        presence = "online";
      } else if (isRealtimeOnline) {
        presence = "online";
      } else if (isRecentActive) {
        presence = "away";
      } else if (u.agent_enabled === true) {
        presence = "agent";
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
    .filter((u) => {
      if (isImchattyUser(u)) return true;
      const isHoneyBot = !!u?.is_ai && !!u?.honey_enabled;
      return isHoneyBot ? canSeeHoneyBots.value : true;
    })
    // hide AI if toggled off; Honey + simulated users are treated as real users
      .filter((u) => {
        if (isImchattyUser(u)) return true;
        if (showAIUsers.value) return true;
        const isHoneySimulated = !!u.is_ai && !!u.honey_enabled && !!u.is_simulated;
        return !u.is_ai || isHoneySimulated;
      })
      .filter((u) => {
        if (isImchattyUser(u)) return true;
        if (!u?.is_ai || !showAIUsers.value) return true;
        if (includeLanguagePracticeAi) return true;
        return !u?.language_practice_enabled;
      })
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
  const pinned = list.find((u) => isImchattyUser(u));
  const others = list.filter((u) => !isImchattyUser(u));

  const sortRank = (u) => {
    if (!u?.is_ai) return 0;
    if (auth.authStatus === "anon_authenticated") return u.honey_enabled ? 1 : 2;
    return u.counterpoint_enabled ? 1 : 2;
  };

  return [
    ...(pinned ? [pinned] : []),
    ...others.sort((a, b) => {
      const rankDiff = sortRank(a) - sortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.displayname || "").localeCompare(b.displayname || "");
    }),
  ];
}

const usersWithPresence = computed(() =>
  buildUsersWithPresence({ includeLanguagePracticeAi: showLanguagePracticeAIUsers.value })
);

const activePanelUsersWithPresence = computed(() =>
  buildUsersWithPresence({ includeLanguagePracticeAi: true })
);

const preauthBotDefaultApplied = ref(false);

watch(
  () => [isPreAuth.value, usersWithPresence.value.length, selectedUserId.value],
  ([preAuth]) => {
    if (!preAuth) {
      preauthBotDefaultApplied.value = false;
      return;
    }
    if (preauthBotDefaultApplied.value) return;
    const bot = usersWithPresence.value.find(
      (u) => isImchattyUser(u)
    );
    if (!bot) return;
    if (String(selectedUserId.value || "") !== IMCHATTY_ID) {
      chat.setSelectedUser(bot);
    }
    preauthBotDefaultApplied.value = true;
  },
  { immediate: true }
);

const selectedUserRaw = computed(() => chat.selectedUser || null);

const selectedUser = computed(() => {
  const raw = selectedUserRaw.value;
  if (!raw) return null;
  const rawId = raw.user_id ?? raw.id;
  const rawSlug = String(
    raw.slug ?? raw.profile_slug ?? raw.username_slug ?? ""
  )
    .trim()
    .toLowerCase();
  if (!rawId && !rawSlug) return raw;
  const match = usersWithPresence.value.find((u) => {
    const uid = u.user_id ?? u.id;
    if (rawId && String(uid) === String(rawId)) return true;
    const slug = String(
      u.slug ?? u.profile_slug ?? u.username_slug ?? ""
    )
      .trim()
      .toLowerCase();
    return !!(rawSlug && slug && rawSlug === slug);
  });
  return match || raw;
});

const selectedUserDecorationFallback = ref("");
let selectedUserDecorationRequest = 0;

const selectedUserAvatarDecorationUrl = computed(
  () =>
    selectedUser.value?.avatar_decoration_url ||
    selectedUserDecorationFallback.value ||
    ""
);

watch(
  () => ({
    userId: selectedUser.value?.user_id || selectedUser.value?.id || "",
    inlineDecoration: selectedUser.value?.avatar_decoration_url || "",
  }),
  async ({ userId, inlineDecoration }) => {
    const requestId = ++selectedUserDecorationRequest;
    if (inlineDecoration) {
      selectedUserDecorationFallback.value = "";
      return;
    }
    if (!userId) {
      selectedUserDecorationFallback.value = "";
      return;
    }
    try {
      const url = await getAvatarDecorationFromId(userId);
      if (requestId !== selectedUserDecorationRequest) return;
      selectedUserDecorationFallback.value = typeof url === "string" ? url : "";
    } catch (err) {
      if (requestId !== selectedUserDecorationRequest) return;
      selectedUserDecorationFallback.value = "";
      console.warn("[chat] failed to fetch selected-user decoration:", err);
    }
  },
  { immediate: true }
);

const selectedUserPresence = computed(() => {
  if (isImchattyUser(selectedUser.value)) {
    return "online";
  }
  if (isSelfSelected.value) {
    const selfKey = String(meId.value ?? "")
      .trim()
      .toLowerCase();
    if (selfKey && realtimeIds.value.includes(selfKey)) {
      return "online";
    }
  }
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

function chatUserId(u) {
  const id = u?.user_id ?? u?.id ?? u?.auth_user_id ?? u?.uid;
  const normalized = String(id ?? "").trim();
  return normalized || null;
}

function isKnownLanguagePracticePeer(user) {
  const peerId = chatUserId(user);
  if (!peerId) return false;
  return languagePracticeSessionUserIds.value.some(
    (id) => String(id) === String(peerId)
  );
}

function promotePeerToActive(peerId) {
  if (!peerId) return;
  chat.addActivePeer(peerId);
  mergeActiveChatIds([peerId]);
}

function selectUser(u) {
  chat.setSelectedUser(u);
  const peerId = chatUserId(u);
  if (peerId && isKnownLanguagePracticePeer(u)) {
    promotePeerToActive(peerId);
  }
  if (smAndDown.value) {
    leftOpen.value = false;
    rightOpen.value = false;
  }
}

async function setLanguagePracticeRouteMode(enabled, user = null) {
  const peerId = user ? chatUserId(user) : selectedUserId.value;
  if (enabled && !peerId) return;

  if (user) {
    selectUser(user);
  }

  const query = { ...route.query };
  if (enabled) {
    query.mode = "language";
    query.userId = peerId;
  } else {
    delete query.mode;
  }

  await router.replace({ path: route.path, query });

  if (enabled) {
    promotePeerToActive(peerId);
    await nextTick();
    await loadLanguagePracticeSession();
    return;
  }

  languagePracticeSession.value = null;
}

function activateLanguagePracticeChat(user) {
  setLanguagePracticeRouteMode(true, user);
}

function deactivateLanguagePracticeMode() {
  setLanguagePracticeRouteMode(false);
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
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", onOverlayKeydown);
  }
  if (consentAutoHideTimer.value) {
    clearTimeout(consentAutoHideTimer.value);
    consentAutoHideTimer.value = null;
  }
  if (recentActiveTimer) {
    clearInterval(recentActiveTimer);
    recentActiveTimer = null;
  }
  if (moodPromptDeferTimer.value) {
    clearTimeout(moodPromptDeferTimer.value);
    moodPromptDeferTimer.value = null;
  }
  if (shareToastTimer.value) {
    clearTimeout(shareToastTimer.value);
    shareToastTimer.value = null;
  }
  if (languagePracticeToastTimer.value) {
    clearTimeout(languagePracticeToastTimer.value);
    languagePracticeToastTimer.value = null;
  }
});

function openDeleteDialog(user) {
  deleteTarget.value = user || null;
  deleteError.value = "";
  deleteDialog.value = !!user;
}

async function endLanguagePracticeChat(user) {
  const candidatePeerIds = [
    user?.user_id,
    user?.id,
    user?.auth_user_id,
    user?.uid,
  ]
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  const peerId = candidatePeerIds[0] || null;
  if (!peerId) return;

  try {
    await endLanguagePracticeSession(peerId);
    languagePracticeSessionUserIds.value = languagePracticeSessionUserIds.value.filter(
      (id) => String(id) !== String(peerId)
    );
    if (String(selectedUserId.value || "") === String(peerId)) {
      languagePracticeSession.value = null;
    }
    await loadLanguagePracticeIndicators();
    showLanguagePracticeToast(
      t("components.activeChats.end-language-practice-success")
    );
  } catch (error) {
    console.warn("[chat][language-practice] end session failed:", error);
    showLanguagePracticeToast(
      error?.data?.statusMessage ||
        error?.data?.message ||
        t("components.activeChats.end-language-practice-error"),
      "error"
    );
  }
}

function closeDeleteDialog() {
  deleteDialog.value = false;
  deleteTarget.value = null;
  deleteError.value = "";
}

async function confirmDeleteChat() {
  if (!deleteTarget.value || !meId.value) return;
  const candidatePeerIds = [
    deleteTarget.value.user_id,
    deleteTarget.value.id,
    deleteTarget.value.auth_user_id,
    deleteTarget.value.uid,
  ]
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);
  if (!candidatePeerIds.length) return;

  const unreadKeys = Object.keys(msgs?.unreadByPeer || {});
  const peerId =
    candidatePeerIds.find((id) => unreadKeys.includes(id)) ||
    candidatePeerIds[0];
  if (!peerId) return;

  deletingChat.value = true;
  deleteError.value = "";
  try {
    const err = await deleteChatWithUser(meId.value, peerId);
    if (err) throw err;

    // update active list + unread counts locally
    const peerIdStr = String(peerId);
    chat.activeChats = (chat.activeChats || []).filter(
      (id) => String(id) !== peerIdStr
    );
    activeChats.value = (activeChats.value || []).filter(
      (id) => String(id) !== peerIdStr
    );
    if (msgs?.clearUnreadForPeers) {
      msgs.clearUnreadForPeers([peerIdStr, ...candidatePeerIds]);
    } else if (msgs?.unreadByPeer) {
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
const lastAppliedRouteSelectionKey = ref(null);

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
  const q = route.query;
  const id = normStr(q.userId ?? q.id);
  const slug = normStr(q.userslug ?? q.slug);
  const wantsImChatty =
    Object.prototype.hasOwnProperty.call(q, "imchatty") ||
    normStr(q.imchatty) === "true";
  const selectionKey = [id || "", slug || "", wantsImChatty ? "1" : "0"].join("|");
  if (!id && !slug && !wantsImChatty) return;
  if (selectionKey === lastAppliedRouteSelectionKey.value) return;

  let target = null;
  if (id || slug) {
    target = findUserByIdOrSlug({ id, slug });
  } else if (wantsImChatty) {
    target = findUserByIdOrSlug({ id: IMCHATTY_ID, slug: null });
  }

  if (target) {
    chat.setSelectedUser(target);
    lastAppliedRouteSelectionKey.value = selectionKey;
  }
}

// ---- Lifecycle
onMounted(async () => {
  draftStore.hydrate?.();
  refreshActiveChats();

  await chat.fetchChatUsers();
  await chat.fetchActiveChats(meId.value);
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

watch(() => meId.value, refreshActiveChats);

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
    route.query.userslug,
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

const toastColorClass = (color) => {
  if (color === "error" || color === "red") return "chat-toast--danger";
  if (color === "success" || color === "green") return "chat-toast--success";
  return "chat-toast--primary";
};

const startToastTimer = (flagRef, timerRef, timeout = 2500) => {
  if (timerRef.value) {
    clearTimeout(timerRef.value);
  }
  if (!flagRef.value) {
    timerRef.value = null;
    return;
  }
  timerRef.value = setTimeout(() => {
    flagRef.value = false;
    timerRef.value = null;
  }, timeout);
};

watch(translationPromptOpen, (open) => {
  if (!open) resetTranslationPromptState();
});

watch(shareToast, () => {
  startToastTimer(shareToast, shareToastTimer);
});

watch(languagePracticeToastOpen, () => {
  startToastTimer(languagePracticeToastOpen, languagePracticeToastTimer);
});

const onOverlayKeydown = (event) => {
  if (event.key !== "Escape") return;
  if (leftOpen.value) {
    leftOpen.value = false;
    return;
  }
  if (rightOpen.value) {
    rightOpen.value = false;
    return;
  }
  if (deleteDialog.value) {
    closeDeleteDialog();
    return;
  }
  if (translationPromptOpen.value) {
    translationPromptOpen.value = false;
  }
};

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", onOverlayKeydown);
  }
});

const maybePromptTranslation = async (text, selectedPeer, toId, sendingToBot) => {
  if (!text) return true;
  if (sendingToBot || selectedPeer?.is_ai) return true;
  if (languagePracticeSession.value) return true;
  const ownerId = meId.value;
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

  const ownerId = meId.value;
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

async function triggerAwayAgentReply(agentUserId) {
  const id = String(agentUserId || "").trim();
  if (!id) return;
  try {
    await $fetch("/api/agent/reactive-reply", {
      method: "POST",
      body: { agentUserId: id },
    });
  } catch (err) {
    console.warn("[away-agent] immediate reply trigger failed:", err?.message || err);
  }
}

async function onSend(
  text,
  { bypassTranslationPrompt = false, translationMode = null } = {}
) {
  const selectedPeer = selectedUser.value || chat.selectedUser;
  const toId = selectedPeer?.user_id || selectedPeer?.id;
  const sendingToBot = toId === IMCHATTY_ID;
  let moodHandled = false;
  let aiFollowupContext = null;
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

  const liveMoodCaptureActive =
    ["prompt", "confirm", "clarify"].includes(draftStore.liveMoodStage || "idle") &&
    String(toId || "") === String(draftStore.liveMoodPersonaUserId || "");
  if (liveMoodCaptureActive) {
    regRef.value?.setTyping?.(true);
    try {
      const handled = await handleLiveMoodCaptureMessage(text, {
        peerId: toId,
        peer: selectedPeer,
      });
      if (handled) return;
    } finally {
      regRef.value?.setTyping?.(false);
    }
  }

  const liveMoodNextStepActive =
    ["choose", "dormant", "matched", "language_practice"].includes(
      draftStore.liveMoodNextStepStage || "idle"
    ) &&
    String(toId || "") === String(draftStore.liveMoodPersonaUserId || "");
  if (liveMoodNextStepActive) {
    regRef.value?.setTyping?.(true);
    try {
      const handled = await handleLiveMoodNextStepMessage(text, {
        peerId: toId,
        peer: selectedPeer,
      });
      if (handled) return;
    } finally {
      regRef.value?.setTyping?.(false);
    }
  }

  if (sendingToBot) {
    const stageBeforeMood = draftStore.moodFeedStage || "idle";
    if (isDuplicateBotSubmission(text)) return;
    const moodCaptureActive = ["prompt", "confirm"].includes(stageBeforeMood);
    if (moodCaptureActive) {
      regRef.value?.setTyping?.(true);
    }
    const allowPostMoodFollowup =
      stageBeforeMood === "confirm" && isMoodYes(text);
    if (allowPostMoodFollowup) {
      aiFollowupContext = {
        prompt: String(draftStore.moodFeedPrompt || "").trim(),
        original: String(draftStore.moodFeedAnswer || "").trim(),
        refined: String(draftStore.moodFeedRefined || "").trim(),
      };
    }
    let handled = false;
    try {
      handled = await handleMoodFeedMessage(text, { sendingToBot });
    } finally {
      if (moodCaptureActive && !allowPostMoodFollowup) {
        regRef.value?.setTyping?.(false);
      }
    }
    if (handled) {
      moodHandled = true;
      // Keep mood capture exclusive except for confirm+yes, where we let
      // the regular AI continue so the dialog can flow naturally.
      if (!allowPostMoodFollowup) return;
    }
  }

  // translate if needed (DM only)
  let translationPayload = null;
  const mode = languagePracticeSession.value
    ? "never"
    : translationMode || translationPref.value?.mode || "ask";
  const shouldTranslate = mode === "always" || mode === "once";
  const targetLocale = peerPreferredLocale.value;
  if (shouldTranslate && targetLocale && !sendingToBot) {
    translationPayload = await translateChatMessage(text, targetLocale);
  }

  // optimistic local send
  let sentMessagePromise = null;
  if (!moodHandled) {
    sentMessagePromise =
      regRef.value?.appendLocalAndSend?.(text, translationPayload) || null;
  }

  const isAwayAgentPeer =
    selectedPeer &&
    !selectedPeer.is_ai &&
    !sendingToBot &&
    (selectedPeer.presence === "away" ||
      selectedPeer.presence === "agent" ||
      selectedPeer.agent_enabled === true);

  if (
    isAwayAgentPeer
  ) {
    const toKey = String(toId || "").trim().toLowerCase();
    const isRecentlyActive = recentActiveNormalized.value.includes(toKey);
    if (!isRecentlyActive && canShowAwayNotice(toId)) {
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
        senderAvatar: "/images/robot.png",
      });
      setTimeout(() => regRef.value?.setTyping?.(false), 700);
      markAwayNoticeShown(toId);
    }

    await sentMessagePromise;
    triggerAwayAgentReply(toId);
  }

  // BOT path only
  if ((selectedPeer?.is_ai || sendingToBot) && meId.value && toId) {
    if (
      selectedPeer?.is_ai &&
      String(selectedPeer?.user_id || selectedPeer?.id || "") !== IMCHATTY_ID &&
      selectedPeer?.honey_enabled &&
      auth.authStatus === "authenticated"
    ) {
      regRef.value?.appendPeerLocal?.(
        "This profile is currently unavailable. Please choose another user."
      );
      return;
    }

    const isHoneyCapability =
      auth.authStatus !== "authenticated" && !!selectedPeer?.honey_enabled;
    const resolveHoneyTypingDelayMs = () => {
      if (!isHoneyCapability) return 0;
      const minMs = Math.max(0, Number(selectedPeer?.honey_delay_min_ms ?? 0));
      const maxMs = Math.max(minMs, Number(selectedPeer?.honey_delay_max_ms ?? minMs));
      if (maxMs <= 0) return 0;
      if (maxMs === minMs) return minMs;
      return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    };
    const typingStartDelayMs = resolveHoneyTypingDelayMs();
    let typingDelayTimer = null;
    let typingShown = false;
    const startTypingIndicator = () => {
      regRef.value?.setTyping?.(true);
      typingShown = true;
    };
    if (typingStartDelayMs > 0) {
      typingDelayTimer = setTimeout(() => {
        startTypingIndicator();
      }, typingStartDelayMs);
    } else {
      startTypingIndicator();
    }

    const { allowed, used, remaining, limit } = await tryConsume();
    if (!allowed) {
      const msg = limitReachedMessage(auth.authStatus, limit);

      // 1) show in current thread
      regRef.value?.appendPeerLocal?.(msg);

      // 2) persist (current bot thread)
      try {
        await insertMessage(meId.value, toId, msg);
      } catch (e) {}

      // 3) also persist to ImChatty thread (optional)
      try {
        const imchatty = chat.getUserById?.(IMCHATTY_ID);
        if (imchatty) {
          await insertMessage(meId.value, IMCHATTY_ID, msg);
          chat.addActivePeer?.(IMCHATTY_ID);
        }
      } catch (e) {}

      if (typingDelayTimer) clearTimeout(typingDelayTimer);
      if (typingShown) regRef.value?.setTyping?.(false);
      return;
    }

    const history = regRef.value?.getLastMessages?.(10, selectedPeer) || [];
    const assistantTurn = (regRef.value?.getAssistantTurnCount?.() || 0) + 1;
    const replyTo = replyingToMessage.value?.content ?? null;
    const aiUserInput =
      sendingToBot && aiFollowupContext
        ? `The user just confirmed a mood-feed entry. Continue the chat naturally with an empathetic follow-up about this context, not a generic greeting.\nMood prompt: ${aiFollowupContext.prompt || "(none)"}\nUser original response: ${aiFollowupContext.original || text}\nRefined entry: ${aiFollowupContext.refined || aiFollowupContext.original || text}`
        : text;

    try {
      const requestedCapability =
        languagePracticeSession.value && selectedPeer?.is_ai
          ? "language_practice"
          : auth.authStatus !== "authenticated" && selectedPeer?.honey_enabled
          ? "honey"
          : selectedPeer?.counterpoint_enabled
          ? "counterpoint"
          : selectedPeer?.editorial_enabled
          ? "editorial"
          : "counterpoint";
      if (endedAiPeers.value.has(String(toId))) {
        return;
      }
      const aiResult = await fetchAiResponse(
        aiUserInput,
        selectedPeer,
        userProfile.value,
        history,
        replyTo,
        requestedCapability,
        assistantTurn
      );
      const aiText = aiResult?.text ?? null;
      if (aiResult?.chatEnded) {
        endedAiPeers.value.add(String(toId));
      }
      if (aiText) {
        regRef.value?.appendPeerLocal?.(aiText);
        await insertMessage(meId.value, toId, aiText);
      }
    } catch (e) {
      console.error("[AI] fetch/insert failed", e);
    } finally {
      if (typingDelayTimer) clearTimeout(typingDelayTimer);
      // ✅ always clear local typing bubble for bot
      if (typingShown) regRef.value?.setTyping?.(false);
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

async function pushMoodBotMessage(text) {
  if (!text || !meId.value) return;
  if (isBotSelected.value) {
    regRef.value?.appendPeerLocal?.(text, {
      senderId: IMCHATTY_ID,
      senderName: "ImChatty",
      senderAvatar: "/images/robot.png",
    });
  }
  try {
    await insertMessage(meId.value, IMCHATTY_ID, text);
    chat.addActivePeer?.(IMCHATTY_ID);
  } catch (err) {
    console.warn("[mood-feed] bot message insert failed:", err?.message || err);
  }
}

function formatChoiceLabel(value) {
  return String(value || "")
    .trim()
    .replace(/_/g, " ");
}

function capitalizeFirstLetter(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeLiveMoodCandidate(candidate = {}) {
  const intent = formatChoiceLabel(candidate.intent || "");
  const emotion = formatChoiceLabel(candidate.emotion || "");
  const energy = String(candidate.energy || "").trim().toLowerCase();

  if (intent === "casual chat" && emotion === "calm") {
    return "a calm, casual chat";
  }
  if (intent === "be heard" && emotion === "calm") {
    return energy === "drained"
      ? "someone calm to listen while you keep it low-key"
      : "someone calm to listen";
  }
  if (intent === "be heard" && emotion) {
    return `someone to listen while you feel ${emotion}`;
  }
  if (intent === "distract me") {
    return "something light to take your mind off things";
  }
  if (intent === "deep talk") {
    return emotion ? `a deeper ${emotion} kind of chat` : "a deeper kind of chat";
  }
  if (intent === "meet someone similar") {
    return emotion ? `someone in a similar ${emotion} mood` : "someone in a similar mood";
  }
  if (intent === "casual chat") {
    return emotion ? `a ${emotion} casual chat` : "a casual chat";
  }
  if (emotion === "calm") return "a calm chat";
  if (emotion) return `a ${emotion} kind of chat`;
  return "this kind of chat";
}

function getLiveMoodAcknowledgment(candidate = {}) {
  const intent = formatChoiceLabel(candidate.intent || "").toLowerCase();
  const emotion = formatChoiceLabel(candidate.emotion || "").toLowerCase();

  if (intent === "deep talk") {
    return "Got it. You want something a little deeper.";
  }
  if (intent === "be heard") {
    return "Got it. You want someone who can really listen.";
  }
  if (intent === "distract me") {
    return "Got it. You want something lighter right now.";
  }
  if (intent === "meet someone similar") {
    return "Got it. You want someone in a similar mood.";
  }
  if (intent === "casual chat" && emotion === "calm") {
    return "Got it. You want something calm and easy.";
  }
  if (intent === "casual chat") {
    return "Got it. You want something easy and low-pressure.";
  }
  if (emotion === "calm") {
    return "Got it. You want something calm.";
  }
  return `Got it. ${capitalizeFirstLetter(describeLiveMoodCandidate(candidate))}.`;
}

function nextLiveMoodRefinementCount() {
  const next = Number(draftStore.liveMoodRefinementCount || 0) + 1;
  draftStore.setField?.("liveMoodRefinementCount", next);
  return next;
}

function resetLiveMoodRefinementCount() {
  draftStore.setField?.("liveMoodRefinementCount", 0);
}

async function pushLiveMoodDirectChoicePrompt(peer = null) {
  draftStore.setField?.("liveMoodStage", "clarify");
  draftStore.setField?.("liveMoodClarifierOptions", [
    getClarifierLabel("lightChat"),
    getClarifierLabel("someoneToListen"),
    getClarifierLabel("quietCompany"),
    getClarifierLabel("deepChat"),
  ]);
  await pushLiveMoodBotMessage(
    "No problem. Pick what sounds best right now.",
    peer
  );
}

function sameLiveMoodCandidate(a = null, b = null) {
  if (!a || !b) return false;
  return (
    String(a.emotion || "") === String(b.emotion || "") &&
    String(a.intent || "") === String(b.intent || "") &&
    String(a.energy || "") === String(b.energy || "") &&
    String(a.privacy || "") === String(b.privacy || "") &&
    String(a.time_horizon || "") === String(b.time_horizon || "")
  );
}

function isSoftMoodYes(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const lang = moodLocaleKey.value || "en";
  return (
    (MOOD_WORDS.yes?.[lang] || []).includes(normalized) ||
    (SOFT_MOOD_YES_WORDS[lang] || []).map(normalizeText).includes(normalized)
  );
}

function isMoodClose(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const lang = moodLocaleKey.value || "en";
  const words = (MOOD_CLOSE_WORDS[lang] || []).map(normalizeText);
  const label = normalizeText(t("onboarding.close"));
  return words.includes(normalized) || (!!label && normalized === label);
}

function getClarifierLabel(key) {
  return t(`onboarding.clarifier.${key}`);
}

function buildLiveMoodClarifierOptions(text, candidate = null) {
  const normalized = normalizeText(text);
  const intent = String(candidate?.intent || "").trim().toLowerCase();

  const looksTired =
    normalized.includes("tired") ||
    normalized.includes("drained") ||
    normalized.includes("fatigue") ||
    normalized.includes("устал") ||
    normalized.includes("累");

  if (looksTired) {
    return ["quietCompany", "justTired", "someoneToListen", "lightChat"].map(getClarifierLabel);
  }

  // Intent-specific adjacent refinements — each set is a fine-tuning of the confirmed suggestion
  if (intent === "casual_chat") {
    // Close to "calm, casual chat" — offer a spectrum around it
    return ["evenQuieter", "aLittleLivelier", "someoneToListen", "deepChat"].map(getClarifierLabel);
  }
  if (intent === "be_heard") {
    // Close to "someone to listen" — lighter, deeper, or different energy
    return ["lighterThanThat", "deeperThanThat", "moreOfAConversation", "justChill"].map(getClarifierLabel);
  }
  if (intent === "distract_me") {
    // Close to "light/fun chat" — calmer, even lighter, or more substance
    return ["evenQuieter", "lightChat", "moreOfAConversation", "someoneToListen"].map(getClarifierLabel);
  }
  if (intent === "deep_talk") {
    // Close to "deep conversation" — lighter, needs listener first, or reconfirm depth
    return ["lighterThanThat", "someoneToListen", "deepChat", "justChill"].map(getClarifierLabel);
  }
  if (intent === "meet_someone_similar") {
    // Close to "similar vibe" — spectrum from casual to deep
    return ["aLittleLivelier", "moreOfAConversation", "someoneToListen", "deepChat"].map(getClarifierLabel);
  }

  // Fallback: a clean spectrum without emotion labels
  return ["quietCompany", "lightChat", "someoneToListen", "deepChat"].map(getClarifierLabel);
}

function applyClarifierChoice(text, candidate = null) {
  const normalized = normalizeText(text);
  const matches = (key) => normalized === normalizeText(getClarifierLabel(key));
  const next = { ...(candidate || {}) };

  if (matches("quietCompany")) {
    next.emotion = next.emotion || "calm";
    next.intent = "casual_chat";
    next.energy = "drained";
    return next;
  }
  if (matches("evenQuieter")) {
    next.intent = "casual_chat";
    next.energy = "drained";
    next.emotion = "calm";
    return next;
  }
  if (matches("aLittleLivelier")) {
    next.intent = "distract_me";
    next.energy = "normal";
    next.emotion = next.emotion === "sad" ? "curious" : next.emotion || "playful";
    return next;
  }
  if (matches("moreOfAConversation")) {
    next.intent = "casual_chat";
    next.energy = "normal";
    return next;
  }
  if (matches("lighterThanThat")) {
    next.intent = "casual_chat";
    next.energy = "normal";
    next.emotion = next.emotion === "sad" ? "curious" : next.emotion || "calm";
    return next;
  }
  if (matches("deeperThanThat")) {
    next.intent = "deep_talk";
    next.energy = next.energy || "normal";
    next.emotion = next.emotion || "curious";
    return next;
  }
  if (matches("justChill")) {
    next.intent = "casual_chat";
    next.energy = "drained";
    next.emotion = "calm";
    return next;
  }
  if (matches("frustrated")) {
    next.emotion = "annoyed";
    next.intent = "be_heard";
    next.energy = next.energy || "normal";
    return next;
  }
  if (matches("lightChat")) {
    next.intent = "casual_chat";
    next.energy = next.energy || "normal";
    next.emotion = next.emotion === "sad" ? "curious" : next.emotion || "calm";
    return next;
  }
  if (matches("justTired")) {
    next.energy = "drained";
    next.intent = "casual_chat";
    next.emotion = "calm";
    return next;
  }
  if (matches("deepChat")) {
    next.intent = "deep_talk";
    next.energy = next.energy || "normal";
    next.emotion = next.emotion || "curious";
    return next;
  }
  if (matches("someoneToListen")) {
    next.intent = "be_heard";
    next.energy = next.energy || "normal";
    next.emotion = next.emotion || "sad";
    return next;
  }

  return null;
}

function findDirectMoodHint(text, group) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const lang = moodLocaleKey.value || "en";
  const entries = LIVE_MOOD_DIRECT_HINTS[group] || {};
  for (const [key, variants] of Object.entries(entries)) {
    const phrases = variants?.[lang] || [];
    const match = phrases
      .map(normalizeText)
      .find((phrase) => phrase && normalized.includes(phrase));
    if (match) return key;
  }
  return null;
}

function mergeDirectMoodHints(text, candidate = null) {
  const base = candidate ? { ...candidate } : null;
  const emotion = findDirectMoodHint(text, "emotion");
  const intent = findDirectMoodHint(text, "intent");
  const energy = findDirectMoodHint(text, "energy");
  if (!emotion && !intent && !energy) return null;
  return {
    emotion: emotion || base?.emotion || null,
    intent: intent || base?.intent || null,
    energy: energy || base?.energy || null,
    privacy: base?.privacy || "private_matching_only",
    time_horizon: base?.time_horizon || "right_now",
    confidence: base?.confidence ?? 0.85,
    free_text_refined: String(text || "").trim(),
  };
}

function normalizeLiveMoodNextStepChoice(text) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;
  const browsePartnersLabel = String(
    t("onboarding.languagePractice.quickReplies.browsePartners")
  )
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const answerMoodQuestionLabel = String(
    t("onboarding.languagePractice.quickReplies.answerMoodQuestion")
  )
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keepChattingLabel = String(
    t("onboarding.languagePractice.quickReplies.keepChatting")
  )
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized === browsePartnersLabel) {
    return "browse_language_partners";
  }
  if (normalized === answerMoodQuestionLabel) {
    return "answer_mood_question";
  }
  if (normalized === keepChattingLabel) {
    return "keep_chatting";
  }
  if (
    normalized === "find a match" ||
    normalized === "find match" ||
    normalized === "match me"
  ) {
    return "resume_matching";
  }
  if (
    normalized.includes("light") ||
    normalized.includes("fun") ||
    normalized.includes("banter")
  ) {
    return "light_chat";
  }
  if (
    normalized.includes("deep") ||
    normalized.includes("deeper")
  ) {
    return "deep_chat";
  }
  if (
    normalized.includes("similar") ||
    normalized.includes("same mood")
  ) {
    return "similar";
  }
  if (
    normalized.includes("quiet") ||
    normalized.includes("low pressure") ||
    normalized.includes("low-pressure")
  ) {
    return "quiet_company";
  }
  if (normalized.includes("calm")) return "calm_chat";
  if (
    normalized.includes("listen") ||
    normalized.includes("listener") ||
    normalized.includes("heard")
  ) {
    return "listener";
  }
  if (
    normalized === "keep chatting" ||
    normalized === "chat" ||
    normalized === "keep talking"
  ) {
    return "keep_chatting";
  }
  if (
    normalized === "not now" ||
    normalized === "later" ||
    normalized === "no" ||
    normalized === "no thanks" ||
    normalized === "skip"
  ) {
    return "not_now";
  }
  return null;
}

function getLiveMoodNextStepChoices(candidate = null) {
  const intent = String(candidate?.intent || "").trim().toLowerCase();
  const emotion = String(candidate?.emotion || "").trim().toLowerCase();
  const base = ["Keep chatting", "Not now"];

  if (intent === "distract_me") {
    return ["Find light chat", "Find quiet company", ...base];
  }
  if (intent === "be_heard") {
    return ["Find someone to listen", "Find a calm chat", ...base];
  }
  if (intent === "deep_talk") {
    return ["Find deep chat", "Find someone to listen", ...base];
  }
  if (intent === "meet_someone_similar") {
    return ["Find someone similar", "Keep chatting", "Not now"];
  }
  if (emotion === "bored" || emotion === "playful") {
    return ["Find light chat", "Keep chatting", "Not now"];
  }
  if (emotion === "sad" || emotion === "lonely" || emotion === "annoyed") {
    return ["Find someone to listen", "Find a calm chat", ...base];
  }
  return ["Find a calm chat", "Find someone to listen", ...base];
}

function getAutoMatchMessage(candidate = null) {
  const intent = String(candidate?.intent || "").trim().toLowerCase();
  const emotion = String(candidate?.emotion || "").trim().toLowerCase();

  if (intent === "be_heard") return "Done. I've found some good listeners for you. Pick a filter to browse:";
  if (intent === "distract_me" || emotion === "bored" || emotion === "playful") return "Done. I've lined up some lighter options for you. Pick a filter to browse:";
  if (intent === "deep_talk") return "Done. I've found some people up for a deeper conversation. Pick a filter to browse:";
  if (intent === "meet_someone_similar") return "Done. I've found some people with a similar vibe right now. Pick a filter to browse:";
  if (emotion === "sad" || emotion === "lonely" || emotion === "annoyed") return "Done. I've found some good listeners for you. Pick a filter to browse:";
  return "Done. I've found some calm chats that fit your mood. Pick a filter to browse:";
}

function getLiveMoodNextStepPrompt(candidate = null) {
  const intent = String(candidate?.intent || "").trim().toLowerCase();
  const emotion = String(candidate?.emotion || "").trim().toLowerCase();

  if (intent === "distract_me") {
    return "Want me to find something light, some quiet company, or just keep chatting with me?";
  }
  if (intent === "be_heard") {
    return "Want me to find someone to listen, a calm chat, or just keep chatting with me?";
  }
  if (intent === "deep_talk") {
    return "Want me to find a deeper chat, someone to listen, or just keep chatting with me?";
  }
  if (intent === "meet_someone_similar") {
    return "Want me to find someone in a similar mood, or just keep chatting with me?";
  }
  if (emotion === "bored" || emotion === "playful") {
    return "Want me to find something light, or just keep chatting with me?";
  }
  return "Want me to find a calm chat, someone who'll listen, or just keep chatting with me?";
}

function consumeLiveMoodNudge() {
  const nudges =
    draftStore.liveMoodNudges && typeof draftStore.liveMoodNudges === "object"
      ? { ...draftStore.liveMoodNudges }
      : null;
  if (!nudges) return null;

  const settingsUrl = localePath("/settings");
  const linkEmailUrl = localePath({
    path: "/settings",
    query: { linkEmail: "1" },
  });

  if (nudges.nudge_add_photo) {
    nudges.nudge_add_photo = false;
    draftStore.setField?.("liveMoodNudges", nudges);
    return `When you want, add a photo in [settings](${settingsUrl}). It helps people trust the profile faster.`;
  }

  if (nudges.nudge_set_looking_for) {
    nudges.nudge_set_looking_for = false;
    draftStore.setField?.("liveMoodNudges", nudges);
    return `You can also set what you're looking for in [settings](${settingsUrl}) so I can guide you better.`;
  }

  if (nudges.nudge_link_email) {
    nudges.nudge_link_email = false;
    draftStore.setField?.("liveMoodNudges", nudges);
    return `And when you're ready, [link your email](${linkEmailUrl}) so you can keep the account.`;
  }

  if (nudges.nudge_open_settings) {
    nudges.nudge_open_settings = false;
    draftStore.setField?.("liveMoodNudges", nudges);
    return `You can tweak the rest anytime in [settings](${settingsUrl}).`;
  }

  return null;
}

async function pushLiveMoodBotMessage(text, persona = null) {
  const peerId =
    String(persona?.user_id || persona?.id || draftStore.liveMoodPersonaUserId || "").trim();
  const peerName =
    String(persona?.displayname || selectedUser.value?.displayname || draftStore.liveMoodPersonaKey || "Bot").trim();
  if (!text || !meId.value || !peerId) return;
  if (String(selectedUserId.value || "") === peerId) {
    regRef.value?.appendPeerLocal?.(text, {
      senderId: peerId,
      senderName: peerName,
      senderAvatar: persona?.avatar_url || selectedUser.value?.avatar_url || null,
    });
  }
  try {
    await insertMessage(meId.value, peerId, text);
    chat.addActivePeer?.(peerId);
  } catch (err) {
    console.warn("[live-mood] bot message insert failed:", err?.message || err);
  }
}

async function inferLiveMoodCandidate(text) {
  const res = await $fetch("/api/live-mood/infer", {
    method: "POST",
    body: {
      text,
      locale: locale.value,
    },
  });
  return res?.state || null;
}

async function saveLiveMoodCandidate(candidate) {
  if (!candidate) return false;
  try {
    await $fetch("/api/live-mood/state", {
      method: "POST",
      body: {
        actorPersona: draftStore.liveMoodPersonaKey,
        emotion: candidate.emotion,
        intent: candidate.intent,
        energy: candidate.energy,
        privacy: candidate.privacy,
        timeHorizon: candidate.time_horizon,
        freeTextRaw: draftStore.liveMoodInput || null,
        freeTextRefined: candidate.free_text_refined || draftStore.liveMoodInput || null,
        sourceType: "mixed",
        confidence: candidate.confidence ?? null,
      },
    });
    return true;
  } catch (err) {
    console.warn("[live-mood] save failed:", err?.message || err);
    return false;
  }
}

async function finalizeLiveMoodChoice(candidate, peer = null, acknowledgment = null) {
  const ok = await saveLiveMoodCandidate(candidate);
  draftStore.setField?.("liveMoodCandidate", candidate);
  draftStore.setField?.("liveMoodStage", "done");
  draftStore.setField?.("liveMoodClarifierOptions", []);
  resetLiveMoodRefinementCount();

  await pushLiveMoodBotMessage(
    acknowledgment ||
      (ok
        ? "Perfect. I can help from here."
        : "I couldn't save that just yet, but we can keep chatting."),
    peer
  );

  if (ok) {
    draftStore.setField?.("liveMoodNextStepStage", "matched");
    await pushLiveMoodBotMessage(getAutoMatchMessage(candidate), peer);
    // Bust the shared match cache so Users.vue's strip refreshes reactively
    bustMatchCache();
    refreshMatchCandidates(true).catch(() => {});
  } else {
    draftStore.setField?.("liveMoodNextStepStage", "done");
    const nudge = consumeLiveMoodNudge();
    if (nudge) {
      await pushLiveMoodBotMessage(nudge, peer);
    }
  }

  return ok;
}

async function handleLiveMoodCaptureMessage(text, { peerId = null, peer = null } = {}) {
  if (!["authenticated", "anon_authenticated"].includes(auth.authStatus)) return false;
  if (!peerId || String(peerId) !== String(draftStore.liveMoodPersonaUserId || "")) {
    return false;
  }
  if (!["prompt", "confirm", "clarify"].includes(draftStore.liveMoodStage || "idle")) {
    return false;
  }

  await regRef.value?.appendLocalAndSend?.(text);

  if (isMoodSkip(text)) {
    draftStore.setField?.("liveMoodStage", "done");
    draftStore.setField?.("liveMoodCandidate", null);
    draftStore.setField?.("liveMoodClarifierOptions", []);
    resetLiveMoodRefinementCount();
    draftStore.setField?.("liveMoodNextStepStage", "done");
    await pushLiveMoodBotMessage(
      "No problem. We can figure out your vibe later.",
      peer
    );
    return true;
  }

  if ((draftStore.liveMoodStage || "idle") === "prompt") {
    const candidate = await inferLiveMoodCandidate(text);
    draftStore.setField?.("liveMoodInput", String(text || "").trim());
    draftStore.setField?.("liveMoodCandidate", candidate);
    draftStore.setField?.("liveMoodStage", "confirm");
    resetLiveMoodRefinementCount();
    await pushLiveMoodBotMessage(
      `It sounds like you want ${describeLiveMoodCandidate(candidate)}. Is that right?`,
      peer
    );
    return true;
  }

  if ((draftStore.liveMoodStage || "idle") === "confirm") {
    if (isMoodYes(text) || isSoftMoodYes(text)) {
      await finalizeLiveMoodChoice(draftStore.liveMoodCandidate, peer);
      return true;
    }
    if (isMoodClose(text)) {
      const count = nextLiveMoodRefinementCount();
      if (count >= 2) {
        await pushLiveMoodDirectChoicePrompt(peer);
        return true;
      }
      draftStore.setField?.("liveMoodInput", String(text || "").trim());
      draftStore.setField?.(
        "liveMoodClarifierOptions",
        buildLiveMoodClarifierOptions(draftStore.liveMoodInput || text, draftStore.liveMoodCandidate)
      );
      draftStore.setField?.("liveMoodStage", "clarify");
      await pushLiveMoodBotMessage(
        t("onboarding.clarifier.prompt"),
        peer
      );
      return true;
    }
    if (isMoodNo(text)) {
      const count = nextLiveMoodRefinementCount();
      if (count >= 2) {
        await pushLiveMoodDirectChoicePrompt(peer);
        return true;
      }
      draftStore.setField?.("liveMoodInput", String(text || "").trim());
      draftStore.setField?.(
        "liveMoodClarifierOptions",
        buildLiveMoodClarifierOptions(draftStore.liveMoodInput || text, draftStore.liveMoodCandidate)
      );
      draftStore.setField?.("liveMoodStage", "clarify");
      await pushLiveMoodBotMessage(
        t("onboarding.clarifier.prompt"),
        peer
      );
      return true;
    }

    const previous = draftStore.liveMoodCandidate;
    const directCandidate = mergeDirectMoodHints(text, previous);
    if (directCandidate && !sameLiveMoodCandidate(previous, directCandidate)) {
      const count = nextLiveMoodRefinementCount();
      if (count >= 3) {
        await pushLiveMoodDirectChoicePrompt(peer);
        return true;
      }
      draftStore.setField?.("liveMoodInput", String(text || "").trim());
      draftStore.setField?.("liveMoodCandidate", directCandidate);
      await pushLiveMoodBotMessage(
        `Maybe this is closer: ${describeLiveMoodCandidate(directCandidate)}. Does that fit better?`,
        peer
      );
      return true;
    }

    const candidate = await inferLiveMoodCandidate(text);
    draftStore.setField?.("liveMoodInput", String(text || "").trim());
    if (sameLiveMoodCandidate(previous, candidate)) {
      await pushLiveMoodDirectChoicePrompt(peer);
      return true;
    }
    const count = nextLiveMoodRefinementCount();
    if (count >= 3) {
      await pushLiveMoodDirectChoicePrompt(peer);
      return true;
    }
    draftStore.setField?.("liveMoodCandidate", candidate);
    await pushLiveMoodBotMessage(
      `Maybe this is closer: ${describeLiveMoodCandidate(candidate)}. Does that fit better?`,
      peer
    );
    return true;
  }

  if ((draftStore.liveMoodStage || "idle") === "clarify") {
    const previous = draftStore.liveMoodCandidate;
    const clarified = applyClarifierChoice(text, previous);
    draftStore.setField?.("liveMoodInput", String(text || "").trim());

    if (clarified && !sameLiveMoodCandidate(previous, clarified)) {
      await finalizeLiveMoodChoice(
        clarified,
        peer,
        getLiveMoodAcknowledgment(clarified)
      );
      return true;
    }

    const directCandidate = mergeDirectMoodHints(text, previous);
    if (directCandidate && !sameLiveMoodCandidate(previous, directCandidate)) {
      const count = nextLiveMoodRefinementCount();
      if (count >= 3) {
        draftStore.setField?.("liveMoodCandidate", directCandidate);
        draftStore.setField?.("liveMoodClarifierOptions", []);
        draftStore.setField?.("liveMoodStage", "confirm");
        await pushLiveMoodBotMessage(
          `Does ${describeLiveMoodCandidate(directCandidate)} sound right?`,
          peer
        );
        return true;
      }
      draftStore.setField?.("liveMoodCandidate", directCandidate);
      draftStore.setField?.("liveMoodClarifierOptions", []);
      draftStore.setField?.("liveMoodStage", "confirm");
      await pushLiveMoodBotMessage(
        `Maybe this is closer: ${describeLiveMoodCandidate(directCandidate)}. Does that fit better?`,
        peer
      );
      return true;
    }

    draftStore.setField?.("liveMoodClarifierOptions", []);
    draftStore.setField?.("liveMoodStage", "prompt");
    draftStore.setField?.("liveMoodCandidate", null);
    resetLiveMoodRefinementCount();
    await pushLiveMoodBotMessage(
      "Okay, give me your vibe again in your own words.",
      peer
    );
    return true;
  }

  return false;
}

async function handleLiveMoodNextStepMessage(text, { peerId = null, peer = null } = {}) {
  if (!["authenticated", "anon_authenticated"].includes(auth.authStatus)) return false;
  if (
    !["choose", "dormant", "matched", "language_practice"].includes(
      draftStore.liveMoodNextStepStage || "idle"
    )
  ) {
    return false;
  }
  if (!peerId || String(peerId) !== String(draftStore.liveMoodPersonaUserId || "")) {
    return false;
  }

  if (draftStore.liveMoodNextStepStage === "language_practice") {
    const choice = normalizeLiveMoodNextStepChoice(text);
    if (!choice) {
      draftStore.setField?.("liveMoodNextStepStage", "done");
      draftStore.setField?.("postOnboardingLanguagePracticeContext", null);
      return false;
    }

    await regRef.value?.appendLocalAndSend?.(text);

    if (choice === "browse_language_partners") {
      const languageContext =
        draftStore.postOnboardingLanguagePracticeContext || {};
      draftStore.setField?.("liveMoodNextStepStage", "done");
      draftStore.setField?.("postOnboardingLanguagePracticeContext", null);
      await navigateTo(
        localePath({
          path: "/language-practice",
          query: {
            ...(languageContext.native_language_code
              ? { nativeLanguage: languageContext.native_language_code }
              : {}),
            ...(languageContext.target_language_code
              ? { targetLanguage: languageContext.target_language_code }
              : {}),
            ...(languageContext.target_language_level
              ? { targetLevel: languageContext.target_language_level }
              : {}),
          },
        })
      );
      return true;
    }

    if (choice === "answer_mood_question") {
      draftStore.setField?.("postOnboardingLanguagePracticeContext", null);
      draftStore.setField?.("liveMoodNextStepStage", "choose");
      await pushLiveMoodBotMessage(
        t("onboarding.languagePractice.moodQuestionPrompt", {
          prompt: getLiveMoodNextStepPrompt(draftStore.liveMoodCandidate),
        }),
        peer
      );
      return true;
    }

    draftStore.setField?.("liveMoodNextStepStage", "done");
    draftStore.setField?.("postOnboardingLanguagePracticeContext", null);
    await pushLiveMoodBotMessage(
      t("onboarding.languagePractice.keepChattingAck"),
      peer
    );
    return true;
  }

  // Handle filter pill taps when in "matched" stage
  if (draftStore.liveMoodNextStepStage === "matched") {
    const pill = String(text || "").trim();
    await regRef.value?.appendLocalAndSend?.(pill);
    draftStore.setField?.("liveMoodNextStepStage", "done");

    const isAnon = auth.authStatus === "anon_authenticated";
    const emailLink = isAnon
      ? ` [Add your email](${localePath({ path: "/settings", query: { linkEmail: "1" } })}) so you never miss a reply.`
      : "";

    if (pill === "🟢 Online") {
      setMatchFilter("online");
      await pushLiveMoodBotMessage(
        `Showing online matches in your chat list — tap any name to start chatting. You can switch filters at the top of the list anytime.${emailLink}`,
        peer
      );
    } else if (pill === "⭕ Offline") {
      setMatchFilter("offline");
      await pushLiveMoodBotMessage(
        `Showing offline matches — they may take a little longer to reply, but sometimes that's a better fit. Tap any name to reach out. You can switch filters at the top of your list anytime.${emailLink}`,
        peer
      );
    } else if (pill === "🤖 AI") {
      setMatchFilter("ai");
      await pushLiveMoodBotMessage(
        "Showing AI chat options — available anytime, no waiting. Tap any name to start. Switch filters at the top of your list anytime.",
        peer
      );
    } else if (pill === "🎲 Random") {
      setMatchFilter("random");
      await new Promise((r) => setTimeout(r, 50));
      setMatchFilter(null);
      await pushLiveMoodBotMessage(
        `Picked someone for you — check the top of your chat list and tap their name to say hi.${emailLink}`,
        peer
      );
    }
    return true;
  }

  const choice = normalizeLiveMoodNextStepChoice(text);
  if (!choice) {
    draftStore.setField?.("liveMoodNextStepStage", "done");
    return false;
  }

  await regRef.value?.appendLocalAndSend?.(text);

  if (choice === "resume_matching") {
    draftStore.setField?.("liveMoodNextStepStage", "choose");
    await pushLiveMoodBotMessage(
      getLiveMoodNextStepPrompt(draftStore.liveMoodCandidate),
      peer
    );
    return true;
  }

  draftStore.setField?.("liveMoodNextStepStage", "matched");

  // Concise confirmation for all "find someone" choices — pill quick replies appear automatically
  if (choice === "calm_chat") {
    await pushLiveMoodBotMessage(
      "Done. I've pulled up calmer chats that fit your mood. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "light_chat") {
    await pushLiveMoodBotMessage(
      "Done. I've lined up some lighter options for you. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "quiet_company") {
    await pushLiveMoodBotMessage(
      "Done. I've found some quiet company that suits where you're at. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "listener") {
    await pushLiveMoodBotMessage(
      "Done. I've found some good listeners for you. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "deep_chat") {
    await pushLiveMoodBotMessage(
      "Done. I've found some people up for a deeper conversation. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "similar") {
    await pushLiveMoodBotMessage(
      "Done. I've found some people with a similar vibe right now. Pick a filter to browse:",
      peer
    );
    return true;
  }

  if (choice === "not_now") {
    await pushLiveMoodBotMessage(
      "No pressure. We can come back to matching whenever you want.",
      peer
    );
    draftStore.setField?.("liveMoodNextStepStage", "dormant");
    const nudge = consumeLiveMoodNudge();
    if (nudge) {
      await pushLiveMoodBotMessage(nudge, peer);
    }
    return true;
  }

  await pushLiveMoodBotMessage(
    "Works for me. Stay here with me and tell me what kind of chat would feel good right now.",
    peer
  );
  return true;
}

async function fetchMoodPrompt() {
  try {
    const res = await $fetch("/api/mood-feed/prompts/random", {
      query: { locale: locale.value },
    });
    if (!res?.promptText) return null;
    draftStore.setField?.("moodFeedPrompt", res.promptText);
    if (res.promptKey) {
      draftStore.setField?.("moodFeedPromptKey", res.promptKey);
    }
    return res.promptText;
  } catch (err) {
    console.warn("[mood-feed] prompt fetch failed:", err?.message || err);
    return null;
  }
}

function formatMoodPrompt(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? `**${trimmed}**` : "";
}

async function maybeTriggerMoodPrompt() {
  if (draftStore.handoffPending) return;
  const deferUntil = Number(draftStore.moodFeedDeferUntil || 0);
  if (deferUntil > Date.now()) {
    const waitMs = Math.max(50, deferUntil - Date.now() + 50);
    if (!moodPromptDeferTimer.value) {
      moodPromptDeferTimer.value = setTimeout(() => {
        moodPromptDeferTimer.value = null;
        maybeTriggerMoodPrompt();
      }, waitMs);
    }
    return;
  }
  if (moodPromptBusy.value) return;
  if (!["authenticated", "anon_authenticated"].includes(auth.authStatus)) return;
  if (!meId.value) return;
  if (shouldSuppressMoodFeedPrompt(meId.value)) return;
  if (draftStore.moodFeedStage === "prompt" || draftStore.moodFeedStage === "confirm")
    return;
  if (draftStore.liveMoodPersonaUserId)
    return;
  moodPromptBusy.value = true;
  try {
    const needs = await $fetch("/api/mood-feed/needs-prompt");
    if (!needs?.needsPrompt) return;
    const promptText = await fetchMoodPrompt();
    if (!promptText) return;
    draftStore.setField?.("moodFeedStage", "prompt");
    draftStore.setField?.("moodFeedAttempts", 0);
    draftStore.setField?.("moodFeedAnswer", "");
    draftStore.setField?.("moodFeedRefined", "");
    draftStore.setField?.("moodFeedDeferUntil", 0);
    await pushMoodBotMessage(formatMoodPrompt(promptText));
    markMoodFeedPromptShown(meId.value);
    try {
      await $fetch("/api/mood-feed/prompted", { method: "POST" });
    } catch (err) {
      console.warn("[mood-feed] prompt acknowledge failed:", err?.message || err);
    }
  } finally {
    moodPromptBusy.value = false;
  }
}

async function createMoodFeedEntry(status) {
  try {
    await $fetch("/api/mood-feed/entries", {
      method: "POST",
      body: {
        promptText: draftStore.moodFeedPrompt || null,
        promptKey: draftStore.moodFeedPromptKey || null,
        originalText: draftStore.moodFeedAnswer || null,
        refinedText: draftStore.moodFeedRefined || draftStore.moodFeedAnswer || "",
        status,
        locale: locale.value,
      },
    });
    return true;
  } catch (err) {
    console.warn("[mood-feed] create entry failed:", err?.message || err);
    return false;
  }
}

async function refineMoodFeedResponse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  if (!draftStore.moodFeedPrompt) {
    await fetchMoodPrompt();
  }
  let refined = trimmed;
  try {
    const res = await $fetch("/api/mood-feed/refine", {
      method: "POST",
      body: {
        prompt: draftStore.moodFeedPrompt || "",
        response: trimmed,
        locale: locale.value,
      },
    });
    if (res?.refined) refined = String(res.refined).trim() || trimmed;
  } catch {}

  const attempts = Number(draftStore.moodFeedAttempts || 0) + 1;
  draftStore.setField?.("moodFeedAttempts", attempts);
  draftStore.setField?.("moodFeedAnswer", trimmed);
  draftStore.setField?.("moodFeedRefined", refined);
  draftStore.setField?.("moodFeedStage", "confirm");

  await pushMoodBotMessage(
    t("onboarding.moodFeed.confirm", { text: refined })
  );
}

async function handleMoodFeedMessage(text, { sendingToBot = false } = {}) {
  if (!["authenticated", "anon_authenticated"].includes(auth.authStatus))
    return false;
  if (!sendingToBot) return false;
  if (!["prompt", "confirm"].includes(draftStore.moodFeedStage)) return false;

  await regRef.value?.appendLocalAndSend?.(text);

  if (isMoodSkip(text)) {
    try {
      await $fetch("/api/mood-feed/skip", { method: "POST" });
    } catch {}
    draftStore.setField?.("moodFeedStage", "done");
    draftStore.setField?.("moodFeedStatus", "skipped");
    await pushMoodBotMessage(t("onboarding.moodFeed.skipAck"));
    return true;
  }

  if (draftStore.moodFeedStage === "prompt") {
    await refineMoodFeedResponse(text);
    return true;
  }

  if (draftStore.moodFeedStage === "confirm") {
    if (isMoodYes(text)) {
      const ok = await createMoodFeedEntry("published");
      draftStore.setField?.("moodFeedStage", "done");
      draftStore.setField?.(
        "moodFeedStatus",
        ok ? "published" : "pending_validation"
      );
      await pushMoodBotMessage(
        ok
          ? t("onboarding.moodFeed.accepted", {
              feedUrl: localePath("/feeds"),
            })
          : t("onboarding.moodFeed.saveFailed")
      );
      return true;
    }
    if (isMoodNo(text)) {
      if ((draftStore.moodFeedAttempts || 0) >= MOOD_MAX_ATTEMPTS) {
        await createMoodFeedEntry("pending_validation");
        draftStore.setField?.("moodFeedStage", "done");
        draftStore.setField?.("moodFeedStatus", "pending_validation");
        await pushMoodBotMessage(t("onboarding.moodFeed.needsValidation"));
        return true;
      }
      draftStore.setField?.("moodFeedStage", "prompt");
      await pushMoodBotMessage(t("onboarding.moodFeed.rephrase"));
      return true;
    }

    if ((draftStore.moodFeedAttempts || 0) >= MOOD_MAX_ATTEMPTS) {
      await createMoodFeedEntry("pending_validation");
      draftStore.setField?.("moodFeedStage", "done");
      draftStore.setField?.("moodFeedStatus", "pending_validation");
      await pushMoodBotMessage(t("onboarding.moodFeed.needsValidation"));
      return true;
    }

    await refineMoodFeedResponse(text);
    return true;
  }

  return false;
}

async function refreshActiveChats() {
  const me = meId.value;
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

  // normalize to array of IDs, but preserve locally promoted active peers
  const fetchedIds = (data || [])
    .map((r) => String(r.peer_id ?? r.user_id ?? r.id ?? ""))
    .filter(Boolean);
  const localIds = (Array.isArray(chat.activeChats) ? chat.activeChats : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  const seen = new Set(fetchedIds);
  activeChats.value = [...fetchedIds, ...localIds.filter((id) => !seen.has(id))];
}

// 🔹 helper to call your /api/aiChat endpoint
async function fetchAiResponse(
  message,
  aiUser,
  userProfile,
  historyArr = [],
  replyToStr = null,
  capability = null,
  assistantTurn = null
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
      locale: browserLocale.value,
      history: safeHistory, // ✅ no .value here
      replyTo: replyToStr ?? null, // ✅ string or null
      capability: capability ?? null,
      assistantTurn:
        Number.isFinite(Number(assistantTurn)) && Number(assistantTurn) > 0
          ? Math.floor(Number(assistantTurn))
          : null,
    };

    const res = await $fetch("/api/aiChat", { method: "POST", body: payload });
    if (!res?.success) return { text: null, chatEnded: false };
    return {
      text: res?.aiResponse ?? null,
      chatEnded: !!res?.chatEnded,
    };
  } catch (e) {
    console.error("[AI] fetchAiResponse error", e);
    return { text: null, chatEnded: false };
  }
}

function toggleFilters() {
  filtersVisible.value = !filtersVisible.value;
  // debug line; remove after verifying
  console.debug("[filtersVisible]", filtersVisible.value);
}
</script>

<style scoped>
.chat-layout-root {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  color: #e2e8f0;
  background: #0f172a;
  border-radius: 0;
  overflow: hidden;
}

.chat-layout-shell {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.chat-pane-card {
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface-elevated) / 0.96),
    rgb(var(--color-surface) / 0.96)
  ) !important;
  border: 1px solid rgb(var(--color-border) / 0.3) !important;
  border-radius: 0.9rem;
  box-shadow: 0 14px 30px rgb(var(--color-shadow) / 0.2);
}

.chat-desktop-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-desktop-col--left {
  flex: 0 0 25%;
  max-width: 25%;
  padding: 0 0.5rem;
}

.chat-desktop-col--right {
  flex: 0 0 16.6667%;
  max-width: 16.6667%;
  padding: 0 0.5rem;
}

.chat-thread-col {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: linear-gradient(
    180deg,
    rgba(var(--color-surface), 0.96) 0%,
    rgba(var(--color-background), 0.98) 100%
  );
  border: 1px solid rgba(var(--color-border), 0.28);
  border-radius: 0.95rem;
  padding: 0.4rem;
  box-shadow: 0 18px 44px rgba(var(--color-shadow), 0.18);
}

.chat-thread-col--with-active {
  flex: 0 0 58.3333%;
  max-width: 58.3333%;
}

.chat-thread-col--full {
  flex: 0 0 75%;
  max-width: 75%;
}

.chat-thread-col--mobile {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  border-radius: 0.9rem;
}

/* Keep the messages header visible while content scrolls */
.messages-sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(var(--color-surface-elevated), 0.94);
  border: 1px solid rgba(var(--color-border), 0.34);
  border-radius: 0.85rem;
  box-shadow: 0 10px 22px rgba(var(--color-shadow), 0.12);
}

.messages-sticky-header {
  margin: 0 0 0.2rem;
}

@media (min-width: 960px) {
  .chat-thread-col {
    padding-top: 0 !important;
  }
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

.chat-loading-skeleton {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  background: transparent !important;
}

.chat-loading-skeleton__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-loading-skeleton__avatar,
.chat-loading-skeleton__line {
  display: block;
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.72) 0%,
    rgba(51, 65, 85, 0.95) 50%,
    rgba(30, 41, 59, 0.72) 100%
  );
  background-size: 200% 100%;
  animation: chat-skeleton-pulse 1.6s ease-in-out infinite;
}

.chat-loading-skeleton__avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.chat-loading-skeleton__content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chat-loading-skeleton__line {
  height: 0.55rem;
  border-radius: 999px;
}

.chat-loading-skeleton__line--primary {
  width: 60%;
}

.chat-loading-skeleton__line--secondary {
  width: 38%;
}

.chat-grid-row {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  margin: 0 !important;
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
  pointer-events: none;
}

.active-panel-toggle {
  background: rgba(var(--color-surface-elevated), 0.92);
  border: 1px solid rgba(var(--color-border), 0.22);
  box-shadow: 0 6px 16px rgba(var(--color-shadow), 0.18);
  width: 28px;
  height: 28px;
  pointer-events: auto;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.active-panel-toggle--alert,
.chat-mobile-toggle--alert {
  animation: active-panel-pulse 1.6s ease-in-out infinite;
  border-color: rgba(220, 38, 38, 0.6);
  box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45),
    0 0 16px rgba(220, 38, 38, 0.3);
  color: rgba(220, 38, 38, 0.95);
}

.active-panel-toggle__icon {
  color: rgba(var(--color-foreground), 0.85);
}

.active-panel-card {
  transition: opacity 0.2s ease, transform 0.25s ease;
}

.chat-mobile-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0;
  margin-bottom: 2px;
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(var(--color-surface-elevated), 0.94);
  border: 1px solid rgba(var(--color-border), 0.26);
  border-radius: 0.8rem;
  padding: 0.22rem 0.45rem;
}

.chat-mobile-controls__spacer {
  flex: 1 1 auto;
}

.chat-mobile-toggle {
  min-height: 2.25rem;
  border: 1px solid rgba(var(--color-border), 0.24);
  border-radius: 999px;
  background: rgba(var(--color-surface), 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.8rem;
}

.chat-mobile-toggle__icon {
  font-size: 1.2rem;
}

.chat-mobile-toggle__label {
  color: rgb(var(--color-foreground));
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.chat-mobile-toggle__icon--online {
  color: #16a34a;
}

.chat-mobile-toggle__icon--active {
  color: #60a5fa;
}

.chat-mobile-toggle--alert .chat-mobile-toggle__icon {
  color: rgba(220, 38, 38, 0.95);
}

.chat-mobile-toggle--open {
  border-color: rgba(var(--color-secondary), 0.38);
  background: rgba(var(--color-surface-elevated), 0.98);
}

.chat-thread-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.35rem 0.15rem 0.2rem;
}

.chat-thread-fill {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  gap: 0.3rem;
}

.chat-inline-alert {
  margin: 0.35rem 0.2rem;
  border-radius: 0.8rem;
  padding: 0.68rem 0.82rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.chat-inline-alert--info {
  border: 1px solid rgba(var(--color-secondary), 0.18);
  background: rgba(var(--color-secondary), 0.1);
  color: rgb(var(--color-foreground));
}

.chat-inline-alert--warning {
  margin: 0 0 0.6rem;
  border: 1px solid rgba(245, 158, 11, 0.2);
  background: rgba(120, 53, 15, 0.22);
  color: #fde68a;
}

.chat-composer-wrap {
  flex: 0 0 auto;
  border-top: 1px solid rgba(var(--color-border), 0.16);
  padding-top: 0.4rem;
}

.chat-composer {
  width: 100%;
  margin: 0 auto;
}

.chat-consent-panel-wrap {
  display: block;
  margin-top: 0.2rem;
}

.chat-consent-panel-wrap :deep(.consent-card),
.chat-thread-fill :deep(.onboarding-shell) {
  box-shadow: none;
}

.chat-consent-panel-wrap :deep(.consent-card) {
  border-color: rgba(var(--color-border), 0.24);
}

.chat-thread-fill :deep(.onboarding-shell) {
  min-height: 100%;
}

.chat-thread-fill :deep(.onboarding-scroll) {
  padding-right: 0.1rem;
}

.chat-panel-expand-enter-active,
.chat-panel-expand-leave-active {
  transition: opacity 0.18s ease, transform 0.2s ease;
}

.chat-panel-expand-enter-from,
.chat-panel-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.chat-mobile-drawer {
  position: fixed;
  inset: 0;
  z-index: 1700;
}

.chat-mobile-drawer__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(2, 6, 23, 0.46);
}

.chat-mobile-drawer__panel {
  position: absolute;
  top: var(--nav2-offset, 0px);
  height: calc(100vh - var(--nav2-offset, 0px));
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface-elevated) / 0.98),
    rgb(var(--color-surface) / 0.98)
  );
  border: 1px solid rgb(var(--color-border) / 0.22);
  box-shadow: 0 18px 38px rgb(var(--color-shadow) / 0.28);
  outline: none;
}

.chat-mobile-drawer__panel--left {
  left: 0;
  width: min(320px, 88vw);
}

.chat-mobile-drawer__panel--right {
  right: 0;
  width: min(300px, 84vw);
}

.chat-mobile-drawer__content {
  height: 100%;
  padding: 0.55rem 0.42rem 0.42rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-mobile-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.15rem 0.22rem 0.38rem;
}

.chat-mobile-drawer__title {
  color: rgb(var(--color-foreground));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.chat-mobile-drawer__close {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(var(--color-border) / 0.22);
  border-radius: 999px;
  background: rgb(var(--color-surface) / 0.94);
  color: rgb(var(--color-foreground) / 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chat-mobile-drawer :deep(.chat-pane-card) {
  border-top: none !important;
  margin-top: 0;
}

.chat-mobile-drawer :deep(.users-scroll) {
  scrollbar-color: rgb(var(--color-border) / 0.55) rgb(var(--color-surface));
}

.chat-mobile-drawer :deep(.users-scroll::-webkit-scrollbar) {
  width: 10px;
}

.chat-mobile-drawer :deep(.users-scroll::-webkit-scrollbar-track) {
  background: rgb(var(--color-surface));
}

.chat-mobile-drawer :deep(.users-scroll::-webkit-scrollbar-thumb) {
  background: rgb(var(--color-border) / 0.55);
  border-radius: 999px;
}

@media (max-width: 959px) {
  .chat-grid-row {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  .chat-consent-panel-wrap {
    display: none;
  }

  .chat-thread-col--mobile {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0.32rem;
  }

  .chat-mobile-controls {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    min-height: 38px;
  }

  .chat-mobile-toggle {
    min-height: 34px;
    padding: 0 0.65rem;
  }

  .chat-mobile-toggle__label {
    font-size: 0.75rem;
  }

  .chat-composer-wrap {
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  }
}

.chat-overlay {
  position: fixed;
  inset: 0;
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
}

.chat-modal {
  width: min(100%, 28.75rem);
  border-radius: 1rem;
  border: 1px solid rgb(var(--color-border) / 0.2);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface-elevated) / 0.985),
    rgb(var(--color-surface) / 0.985)
  );
  box-shadow: 0 24px 60px rgb(var(--color-shadow) / 0.3);
  color: rgb(var(--color-foreground));
}

.chat-modal--delete {
  max-width: 26.25rem;
}

.chat-modal--translation {
  max-width: 28.75rem;
}

.chat-modal__title {
  padding: 1.1rem 1.25rem 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.chat-modal__body {
  padding: 0.85rem 1.25rem 0;
}

.chat-modal__text {
  margin-bottom: 0.75rem;
  color: rgb(var(--color-muted));
  font-size: 0.92rem;
  line-height: 1.45;
}

.chat-modal__hint {
  margin-bottom: 0.6rem;
  color: rgb(var(--color-muted));
  font-size: 0.78rem;
}

.chat-modal__alert {
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.86rem;
}

.chat-modal__alert--error {
  border: 1px solid rgba(239, 68, 68, 0.22);
  background: rgba(127, 29, 29, 0.25);
  color: #fecaca;
}

.chat-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.25rem 1.15rem;
}

.chat-btn {
  border-radius: 0.75rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 600;
}

.chat-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.chat-btn--ghost {
  border: 1px solid rgb(var(--color-border) / 0.2);
  background: rgb(var(--color-surface) / 0.2);
  color: rgb(var(--color-foreground));
}

.chat-btn--ghost:hover:not(:disabled) {
  background: rgb(var(--color-surface-elevated) / 0.72);
}

.chat-btn--danger {
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: #dc2626;
  color: #fff;
}

.chat-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.translation-choice-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.translation-choice-item {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(var(--color-border) / 0.14);
  background: rgb(var(--color-background) / 0.42);
  color: rgb(var(--color-foreground));
  padding: 0.85rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
}

.translation-choice-item:hover {
  background: rgb(var(--color-secondary) / 0.08);
}

.translation-choice-item__title {
  font-size: 0.9rem;
  font-weight: 600;
}

.translation-choice-item__subtitle {
  color: rgb(var(--color-muted));
  font-size: 0.8rem;
  line-height: 1.35;
}

.chat-toast-stack {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3150;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  pointer-events: none;
}

.chat-toast {
  min-width: 13rem;
  max-width: min(90vw, 28rem);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.28);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
}

.chat-toast--primary {
  background: #2563eb;
}

.chat-toast--success {
  background: #16a34a;
}

.chat-toast--danger {
  background: #dc2626;
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

@keyframes chat-skeleton-pulse {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

</style>
