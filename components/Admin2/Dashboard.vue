<template>
  <section class="admin-dashboard">
    <LoadingContainer v-if="isLoading" />

    <template v-else>
      <section class="admin-dashboard-card">
        <div class="admin-dashboard-card__header">
          <div class="admin-dashboard-card__heading">
            <i class="mdi mdi-view-dashboard-outline admin-dashboard-card__icon" aria-hidden="true" />
            <div>
              <h2 class="admin-dashboard-card__title">Profiles Dashboard</h2>
              <p class="admin-dashboard-card__subtitle">
                Search, review, moderate, and simulate profile activity with server-backed admin tools.
              </p>
            </div>
          </div>

          <div class="admin-dashboard-card__meta">
            <span class="admin-dashboard-pill admin-dashboard-pill--neutral">
              {{ totalItems }} total
            </span>
            <span
              v-if="markedCount"
              class="admin-dashboard-pill admin-dashboard-pill--danger"
            >
              {{ markedCount }} marked
            </span>
          </div>
        </div>

        <div class="admin-dashboard-card__body">
          <div
            v-if="loadErrorMessage"
            class="admin-dashboard-banner admin-dashboard-banner--error"
            role="alert"
          >
            {{ loadErrorMessage }}
          </div>

          <div class="admin-dashboard-toolbar">
            <label class="admin-dashboard-field admin-dashboard-field--search">
              <span class="admin-dashboard-field__label admin-dashboard-field__label--sr-only">Search</span>
              <div class="admin-dashboard-input-wrap">
                <i class="mdi mdi-magnify admin-dashboard-input-wrap__icon" aria-hidden="true" />
                <input
                  v-model="search"
                  type="search"
                  class="admin-dashboard-field__control admin-dashboard-field__control--with-icon"
                  placeholder="Search profiles..."
                  aria-label="Search profiles"
                >
                <button
                  v-if="search"
                  type="button"
                  class="admin-dashboard-clear-button"
                  aria-label="Clear profile search"
                  @click="search = ''"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </div>
            </label>

            <label class="admin-dashboard-field admin-dashboard-field--toolbar-select">
              <span class="admin-dashboard-field__label admin-dashboard-field__label--sr-only">User filter</span>
              <select
                v-model="filterSelection"
                class="admin-dashboard-field__control"
                aria-label="User filter"
              >
                <option
                  v-for="option in filterOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.title }}
                </option>
              </select>
            </label>

            <label class="admin-dashboard-field admin-dashboard-field--compact admin-dashboard-field--toolbar-select">
              <span class="admin-dashboard-field__label admin-dashboard-field__label--sr-only">Rows per page</span>
              <select
                :value="itemsPerPage"
                class="admin-dashboard-field__control"
                aria-label="Rows per page"
                @change="handleItemsPerPageChange"
              >
                <option
                  v-for="option in itemsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </label>

            <div class="admin-dashboard-toolbar__actions">
              <div class="admin-dashboard-toolbar__summary">
                Showing {{ pageStart }}-{{ pageEnd }} of {{ totalItems }}
              </div>
              <button
                v-if="markedCount"
                type="button"
                class="admin-dashboard-button admin-dashboard-button--danger"
                @click="purgeDialogOpen = true"
              >
                <i class="mdi mdi-delete-sweep-outline" aria-hidden="true" />
                Purge marked ({{ markedCount }})
              </button>
            </div>
          </div>

          <div class="admin-dashboard-table-shell">
            <div v-if="isTableLoading" class="admin-dashboard-loading-state">
              <LoadingContainer text="Loading profiles..." />
            </div>

            <div
              v-else-if="!activeProfiles.length"
              class="admin-dashboard-banner admin-dashboard-banner--info"
            >
              No profiles found for the current search and filter.
            </div>

            <div v-else class="admin-dashboard-table-wrap">
              <table class="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Tagline</th>
                    <th>Status</th>
                    <th class="admin-dashboard-table__actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="item in activeProfiles" :key="item.user_id">
                    <tr class="admin-dashboard-table__row">
                      <td>
                        <div class="admin-dashboard-profile">
                          <button
                            type="button"
                            class="admin-dashboard-avatar-wrap"
                            :class="{ 'has-pending-reply': hasPendingReply(item) }"
                            :aria-label="`Toggle details for ${displayNameFor(item)}`"
                            :aria-expanded="isExpanded(item.user_id) ? 'true' : 'false'"
                            @click="toggleExpanded(item.user_id)"
                          >
                            <span class="admin-dashboard-avatar">
                              <img
                                :src="getAvatar(item.avatar_url, item.gender_id)"
                                :alt="displayNameFor(item) || 'Profile avatar'"
                                class="admin-dashboard-avatar__image"
                              >
                            </span>
                            <span
                              v-if="getCountryEmoji(item)"
                              class="admin-dashboard-flag-icon"
                              aria-hidden="true"
                            >
                              {{ getCountryEmoji(item) }}
                            </span>
                            <span
                              v-if="item.email"
                              class="admin-dashboard-registered-badge"
                              aria-hidden="true"
                            >
                              <i class="mdi mdi-star" />
                            </span>
                            <i
                              v-if="item?.gender_id"
                              class="mdi admin-dashboard-gender-icon"
                              :class="[
                                item?.gender_id === 1
                                  ? 'mdi-gender-male is-male'
                                  : item?.gender_id === 2
                                  ? 'mdi-gender-female is-female'
                                  : 'mdi-gender-non-binary is-other',
                              ]"
                              :style="{ '--admin-gender-color': getGenderHexColor(item?.gender_id) }"
                              aria-hidden="true"
                            />
                          </button>

                           <div class="admin-dashboard-profile__content">
                             <button
                               type="button"
                              class="admin-dashboard-profile-link"
                              :aria-expanded="isExpanded(item.user_id) ? 'true' : 'false'"
                              @click="toggleExpanded(item.user_id)"
                             >
                               {{ displayNameFor(item) }}
                             </button>
                             <div class="admin-dashboard-profile__meta">
                               <span>{{ formatDate(item.createdAt) }}</span>
                             </div>
                           </div>
                         </div>
                      </td>

                       <td>
                         <div class="admin-dashboard-tagline" :title="taglineFor(item) || ''">
                           {{ taglineFor(item) || "—" }}
                         </div>
                       </td>

                        <td>
                          <div class="admin-dashboard-status-stack">
                            <div v-if="primaryStatusPills(item).length" class="admin-dashboard-status-row">
                              <span
                                v-for="pill in primaryStatusPills(item)"
                                :key="`${item.user_id}-${pill.label}`"
                                class="admin-dashboard-pill"
                                :class="`admin-dashboard-pill--${pill.tone}`"
                              >
                                {{ pill.label }}
                              </span>
                            </div>
                            <span class="admin-dashboard-status-subline">
                              {{ getCountryLabel(item) }}
                              <template v-if="item.city || item.state">
                                • {{ [item.city, item.state].filter(Boolean).join(", ") }}
                              </template>
                            </span>
                          </div>
                        </td>

                      <td>
                        <div class="admin-dashboard-actions">
                            <button
                              type="button"
                              class="admin-dashboard-icon-button admin-dashboard-icon-button--ghost"
                              :title="isExpanded(item.user_id) ? 'Collapse details' : 'Expand details'"
                              :aria-label="isExpanded(item.user_id) ? 'Collapse details' : 'Expand details'"
                              @click="toggleExpanded(item.user_id)"
                            >
                              <i
                                class="mdi"
                                :class="isExpanded(item.user_id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              class="admin-dashboard-icon-button admin-dashboard-icon-button--accent"
                              title="Mock chat"
                              aria-label="Mock chat"
                            @click="openMockChatDialog(item)"
                          >
                            <i class="mdi mdi-message-text-fast" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="admin-dashboard-icon-button admin-dashboard-icon-button--primary"
                            title="View profile"
                            aria-label="View profile"
                            @click="goToProfile(item)"
                          >
                            <i class="mdi mdi-account-eye" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="admin-dashboard-icon-button admin-dashboard-icon-button--info"
                            title="Edit profile"
                            aria-label="Edit profile"
                            @click="editProfile(item)"
                          >
                            <i class="mdi mdi-account-edit" aria-hidden="true" />
                          </button>
                          <button
                            v-if="!item.marked_for_deletion_at"
                            type="button"
                            class="admin-dashboard-icon-button admin-dashboard-icon-button--danger"
                            title="Delete profile"
                            aria-label="Delete profile"
                            @click="markForDeletion(item)"
                          >
                            <i class="mdi mdi-delete" aria-hidden="true" />
                          </button>
                          <button
                            v-else
                            type="button"
                            class="admin-dashboard-icon-button admin-dashboard-icon-button--success"
                            title="Undo deletion"
                            aria-label="Undo deletion"
                            @click="unmarkDeletion(item)"
                          >
                            <i class="mdi mdi-undo" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr
                      v-if="isExpanded(item.user_id)"
                      class="admin-dashboard-table__expanded-row"
                    >
                      <td colspan="4">
                        <section class="admin-dashboard-expanded">
                          <div
                            v-if="isActivityLoading(item.user_id)"
                            class="admin-dashboard-expanded__loading"
                          >
                            <span class="admin-dashboard-progress-bar" aria-hidden="true" />
                          </div>

                          <div v-else class="admin-dashboard-expanded__content">
                            <div class="admin-dashboard-expanded__panel">
                              <div class="admin-dashboard-expanded__layout">
                                <div class="admin-dashboard-expanded__aside">
                                  <div class="admin-dashboard-detail-grid">
                                  <div class="admin-dashboard-detail-item">
                                    <span class="admin-dashboard-detail-item__label">User ID</span>
                                    <span
                                      class="admin-dashboard-detail-item__value admin-dashboard-ellipsis"
                                      :title="item.user_id || '—'"
                                    >
                                      {{ item.user_id || "—" }}
                                    </span>
                                  </div>
                                  <div class="admin-dashboard-detail-item">
                                    <span class="admin-dashboard-detail-item__label">Auth</span>
                                    <span class="admin-dashboard-detail-item__value">
                                      {{ authStateLabel(item) }}
                                    </span>
                                  </div>
                                  <div class="admin-dashboard-detail-item">
                                    <span class="admin-dashboard-detail-item__label">Location</span>
                                    <span class="admin-dashboard-detail-item__value">
                                      {{ getCountryLabel(item) }}
                                      <template v-if="item.city || item.state">
                                        • {{ [item.city, item.state].filter(Boolean).join(", ") }}
                                      </template>
                                      <span v-if="getCountryEmoji(item)">
                                        {{ getCountryEmoji(item) }}
                                      </span>
                                    </span>
                                  </div>
                                  <div class="admin-dashboard-detail-item">
                                    <span class="admin-dashboard-detail-item__label">Joined</span>
                                    <span class="admin-dashboard-detail-item__value">
                                      {{ formatDate(item.createdAt) }}
                                    </span>
                                  </div>
                                  <div class="admin-dashboard-detail-item">
                                    <span class="admin-dashboard-detail-item__label">Email</span>
                                    <span
                                      class="admin-dashboard-detail-item__value admin-dashboard-ellipsis"
                                      :title="item.email || '—'"
                                    >
                                      {{ item.email || "—" }}
                                    </span>
                                </div>
                              </div>
                            </div>
                          </div>

                              <div class="admin-dashboard-expanded__main">
                                <div class="admin-dashboard-stat-grid">
                                  <div class="admin-dashboard-stat-card">
                                    <span class="admin-dashboard-detail-item__label">Chat (messages)</span>
                                    <button
                                      type="button"
                                      class="admin-dashboard-stat-card__value admin-dashboard-stat-card__value--link"
                                      @click="openChatMessages(item.user_id)"
                                    >
                                      {{ getActivity(item.user_id).chatCount || 0 }}
                                    </button>
                                    <span class="admin-dashboard-status-subline">
                                      Last message:
                                      {{ formatDateTime(getActivity(item.user_id).chatLastAt) }}
                                    </span>
                                  </div>

                                  <div class="admin-dashboard-stat-card">
                                    <span class="admin-dashboard-detail-item__label">AI limit hits</span>
                                    <span class="admin-dashboard-stat-card__value">
                                      {{ getActivity(item.user_id).aiLimitHitsCount || 0 }}
                                    </span>
                                    <span class="admin-dashboard-status-subline">
                                      Last hit:
                                      {{ formatDateTime(getActivity(item.user_id).aiLimitLastAt) }}
                                    </span>
                                  </div>

                                  <div
                                    v-if="item.is_ai"
                                    class="admin-dashboard-stat-card"
                                  >
                                    <span class="admin-dashboard-detail-item__label">Expertise</span>
                                    <span class="admin-dashboard-stat-card__value">
                                      {{ getAiCategoryLabel(item) }}
                                    </span>
                                    <span class="admin-dashboard-status-subline">
                                      Category setting
                                    </span>
                                  </div>
                                </div>

                                <div class="admin-dashboard-expanded__supplemental">
                                  <div
                                    v-if="hasPendingPhotos(item)"
                                    class="admin-dashboard-inline-card admin-dashboard-inline-card--wide"
                                  >
                                    <div>
                                      <div class="admin-dashboard-detail-item__label">Photo library</div>
                                      <div class="admin-dashboard-inline-card__copy">
                                        Pending photos are waiting for approval.
                                      </div>
                                    </div>
                                    <NuxtLink
                                      :to="photoReviewLink"
                                      class="admin-dashboard-button admin-dashboard-button--ghost"
                                    >
                                      Review pending photos
                                    </NuxtLink>
                                  </div>

                                  <div class="admin-dashboard-inline-card admin-dashboard-inline-card--stack">
                                    <div>
                                      <div class="admin-dashboard-detail-item__label">
                                        Simulated user controls
                                      </div>
                                    </div>
                                    <div class="admin-dashboard-toggle-row">
                                      <label
                                        class="admin-dashboard-toggle"
                                        :class="{ 'is-checked': getAdminFlags(item).force_online }"
                                      >
                                        <input
                                          v-model="getAdminFlags(item).force_online"
                                          type="checkbox"
                                          :disabled="isAdminFlagsSaving(item.user_id)"
                                          @change="onAdminFlagToggle(item)"
                                        >
                                        <span class="admin-dashboard-toggle__track" aria-hidden="true" />
                                        <span class="admin-dashboard-toggle__copy">
                                          <span class="admin-dashboard-toggle__label">Force online</span>
                                          <span
                                            class="admin-dashboard-toggle__state"
                                            :class="
                                              getAdminFlags(item).force_online
                                                ? 'admin-dashboard-toggle__state--on'
                                                : 'admin-dashboard-toggle__state--off'
                                            "
                                          >
                                            {{ getAdminFlags(item).force_online ? "On" : "Off" }}
                                          </span>
                                        </span>
                                      </label>
                                      <label
                                        class="admin-dashboard-toggle"
                                        :class="{ 'is-checked': getAdminFlags(item).is_simulated }"
                                      >
                                        <input
                                          v-model="getAdminFlags(item).is_simulated"
                                          type="checkbox"
                                          :disabled="isAdminFlagsSaving(item.user_id)"
                                          @change="onAdminFlagToggle(item)"
                                        >
                                        <span class="admin-dashboard-toggle__track" aria-hidden="true" />
                                        <span class="admin-dashboard-toggle__copy">
                                          <span class="admin-dashboard-toggle__label">Simulated user</span>
                                          <span
                                            class="admin-dashboard-toggle__state"
                                            :class="
                                              getAdminFlags(item).is_simulated
                                                ? 'admin-dashboard-toggle__state--on'
                                                : 'admin-dashboard-toggle__state--off'
                                            "
                                          >
                                            {{ getAdminFlags(item).is_simulated ? "On" : "Off" }}
                                          </span>
                                        </span>
                                      </label>
                                      <span
                                        v-if="adminFlagsStatus(item.user_id)"
                                        class="admin-dashboard-inline-status"
                                      >
                                        {{ adminFlagsStatus(item.user_id) }}
                                      </span>
                                    </div>
                                  </div>

                                  <div class="admin-dashboard-inline-card admin-dashboard-inline-card--stack">
                                    <div class="admin-dashboard-detail-item__label">
                                      Recent AI limit notices
                                    </div>
                                    <div
                                      v-if="getActivity(item.user_id).aiLimitHitsSample?.length"
                                      class="admin-dashboard-hit-list"
                                    >
                                      <div
                                        v-for="hit in getActivity(item.user_id).aiLimitHitsSample.slice(0, 5)"
                                        :key="hit.id"
                                        class="admin-dashboard-hit-item"
                                      >
                                        <strong>{{ formatDateTime(hit.created_at) }}</strong>
                                        <span>{{ hit.content }}</span>
                                      </div>
                                    </div>
                                    <div v-else class="admin-dashboard-status-subline">
                                      No AI limit notices yet.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <div class="admin-dashboard-pagination">
            <div class="admin-dashboard-pagination__summary">
              Showing {{ pageStart }}-{{ pageEnd }} of {{ totalItems }}
            </div>
            <div class="admin-dashboard-pagination__controls">
              <button
                type="button"
                class="admin-dashboard-button admin-dashboard-button--ghost"
                :disabled="currentPage <= 1 || isTableLoading"
                @click="goToPreviousPage"
              >
                Previous
              </button>
              <span class="admin-dashboard-pagination__page">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button
                type="button"
                class="admin-dashboard-button admin-dashboard-button--ghost"
                :disabled="currentPage >= totalPages || isTableLoading"
                @click="goToNextPage"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <Teleport to="body">
        <div class="admin-dashboard-toast-layer" aria-live="polite" aria-atomic="true">
          <Transition name="admin-dashboard-toast-fade">
            <div
              v-if="actionNotice.message"
              class="admin-dashboard-toast"
              :class="`admin-dashboard-toast--${actionNotice.type}`"
              role="status"
            >
              <i
                class="mdi"
                :class="toastIcon(actionNotice.type)"
                aria-hidden="true"
              />
              <span>{{ actionNotice.message }}</span>
            </div>
          </Transition>
        </div>
      </Teleport>

      <Teleport to="body">
        <Transition name="admin-dashboard-modal-fade">
          <div
            v-if="purgeDialogOpen"
            class="admin-dashboard-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-dashboard-modal-backdrop"
              aria-label="Close purge dialog"
              @click="closePurgeDialog"
            />
            <div
              class="admin-dashboard-modal admin-dashboard-modal--compact"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-dashboard-purge-title"
            >
              <div class="admin-dashboard-modal__card">
                <div class="admin-dashboard-modal__header">
                  <h2 id="admin-dashboard-purge-title" class="admin-dashboard-modal__title">
                    Purge marked profiles
                  </h2>
                  <button
                    type="button"
                    class="admin-dashboard-icon-button"
                    aria-label="Close purge dialog"
                    @click="closePurgeDialog"
                  >
                    <i class="mdi mdi-close" aria-hidden="true" />
                  </button>
                </div>
                <div class="admin-dashboard-modal__body">
                  <p>
                    This permanently deletes all profiles marked for deletion, including
                    their Supabase auth users. This cannot be undone.
                  </p>
                  <div
                    v-if="purgeError"
                    class="admin-dashboard-banner admin-dashboard-banner--error"
                    role="alert"
                  >
                    {{ purgeError }}
                  </div>
                </div>
                <div class="admin-dashboard-modal__actions">
                  <button
                    type="button"
                    class="admin-dashboard-button"
                    :disabled="purgeBusy"
                    @click="closePurgeDialog"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="admin-dashboard-button admin-dashboard-button--danger"
                    :disabled="purgeBusy"
                    @click="purgeMarkedProfiles"
                  >
                    <span
                      v-if="purgeBusy"
                      class="admin-dashboard-button__spinner"
                      aria-hidden="true"
                    />
                    Purge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="admin-dashboard-modal-fade">
          <div
            v-if="mockDialogOpen"
            class="admin-dashboard-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-dashboard-modal-backdrop"
              aria-label="Close mock chat dialog"
              :disabled="mockRunning"
              @click="closeMockChatDialog"
            />
            <div
              class="admin-dashboard-modal admin-dashboard-modal--wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-dashboard-mock-title"
            >
              <div class="admin-dashboard-modal__card admin-dashboard-modal__card--scrollable">
                <div class="admin-dashboard-modal__header">
                  <h2 id="admin-dashboard-mock-title" class="admin-dashboard-modal__title">
                    Mock chat script
                  </h2>
                  <button
                    type="button"
                    class="admin-dashboard-icon-button"
                    aria-label="Close mock chat dialog"
                    :disabled="mockRunning"
                    @click="closeMockChatDialog"
                  >
                    <i class="mdi mdi-close" aria-hidden="true" />
                  </button>
                </div>
                <div class="admin-dashboard-modal__body admin-dashboard-modal__body--stack">
                  <div class="admin-dashboard-dialog-copy">
                    <div class="admin-dashboard-detail-item__label">User A (impersonated)</div>
                    <div class="admin-dashboard-detail-item__value">
                      {{ mockUserA ? displayNameFor(mockUserA) : "—" }}
                    </div>
                    <div class="admin-dashboard-status-subline">
                      {{ mockUserA?.user_id || "" }}
                    </div>
                  </div>

                  <label class="admin-dashboard-field">
                    <span class="admin-dashboard-field__label">User B</span>
                    <select
                      v-model="mockUserB"
                      class="admin-dashboard-field__control"
                    >
                      <option value="">Select a user</option>
                      <option
                        v-for="option in mockUserOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>

                  <label class="admin-dashboard-field">
                    <span class="admin-dashboard-field__label">Upload JSON script</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      class="admin-dashboard-file-input"
                      @change="onMockFileSelected"
                    >
                  </label>

                  <label class="admin-dashboard-field">
                    <span class="admin-dashboard-field__label">JSON script</span>
                    <textarea
                      v-model="mockJsonText"
                      rows="8"
                      class="admin-dashboard-field__control admin-dashboard-field__control--textarea"
                      placeholder='{"userB":"...","delayMs":1200,"messages":[{"from":"A","text":"hi"}]}'
                    />
                  </label>

                  <div class="admin-dashboard-modal__grid">
                    <label class="admin-dashboard-field">
                      <span class="admin-dashboard-field__label">Start delay (ms)</span>
                      <input
                        v-model.number="mockStartDelayMs"
                        type="number"
                        class="admin-dashboard-field__control"
                      >
                    </label>
                    <label class="admin-dashboard-field">
                      <span class="admin-dashboard-field__label">Delay between messages (ms)</span>
                      <input
                        v-model.number="mockDelayMs"
                        type="number"
                        class="admin-dashboard-field__control"
                      >
                    </label>
                  </div>

                  <label class="admin-dashboard-toggle admin-dashboard-toggle--standalone">
                    <input v-model="mockOpenInNewTab" type="checkbox">
                    <span class="admin-dashboard-toggle__track" aria-hidden="true" />
                    <span class="admin-dashboard-toggle__label">Open chat in new tab</span>
                  </label>

                  <div
                    v-if="mockError"
                    class="admin-dashboard-banner admin-dashboard-banner--error"
                    role="alert"
                  >
                    {{ mockError }}
                  </div>

                  <div
                    v-if="mockRunning"
                    class="admin-dashboard-banner admin-dashboard-banner--info"
                  >
                    Sending {{ mockProgress.done }} / {{ mockProgress.total }}…
                  </div>
                </div>
                <div class="admin-dashboard-modal__actions">
                  <button
                    type="button"
                    class="admin-dashboard-button"
                    :disabled="mockRunning"
                    @click="closeMockChatDialog"
                  >
                    Close
                  </button>
                  <button
                    v-if="mockRunning"
                    type="button"
                    class="admin-dashboard-button admin-dashboard-button--danger"
                    @click="cancelMockChat"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    class="admin-dashboard-button admin-dashboard-button--warning"
                    :disabled="mockRunning || !mockInsertedIds.length"
                    @click="deleteLastMockRun"
                  >
                    Delete last run
                  </button>
                  <button
                    type="button"
                    class="admin-dashboard-button admin-dashboard-button--primary"
                    :disabled="mockRunning"
                    @click="runMockChat"
                  >
                    <span
                      v-if="mockRunning"
                      class="admin-dashboard-button__spinner"
                      aria-hidden="true"
                    />
                    Start mock chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="admin-dashboard-modal-fade">
          <div
            v-if="chatDialogOpen"
            class="admin-dashboard-modal-layer"
            role="presentation"
          >
            <button
              type="button"
              class="admin-dashboard-modal-backdrop"
              aria-label="Close chat messages dialog"
              @click="closeChatDialog"
            />
            <div
              class="admin-dashboard-modal admin-dashboard-modal--xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-dashboard-chat-title"
            >
              <div class="admin-dashboard-modal__card admin-dashboard-modal__card--scrollable">
                <div class="admin-dashboard-modal__header">
                  <h2 id="admin-dashboard-chat-title" class="admin-dashboard-modal__title">
                    Chat messages
                  </h2>
                  <button
                    type="button"
                    class="admin-dashboard-icon-button"
                    aria-label="Close chat messages dialog"
                    @click="closeChatDialog"
                  >
                    <i class="mdi mdi-close" aria-hidden="true" />
                  </button>
                </div>
                <div class="admin-dashboard-modal__body">
                  <div
                    v-if="chatMessagesError"
                    class="admin-dashboard-banner admin-dashboard-banner--error"
                    role="alert"
                  >
                    {{ chatMessagesError }}
                  </div>

                  <LoadingContainer
                    v-if="chatMessagesLoading"
                    text="Loading chat messages..."
                  />

                  <div
                    v-else-if="!chatMessages.length"
                    class="admin-dashboard-banner admin-dashboard-banner--info"
                  >
                    No chat messages found.
                  </div>

                  <div v-else class="admin-dashboard-table-wrap admin-dashboard-table-wrap--dialog">
                    <table class="admin-dashboard-table admin-dashboard-table--dialog">
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th>To</th>
                          <th>Message</th>
                          <th class="admin-dashboard-table__actions-head">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in chatMessages" :key="item.id">
                          <td>{{ formatDateTime(item.created_at) }}</td>
                          <td>{{ item.receiver?.displayname || item.receiver_id || "—" }}</td>
                          <td class="admin-dashboard-chat-message">
                            {{ item.content || "—" }}
                          </td>
                          <td>
                            <div class="admin-dashboard-actions">
                              <button
                                type="button"
                                class="admin-dashboard-icon-button admin-dashboard-icon-button--danger"
                                title="Delete message"
                                aria-label="Delete message"
                                :disabled="deletingMessageIds.includes(item.id)"
                                @click="deleteChatMessage(item)"
                              >
                                <span
                                  v-if="deletingMessageIds.includes(item.id)"
                                  class="admin-dashboard-button__spinner"
                                  aria-hidden="true"
                                />
                                <i
                                  v-else
                                  class="mdi mdi-delete"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getAvatar, getGenderHexColor, getGenderPath } from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";
import { useAuthStore } from "@/stores/authStore1";

const isLoading = ref(true);
const isTableLoading = ref(false);
const loadErrorMessage = ref("");
const serverProfiles = ref([]);
const allProfilesLight = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const itemsPerPage = ref(50);
const itemsPerPageOptions = [25, 50, 100];
const search = ref("");
const expanded = ref([]);
const filterSelection = ref("registered");
const activityByUserId = ref({});
const activityLoadingIds = ref([]);
const pendingReplyByUserId = ref({});
const adminFlagsByUserId = ref({});
const adminFlagsSavingByUserId = ref({});
const adminFlagsStatusByUserId = ref({});
const adminFlagsSaveTimers = ref({});
const pendingPhotoUserIds = ref([]);
const purgeDialogOpen = ref(false);
const purgeBusy = ref(false);
const purgeError = ref("");
const chatDialogOpen = ref(false);
const chatMessages = ref([]);
const chatMessagesLoading = ref(false);
const chatMessagesError = ref("");
const deletingMessageIds = ref([]);
const activeMessageUserId = ref(null);
const mockDialogOpen = ref(false);
const mockUserA = ref(null);
const mockUserB = ref("");
const mockJsonText = ref("");
const mockDelayMs = ref(1200);
const mockStartDelayMs = ref(2000);
const mockOpenInNewTab = ref(true);
const mockRunning = ref(false);
const mockProgress = ref({ done: 0, total: 0 });
const mockError = ref("");
const mockInsertedIds = ref([]);
const actionNotice = ref({ type: "info", message: "" });
let mockAbort = false;
let searchTimer = null;
let actionNoticeTimer = null;

const { locale } = useI18n();
const localPath = useLocalePath();
const router = useRouter();
const authStore = useAuthStore();

const {
  getAdminProfiles,
  markUserForDeletion,
  unmarkUserForDeletion,
  getUserActivitySummary,
} = useDb();

const displayNameFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).displayname || profile?.displayname || "Unknown";

const taglineFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).tagline || profile?.tagline || "";

const isExpanded = (userId) => expanded.value.includes(userId);
const toggleExpanded = (userId) => {
  if (!userId) return;
  const next = [...expanded.value];
  const index = next.indexOf(userId);
  if (index === -1) {
    next.push(userId);
  } else {
    next.splice(index, 1);
  }
  expanded.value = next;
};

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

const totalPages = computed(() =>
  Math.max(1, Math.ceil((totalItems.value || 0) / itemsPerPage.value) || 1)
);

const pageStart = computed(() =>
  totalItems.value ? (currentPage.value - 1) * itemsPerPage.value + 1 : 0
);

const pageEnd = computed(() =>
  totalItems.value
    ? Math.min(totalItems.value, currentPage.value * itemsPerPage.value)
    : 0
);

const pendingPhotoCount = computed(() => pendingPhotoUserIds.value.length);

const mockUserOptions = computed(() => {
  return allProfilesLight.value
    .map((p) => {
      const labelBase = displayNameFor(p) || p?.slug || p?.user_id || "Unknown";
      return {
        label: `${labelBase} — ${p?.user_id || "—"}`,
        value: p?.user_id || "",
      };
    })
    .filter((option) => option.value);
});

const filterOptions = computed(() => [
  { title: "All Human", value: "registered" },
  { title: "AI", value: "ai" },
  { title: "Anon authenticated", value: "anon_authenticated" },
  { title: "Authenticated", value: "authenticated" },
  {
    title: `Photos pending approval (${pendingPhotoCount.value})`,
    value: "photos_pending",
  },
  { title: "Simulated user", value: "simulated" },
  { title: "Forced online", value: "forced_online" },
]);

const resolveFilterParams = () => {
  switch (filterSelection.value) {
    case "registered":
      return { isAi: false, serverFilter: "" };
    case "ai":
      return { isAi: true, serverFilter: "" };
    default:
      return { isAi: null, serverFilter: filterSelection.value };
  }
};

const activeProfiles = computed(() => serverProfiles.value.map(buildProfileRow));

const markedCount = computed(() =>
  serverProfiles.value.filter((profile) => profile?.marked_for_deletion_at).length
);

const photoReviewLink = computed(() =>
  localPath({ path: "/admin", query: { section: "profilePhotos" } })
);

const hasPendingPhotos = (profile) =>
  pendingPhotoUserIds.value.includes(profile?.user_id);

const getActivity = (userId) => activityByUserId.value[userId] || {};
const isActivityLoading = (userId) => activityLoadingIds.value.includes(userId);
const hasPendingReply = (profile) =>
  !!profile?.is_simulated && !!pendingReplyByUserId.value[profile.user_id];

const setActionNotice = (type, message) => {
  actionNotice.value = { type, message };
  if (actionNoticeTimer && typeof window !== "undefined") {
    window.clearTimeout(actionNoticeTimer);
  }
  if (!import.meta.client || !message) return;
  actionNoticeTimer = window.setTimeout(() => {
    actionNotice.value = { type: "info", message: "" };
    actionNoticeTimer = null;
  }, 3200);
};

const toastIcon = (type) => {
  if (type === "success") return "mdi-check-circle-outline";
  if (type === "error") return "mdi-alert-circle-outline";
  if (type === "warning") return "mdi-alert-outline";
  return "mdi-information-outline";
};

const authStateLabel = (profile) => {
  if (profile?.is_ai) return profile?.persona_is_active ? "AI active" : "AI";
  if (profile?.provider === "anonymous") return "Anon auth";
  if (profile?.provider) return "Authenticated";
  return "Guest";
};

const toneForPresenceText = (value) => {
  const text = String(value || "").toLowerCase();
  if (!text) return "neutral";
  if (["online", "active", "available"].includes(text)) return "success";
  if (["busy", "away", "idle"].includes(text)) return "warning";
  if (["offline", "hidden"].includes(text)) return "neutral";
  return "primary";
};

const presenceLabel = (profile) =>
  profile?.manual_status || profile?.status || authStateLabel(profile);

const presenceTone = (profile) => toneForPresenceText(presenceLabel(profile));

const primaryStatusPills = (profile) => {
  if (profile?.marked_for_deletion_at) {
    return [{ label: "Marked", tone: "danger" }];
  }

  const pills = [];

  if (profile?.is_ai) pills.push({ label: authStateLabel(profile), tone: "primary" });
  if (profile?.force_online) pills.push({ label: "Forced online", tone: "info" });
  if (hasPendingReply(profile)) pills.push({ label: "Pending reply", tone: "danger" });
  if (profile?.agent_enabled) pills.push({ label: "Agent enabled", tone: "accent" });
  if (profile?.is_simulated) pills.push({ label: "Simulated", tone: "warning" });
  if (hasPendingPhotos(profile)) pills.push({ label: "Photos pending", tone: "warning" });
  if (!pills.length && profile?.manual_status) {
    pills.push({ label: profile.manual_status, tone: presenceTone({ manual_status: profile.manual_status }) });
  }

  return pills.slice(0, 2);
};

const loadPendingPhotoUsers = async () => {
  try {
    const result = await $fetch("/api/admin/profile-photos/list", {
      query: { status: "pending", limit: 500 },
    });
    const ids = (result?.photos || [])
      .map((photo) => photo.user_id)
      .filter(Boolean);
    pendingPhotoUserIds.value = Array.from(new Set(ids));
  } catch (error) {
    console.warn("[admin] load pending photo users failed:", error);
    pendingPhotoUserIds.value = [];
  }
};

const buildProfileRow = (profile) => {
  const activity = getActivity(profile?.user_id);
  const chatCount = Number(
    activity.chatCount ?? profile?.chat_count ?? profile?.messages_count ?? 0
  );
  const discussionCount = Number(
    activity.discussionCount ??
      profile?.messages_v2_count ??
      profile?.discussion_count ??
      0
  );
  const createdAt =
    profile?.created ||
    profile?.created_at ||
    profile?.createdAt ||
    profile?.inserted_at ||
    profile?.created_on ||
    null;
  const createdAtSort = createdAt ? new Date(createdAt).getTime() || 0 : 0;
  return {
    ...profile,
    chatCount,
    discussionCount,
    createdAt,
    createdAtSort,
  };
};

const loadPage = async (page, perPage) => {
  if (page !== undefined) currentPage.value = page;
  if (perPage !== undefined) itemsPerPage.value = perPage;
  isTableLoading.value = true;
  loadErrorMessage.value = "";
  try {
    const { isAi, serverFilter } = resolveFilterParams();
    const result = await getAdminProfiles(isAi, {
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: search.value || "",
      filter: serverFilter,
    });
    serverProfiles.value = toArray(result);
    totalItems.value = result.total || 0;
    await loadReplyStatus(serverProfiles.value);
  } catch (error) {
    console.error("[admin] loadPage failed:", error);
    serverProfiles.value = [];
    totalItems.value = 0;
    loadErrorMessage.value = "Failed to load profiles.";
  } finally {
    isTableLoading.value = false;
  }
};

const handleItemsPerPageChange = (event) => {
  const nextValue = Number(event?.target?.value || itemsPerPage.value);
  currentPage.value = 1;
  loadPage(1, nextValue);
};

const goToPreviousPage = () => {
  if (currentPage.value <= 1 || isTableLoading.value) return;
  loadPage(currentPage.value - 1, itemsPerPage.value);
};

const goToNextPage = () => {
  if (currentPage.value >= totalPages.value || isTableLoading.value) return;
  loadPage(currentPage.value + 1, itemsPerPage.value);
};

watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    loadPage();
  }, 400);
});

watch(filterSelection, () => {
  currentPage.value = 1;
  loadPage();
});

watch(expanded, (next) => {
  (next || []).forEach((userId) => ensureActivityLoaded(userId));
});

const loadAllProfilesLight = async () => {
  try {
    const result = await getAdminProfiles(null, { limit: 5000, minimal: true });
    allProfilesLight.value = toArray(result);
  } catch (error) {
    console.warn("[admin] loadAllProfilesLight failed:", error);
    allProfilesLight.value = [];
  }
};

const loadReplyStatus = async (profilesList) => {
  const uniqueIds = Array.from(
    new Set(
      (profilesList || [])
        .filter((profile) => profile?.is_simulated)
        .map((profile) => profile.user_id)
        .filter(Boolean)
    )
  );
  if (!uniqueIds.length) return;
  const batchSize = 80;
  const nextStatus = { ...pendingReplyByUserId.value };
  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    const batch = uniqueIds.slice(index, index + batchSize);
    try {
      const response = await $fetch("/api/admin/reply-status", {
        query: { user_ids: batch.join(",") },
      });
      const map = response?.items || {};
      batch.forEach((id) => {
        nextStatus[id] = !!map[id];
      });
    } catch (error) {
      console.error("[admin] loadReplyStatus error:", error);
    }
  }
  pendingReplyByUserId.value = nextStatus;
};

const refreshReplyStatusFor = async (userId) => {
  if (!userId) return;
  try {
    const response = await $fetch("/api/admin/reply-status", {
      query: { user_ids: userId },
    });
    const map = response?.items || {};
    pendingReplyByUserId.value = {
      ...pendingReplyByUserId.value,
      [userId]: !!map[userId],
    };
  } catch (error) {
    console.error("[admin] loadReplyStatus error:", error);
  }
};

const ensureActivityLoaded = async (userId) => {
  if (!userId || activityByUserId.value[userId]) return;
  if (isActivityLoading(userId)) return;
  activityLoadingIds.value = [...activityLoadingIds.value, userId];
  try {
    await refreshActivity(userId);
  } finally {
    activityLoadingIds.value = activityLoadingIds.value.filter((id) => id !== userId);
  }
};

const refreshActivity = async (userId) => {
  if (!userId) return;
  const { data } = await getUserActivitySummary(userId);
  if (data) {
    activityByUserId.value = {
      ...activityByUserId.value,
      [userId]: data,
    };
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getCountryLabel = (profile) =>
  profile?.country ||
  profile?.country_name ||
  profile?.countries?.name ||
  "—";

const getCountryEmoji = (profile) =>
  profile?.country_emoji || profile?.countries?.emoji || "";

const getAiCategoryLabel = (profile) =>
  profile?.ai_category_name ||
  profile?.aiCategoryName ||
  profile?.category_name ||
  "—";

const profilePath = (profile) => {
  const genderPath =
    profile?.gender?.toLowerCase?.() ||
    (profile?.gender_id ? getGenderPath(profile.gender_id) : "other");
  const slug = profile?.slug || profile?.user_id;
  if (!slug) return null;
  return localPath(`/profiles/${genderPath}/${slug}`);
};

const goToProfile = (profile) => {
  const path = profilePath(profile);
  if (!path) return;
  router.push(path);
};

const editProfile = (profile) => {
  if (!profile?.user_id) return;
  router.push(localPath(`/admin/profiles/${profile.user_id}`));
};

const openMockChatDialog = (profile) => {
  mockUserA.value = profile || null;
  mockUserB.value = "";
  mockJsonText.value = "";
  mockDelayMs.value = 1200;
  mockStartDelayMs.value = 2000;
  mockOpenInNewTab.value = true;
  mockRunning.value = false;
  mockProgress.value = { done: 0, total: 0 };
  mockError.value = "";
  mockInsertedIds.value = [];
  mockAbort = false;
  mockDialogOpen.value = true;
};

const closeMockChatDialog = () => {
  if (mockRunning.value) return;
  mockDialogOpen.value = false;
  mockUserA.value = null;
  mockUserB.value = "";
  mockJsonText.value = "";
  mockError.value = "";
  mockProgress.value = { done: 0, total: 0 };
  mockInsertedIds.value = [];
  mockAbort = false;
};

const onMockFileSelected = async (payload) => {
  try {
    const file =
      payload?.target?.files?.[0] ||
      (Array.isArray(payload) ? payload[0] : payload);
    if (!file) return;
    const text = await file.text();
    mockJsonText.value = text;
    const parsed = JSON.parse(text);
    if (parsed?.userB) mockUserB.value = String(parsed.userB);
    if (Number.isFinite(parsed?.delayMs)) mockDelayMs.value = Number(parsed.delayMs);
  } catch (error) {
    mockError.value = "Invalid JSON file.";
  } finally {
    if (payload?.target) payload.target.value = "";
  }
};

const parseMockPayload = () => {
  if (!mockJsonText.value) {
    return { error: "Please paste or upload a JSON script." };
  }
  try {
    const payload = JSON.parse(mockJsonText.value);
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    if (!messages.length) {
      return { error: "messages[] is required and cannot be empty." };
    }
    const userB = String(payload?.userB || mockUserB.value || "").trim();
    if (!userB) return { error: "userB is required." };
    return {
      userB,
      delayMs: Number.isFinite(payload?.delayMs) ? Number(payload.delayMs) : null,
      messages,
    };
  } catch (error) {
    return { error: "Invalid JSON content." };
  }
};

const runMockChat = async () => {
  if (!mockUserA.value?.user_id) {
    mockError.value = "User A is missing.";
    return;
  }
  mockError.value = "";
  const parsed = parseMockPayload();
  if (parsed.error) {
    mockError.value = parsed.error;
    return;
  }

  const userA = mockUserA.value.user_id;
  const userB = parsed.userB;
  const messages = parsed.messages;
  const delay = Number.isFinite(mockDelayMs.value)
    ? Number(mockDelayMs.value)
    : parsed.delayMs || 1200;
  const startDelay = Number.isFinite(mockStartDelayMs.value)
    ? Number(mockStartDelayMs.value)
    : 2000;

  const chatPath = localPath({
    path: "/chat",
    query: { asUser: userA, userId: userB },
  });
  if (mockOpenInNewTab.value && typeof window !== "undefined") {
    window.open(chatPath, "_blank");
  } else {
    router.push(chatPath);
  }

  mockRunning.value = true;
  mockAbort = false;
  mockProgress.value = { done: 0, total: messages.length };
  mockInsertedIds.value = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  await sleep(startDelay);

  for (let index = 0; index < messages.length; index++) {
    if (mockAbort) break;
    const message = messages[index] || {};
    const from = String(message.from || "").toUpperCase();
    const text = String(message.text ?? message.content ?? "").trim();
    if (!text) {
      mockProgress.value = { done: index + 1, total: messages.length };
      continue;
    }
    const sender_id = from === "B" ? userB : userA;
    const receiver_id = from === "B" ? userA : userB;
    try {
      const response = await $fetch("/api/admin/messages", {
        method: "POST",
        body: { sender_id, receiver_id, content: text },
      });
      if (response?.item?.id) {
        mockInsertedIds.value = [...mockInsertedIds.value, response.item.id];
      }
    } catch (error) {
      mockError.value =
        error?.data?.error?.message ||
        error?.message ||
        "Failed to insert a message.";
      break;
    }
    mockProgress.value = { done: index + 1, total: messages.length };
    if (index < messages.length - 1) await sleep(delay);
  }

  mockRunning.value = false;
  if (mockError.value) return;
  if (mockAbort) {
    setActionNotice("warning", "Mock chat stopped.");
    return;
  }
  setActionNotice(
    "success",
    `Mock chat sent ${mockProgress.value.done} message${mockProgress.value.done === 1 ? "" : "s"}.`
  );
};

const cancelMockChat = () => {
  mockAbort = true;
  mockRunning.value = false;
};

const deleteLastMockRun = async () => {
  if (!mockInsertedIds.value.length) return;
  mockError.value = "";
  const ids = [...mockInsertedIds.value];
  for (const id of ids) {
    try {
      await $fetch(`/api/admin/chat-messages/${id}`, { method: "DELETE" });
    } catch (error) {
      mockError.value =
        error?.data?.error?.message ||
        error?.message ||
        "Failed to delete one or more messages.";
      break;
    }
  }
  if (!mockError.value) {
    mockInsertedIds.value = [];
    setActionNotice("success", "Deleted messages from the last mock run.");
  }
};

const openChatMessages = async (userId) => {
  if (!userId) return;
  activeMessageUserId.value = userId;
  chatMessagesError.value = "";
  chatDialogOpen.value = true;
  await loadChatMessages(userId);
};

const closeChatDialog = () => {
  chatDialogOpen.value = false;
  chatMessages.value = [];
  chatMessagesError.value = "";
  activeMessageUserId.value = null;
};

const loadChatMessages = async (userId) => {
  if (!userId) return;
  chatMessagesLoading.value = true;
  chatMessagesError.value = "";
  try {
    const response = await $fetch("/api/admin/chat-messages", {
      query: { user_id: userId, limit: 60 },
    });
    chatMessages.value = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    console.error("[admin] loadChatMessages error:", error);
    chatMessages.value = [];
    chatMessagesError.value = "Failed to load chat messages.";
  } finally {
    chatMessagesLoading.value = false;
  }
};

const deleteChatMessage = async (message) => {
  if (!message?.id) return;
  deletingMessageIds.value = [...deletingMessageIds.value, message.id];
  try {
    await $fetch(`/api/admin/chat-messages/${message.id}`, {
      method: "DELETE",
    });
    chatMessages.value = chatMessages.value.filter((item) => item.id !== message.id);
    await refreshActivity(activeMessageUserId.value);
    setActionNotice("success", "Message deleted.");
  } catch (error) {
    console.error("[admin] deleteChatMessage error:", error);
    setActionNotice("error", "Failed to delete message.");
  } finally {
    deletingMessageIds.value = deletingMessageIds.value.filter((id) => id !== message.id);
  }
};

const markForDeletion = async (profile) => {
  if (!profile?.user_id) return;
  try {
    await markUserForDeletion(profile.user_id);
    handleUserDeleted(profile.user_id);
    setActionNotice("warning", `${displayNameFor(profile)} marked for deletion.`);
  } catch (error) {
    console.error("[admin] mark user for deletion error:", error);
    setActionNotice("error", "Failed to mark profile for deletion.");
  }
};

const unmarkDeletion = async (profile) => {
  try {
    await unmarkUserForDeletion(profile.user_id);
    handleUserDeleted(profile.user_id, true);
    setActionNotice("success", `${displayNameFor(profile)} restored.`);
  } catch (error) {
    console.error("[admin] Error unmarking user:", error);
    setActionNotice("error", "Failed to undo profile deletion mark.");
  }
};

const handleUserDeleted = (userId, undo = false) => {
  const nextValue = undo ? null : new Date().toISOString();
  serverProfiles.value = serverProfiles.value.map((profile) =>
    profile?.user_id === userId
      ? { ...profile, marked_for_deletion_at: nextValue }
      : profile
  );
};

const syncProfileFlags = (userId, nextFlags) => {
  serverProfiles.value = serverProfiles.value.map((profile) =>
    profile?.user_id === userId ? { ...profile, ...nextFlags } : profile
  );
};

const getAdminFlags = (profile) => {
  if (!profile?.user_id) {
    return { force_online: false, is_simulated: false };
  }
  const userId = profile.user_id;
  if (!adminFlagsByUserId.value[userId]) {
    adminFlagsByUserId.value = {
      ...adminFlagsByUserId.value,
      [userId]: {
        force_online: !!profile.force_online,
        is_simulated: !!profile.is_simulated,
      },
    };
  }
  return adminFlagsByUserId.value[userId];
};

const isAdminFlagsSaving = (userId) => !!adminFlagsSavingByUserId.value[userId];

const adminFlagsStatus = (userId) => adminFlagsStatusByUserId.value[userId] || "";

const saveAdminFlagsFor = async (profile) => {
  const userId = profile?.user_id;
  if (!userId) return;
  const flags = getAdminFlags(profile);
  adminFlagsSavingByUserId.value = {
    ...adminFlagsSavingByUserId.value,
    [userId]: true,
  };
  adminFlagsStatusByUserId.value = {
    ...adminFlagsStatusByUserId.value,
    [userId]: "",
  };
  try {
    const response = await $fetch("/api/admin/profiles-flags", {
      method: "PATCH",
      body: {
        user_id: userId,
        force_online: flags.force_online,
        is_simulated: flags.is_simulated,
      },
    });
    if (response?.item) {
      syncProfileFlags(userId, response.item);
      adminFlagsByUserId.value = {
        ...adminFlagsByUserId.value,
        [userId]: {
          force_online: !!response.item.force_online,
          is_simulated: !!response.item.is_simulated,
        },
      };
    } else {
      syncProfileFlags(userId, {
        force_online: !!flags.force_online,
        is_simulated: !!flags.is_simulated,
      });
    }

    if (flags.is_simulated) {
      await refreshReplyStatusFor(userId);
    } else {
      const nextPending = { ...pendingReplyByUserId.value };
      delete nextPending[userId];
      pendingReplyByUserId.value = nextPending;
    }

    adminFlagsStatusByUserId.value = {
      ...adminFlagsStatusByUserId.value,
      [userId]: "Saved",
    };
  } catch (error) {
    console.error("[admin] flags save error:", error);
    adminFlagsStatusByUserId.value = {
      ...adminFlagsStatusByUserId.value,
      [userId]: "Save failed",
    };
  } finally {
    adminFlagsSavingByUserId.value = {
      ...adminFlagsSavingByUserId.value,
      [userId]: false,
    };
    setTimeout(() => {
      adminFlagsStatusByUserId.value = {
        ...adminFlagsStatusByUserId.value,
        [userId]: "",
      };
    }, 2000);
  }
};

const onAdminFlagToggle = (profile) => {
  const userId = profile?.user_id;
  if (!userId) return;
  const timers = adminFlagsSaveTimers.value;
  if (timers[userId]) {
    clearTimeout(timers[userId]);
  }
  adminFlagsStatusByUserId.value = {
    ...adminFlagsStatusByUserId.value,
    [userId]: "Saving...",
  };
  adminFlagsSaveTimers.value = {
    ...adminFlagsSaveTimers.value,
    [userId]: setTimeout(() => saveAdminFlagsFor(profile), 350),
  };
};

const closePurgeDialog = () => {
  if (purgeBusy.value) return;
  purgeDialogOpen.value = false;
  purgeError.value = "";
};

const purgeMarkedProfiles = async () => {
  purgeBusy.value = true;
  purgeError.value = "";
  try {
    const response = await $fetch("/api/admin/profiles/purge", {
      method: "POST",
    });
    const deletedIds = Array.isArray(response?.deletedUserIds)
      ? response.deletedUserIds
      : [];
    if (deletedIds.length) {
      const nextPending = { ...pendingReplyByUserId.value };
      deletedIds.forEach((id) => delete nextPending[id]);
      pendingReplyByUserId.value = nextPending;
    }
    if (response?.failed?.length) {
      purgeError.value = `Failed to delete ${response.failed.length} user(s).`;
      return;
    }
    purgeDialogOpen.value = false;
    await loadPage();
    setActionNotice(
      "success",
      `Purged ${deletedIds.length} marked profile${deletedIds.length === 1 ? "" : "s"}.`
    );
  } catch (error) {
    console.error("[admin] purgeMarkedProfiles error:", error);
    purgeError.value = "Purge failed.";
  } finally {
    purgeBusy.value = false;
  }
};

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    console.log("Unauthorized access to admin panel");
    router.push(localPath("/"));
    return;
  }
  const route = useRoute();
  const section = route.query?.section;
  if (section === "profilePhotos") filterSelection.value = "photos_pending";
  await loadPage();
  isLoading.value = false;
  loadAllProfilesLight();
  loadPendingPhotoUsers();
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  if (actionNoticeTimer && typeof window !== "undefined") {
    window.clearTimeout(actionNoticeTimer);
  }
  Object.values(adminFlagsSaveTimers.value).forEach((timer) => {
    if (timer) clearTimeout(timer);
  });
});
</script>

<style scoped>
.admin-dashboard {
  max-width: 100%;
}

.admin-dashboard-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-dashboard-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-dashboard-card__heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.admin-dashboard-card__icon {
  color: rgb(var(--color-primary));
  font-size: 1.4rem;
  margin-top: 2px;
}

.admin-dashboard-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-dashboard-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-dashboard-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-dashboard-card__body {
  padding: 20px 22px 22px;
}

.admin-dashboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.admin-dashboard-toolbar__actions {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.admin-dashboard-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.admin-dashboard-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.admin-dashboard-field__label--sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.admin-dashboard-field--search {
  flex: 1 1 320px;
}

.admin-dashboard-field--toolbar-select {
  flex: 0 1 190px;
}

.admin-dashboard-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-dashboard-input-wrap__icon {
  position: absolute;
  left: 12px;
  color: rgba(var(--color-text), 0.54);
  font-size: 1rem;
  pointer-events: none;
}

.admin-dashboard-field__control {
  width: 100%;
  min-height: 42px;
  border: 1px solid rgba(var(--color-border), 0.86);
  border-radius: 14px;
  background: rgba(var(--color-surface), 0.96);
  color: rgb(var(--color-text));
  padding: 0 14px;
  font: inherit;
}

.admin-dashboard-toolbar .admin-dashboard-field__control {
  min-height: 38px;
  border-radius: 12px;
}

.admin-dashboard-field__control--with-icon {
  padding-left: 36px;
  padding-right: 36px;
}

.admin-dashboard-field__control--textarea {
  min-height: 180px;
  padding: 12px 14px;
  resize: vertical;
}

.admin-dashboard-file-input {
  width: 100%;
  min-height: 42px;
  border: 1px dashed rgba(var(--color-border), 0.88);
  border-radius: 14px;
  background: rgba(var(--color-surface), 0.96);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font: inherit;
}

.admin-dashboard-clear-button {
  position: absolute;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--color-text), 0.54);
}

.admin-dashboard-button,
.admin-dashboard-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 0 16px;
  font-size: 0.9rem;
  font-weight: 600;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.admin-dashboard-icon-button {
  width: 32px;
  min-height: 32px;
  padding: 0;
}

.admin-dashboard-button:hover,
.admin-dashboard-icon-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.admin-dashboard-button:disabled,
.admin-dashboard-icon-button:disabled,
.admin-dashboard-clear-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.admin-dashboard-button--primary,
.admin-dashboard-icon-button--primary {
  border-color: rgba(var(--color-primary), 0.26);
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-primary));
}

.admin-dashboard-button--danger,
.admin-dashboard-icon-button--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: rgb(185, 28, 28);
}

.admin-dashboard-button--success,
.admin-dashboard-icon-button--success {
  border-color: rgba(34, 197, 94, 0.26);
  background: rgba(34, 197, 94, 0.1);
  color: rgb(22, 101, 52);
}

.admin-dashboard-button--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  color: rgb(180, 83, 9);
}

.admin-dashboard-button--ghost {
  background: rgba(var(--color-surface-elevated), 0.92);
}

.admin-dashboard-icon-button--ghost {
  background: rgba(var(--color-surface-elevated), 0.92);
}

.admin-dashboard-icon-button--info {
  border-color: rgba(59, 130, 246, 0.24);
  background: rgba(59, 130, 246, 0.1);
  color: rgb(29, 78, 216);
}

.admin-dashboard-icon-button--accent {
  border-color: rgba(124, 58, 237, 0.24);
  background: rgba(124, 58, 237, 0.1);
  color: rgb(109, 40, 217);
}

.admin-dashboard-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: admin-dashboard-spin 0.8s linear infinite;
}

.admin-dashboard-banner {
  margin-bottom: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
}

.admin-dashboard-banner--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.24);
  color: rgb(var(--color-text));
}

.admin-dashboard-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-dashboard-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-dashboard-pagination--top {
  margin-bottom: 12px;
}

.admin-dashboard-toolbar__summary,
.admin-dashboard-pagination__summary,
.admin-dashboard-pagination__page,
.admin-dashboard-status-subline {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.84rem;
}

.admin-dashboard-pagination__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.admin-dashboard-table-shell {
  min-height: 220px;
}

.admin-dashboard-loading-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-dashboard-table-wrap {
  overflow: auto;
  max-height: 680px;
  margin-bottom: 16px;
  border: 1px solid rgba(var(--color-border), 0.84);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.82);
}

.admin-dashboard-table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0;
}

.admin-dashboard-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--color-surface-elevated));
  color: rgba(var(--color-text), 0.72);
  text-align: left;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
  box-shadow: inset 0 -1px 0 rgba(var(--color-border), 0.82);
}

.admin-dashboard-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--color-border), 0.7);
  vertical-align: middle;
}

.admin-dashboard-table__row:hover td {
  background: rgba(var(--color-primary), 0.03);
}

.admin-dashboard-table__actions-head {
  text-align: center;
}

.admin-dashboard-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-dashboard-avatar-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  padding: 0;
}

.admin-dashboard-avatar-wrap.has-pending-reply::after {
  content: "";
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgb(220, 38, 38);
  box-shadow: 0 0 0 2px rgba(var(--color-surface), 1);
}

.admin-dashboard-avatar {
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.84);
  background: rgba(var(--color-surface-elevated), 0.96);
}

.admin-dashboard-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.admin-dashboard-flag-icon {
  position: absolute;
  right: -4px;
  top: -4px;
  font-size: 17px;
  line-height: 1;
}

.admin-dashboard-registered-badge {
  position: absolute;
  left: -6px;
  top: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 193, 7, 0.16);
  color: rgb(180, 83, 9);
  font-size: 0.72rem;
}

.admin-dashboard-gender-icon {
  position: absolute;
  left: -4px;
  bottom: -4px;
  color: var(--admin-gender-color, #a855f7);
  font-size: 20px;
}

.admin-dashboard-gender-icon.is-male {
  color: var(--admin-gender-color, #3b82f6);
}

.admin-dashboard-gender-icon.is-female {
  color: var(--admin-gender-color, #ec4899);
}

.admin-dashboard-gender-icon.is-other {
  color: var(--admin-gender-color, #a855f7);
}

.admin-dashboard-profile__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-dashboard-profile-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: rgb(var(--color-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.admin-dashboard-profile-link:hover {
  text-decoration: underline;
}

.admin-dashboard-profile-link:focus-visible,
.admin-dashboard-avatar-wrap:focus-visible,
.admin-dashboard-button:focus-visible,
.admin-dashboard-icon-button:focus-visible,
.admin-dashboard-field__control:focus-visible,
.admin-dashboard-file-input:focus-visible {
  outline: 2px solid rgba(var(--color-primary), 0.65);
  outline-offset: 2px;
}

.admin-dashboard-profile__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: rgba(var(--color-text), 0.66);
  font-size: 0.78rem;
}

.admin-dashboard-profile__meta-separator {
  color: rgba(var(--color-text), 0.42);
}

.admin-dashboard-actions,
.admin-dashboard-hit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.admin-dashboard-hit-list {
  flex-direction: column;
  align-items: stretch;
}

.admin-dashboard-tagline {
  max-width: 320px;
  color: rgba(var(--color-text), 0.78);
  font-size: 0.84rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-dashboard-status-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-dashboard-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.admin-dashboard-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  min-height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  background: rgba(var(--color-surface-elevated), 0.96);
  color: rgb(var(--color-text));
  font-size: 0.7rem;
  font-weight: 700;
}

.admin-dashboard-pill--neutral {
  background: rgba(148, 163, 184, 0.14);
  color: rgb(71, 85, 105);
}

.admin-dashboard-pill--primary {
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.admin-dashboard-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.admin-dashboard-pill--warning {
  background: rgba(245, 158, 11, 0.14);
  color: rgb(180, 83, 9);
}

.admin-dashboard-pill--danger {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-dashboard-pill--info {
  background: rgba(59, 130, 246, 0.12);
  color: rgb(29, 78, 216);
}

.admin-dashboard-pill--accent {
  background: rgba(168, 85, 247, 0.12);
  color: rgb(107, 33, 168);
}

.admin-dashboard-table__expanded-row td {
  padding: 8px 12px 12px;
  background: transparent;
  border-bottom: 0;
}

.admin-dashboard-expanded {
  padding: 2px 0 0;
}

.admin-dashboard-expanded__loading {
  padding: 4px 0;
}

.admin-dashboard-progress-bar {
  position: relative;
  display: block;
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--color-primary), 0.14);
}

.admin-dashboard-progress-bar::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 36%;
  border-radius: inherit;
  background: rgb(var(--color-primary));
  animation: admin-dashboard-progress 1.1s ease-in-out infinite;
}

.admin-dashboard-expanded__content {
  min-width: 0;
}

.admin-dashboard-expanded__panel {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid rgba(var(--color-border), 0.84);
  border-radius: 20px;
  background: rgb(var(--color-surface-elevated));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.admin-dashboard-expanded__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px 14px;
  align-items: start;
}

.admin-dashboard-expanded__aside,
.admin-dashboard-expanded__main,
.admin-dashboard-expanded__supplemental {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.admin-dashboard-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px 12px;
}

.admin-dashboard-detail-item,
.admin-dashboard-stat-card {
  min-width: 0;
}

.admin-dashboard-detail-item {
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-border), 0.78);
  border-radius: 14px;
  background: rgb(var(--color-surface));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.admin-dashboard-detail-item__label {
  display: block;
  color: rgba(var(--color-text), 0.66);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.admin-dashboard-detail-item__value,
.admin-dashboard-stat-card__value {
  display: block;
  color: rgb(var(--color-text));
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-dashboard-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.admin-dashboard-expanded__supplemental {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.admin-dashboard-stat-card,
.admin-dashboard-inline-card {
  border: 1px solid rgba(var(--color-border), 0.78);
  border-radius: 14px;
  background: rgb(var(--color-surface));
  padding: 10px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.admin-dashboard-stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-dashboard-stat-card__value {
  font-size: 1.05rem;
}

.admin-dashboard-stat-card__value--link {
  border: 0;
  background: transparent;
  padding: 0;
  color: rgb(var(--color-primary));
  cursor: pointer;
  font: inherit;
  font-size: 1.2rem;
  font-weight: 700;
  text-align: left;
}

.admin-dashboard-inline-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-dashboard-inline-card--stack {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
}

.admin-dashboard-inline-card--wide {
  grid-column: 1 / -1;
}

.admin-dashboard-inline-card__copy,
.admin-dashboard-inline-status {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.82rem;
}

.admin-dashboard-toggle-row > .admin-dashboard-inline-status {
  grid-column: 1 / -1;
}

.admin-dashboard-toggle-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 10px;
}

.admin-dashboard-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-border), 0.8);
  border-radius: 14px;
  background: rgba(var(--color-surface-elevated), 0.72);
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.admin-dashboard-toggle.is-checked {
  border-color: rgba(var(--color-primary), 0.4);
  background: rgba(var(--color-primary), 0.1);
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary), 0.08);
}

.admin-dashboard-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.admin-dashboard-toggle__track {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.55);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.admin-dashboard-toggle__track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.18);
  transition:
    transform 0.18s ease,
    background 0.18s ease;
}

.admin-dashboard-toggle input:checked + .admin-dashboard-toggle__track {
  background: rgb(var(--color-primary));
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary), 0.16);
}

.admin-dashboard-toggle input:checked + .admin-dashboard-toggle__track::after {
  transform: translateX(18px);
  background: rgb(255, 255, 255);
}

.admin-dashboard-toggle input:disabled + .admin-dashboard-toggle__track {
  opacity: 0.5;
}

.admin-dashboard-toggle__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.admin-dashboard-toggle__label {
  color: rgb(var(--color-text));
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-dashboard-toggle__state {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.admin-dashboard-toggle__state--on {
  background: rgba(34, 197, 94, 0.14);
  color: rgb(22, 101, 52);
}

.admin-dashboard-toggle__state--off {
  background: rgba(148, 163, 184, 0.16);
  color: rgba(var(--color-text), 0.72);
}

.admin-dashboard-toggle--standalone {
  align-self: flex-start;
}

.admin-dashboard-hit-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
  color: rgba(var(--color-text), 0.76);
  font-size: 0.8rem;
}

.admin-dashboard-ellipsis,
.admin-dashboard-chat-message {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-dashboard-toast-layer {
  position: fixed;
  top: 72px;
  right: 1rem;
  z-index: 2100;
  pointer-events: none;
}

.admin-dashboard-toast {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: min(360px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.24);
  color: rgb(248, 250, 252);
  pointer-events: auto;
}

.admin-dashboard-toast--success i {
  color: rgb(74, 222, 128);
}

.admin-dashboard-toast--error i {
  color: rgb(248, 113, 113);
}

.admin-dashboard-toast--warning i {
  color: rgb(251, 191, 36);
}

.admin-dashboard-toast--info i {
  color: rgb(96, 165, 250);
}

.admin-dashboard-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-dashboard-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.54);
}

.admin-dashboard-modal {
  position: relative;
  width: min(100%, 720px);
  max-height: calc(100vh - 48px);
}

.admin-dashboard-modal--compact {
  width: min(100%, 460px);
}

.admin-dashboard-modal--wide {
  width: min(100%, 720px);
}

.admin-dashboard-modal--xl {
  width: min(100%, 980px);
}

.admin-dashboard-modal__card {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.98), rgba(var(--color-surface), 0.98));
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
}

.admin-dashboard-modal__card--scrollable .admin-dashboard-modal__body {
  overflow-y: auto;
}

.admin-dashboard-modal__header,
.admin-dashboard-modal__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.admin-dashboard-modal__header {
  border-bottom: 1px solid rgba(var(--color-border), 0.78);
}

.admin-dashboard-modal__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-dashboard-modal__body {
  padding: 18px 20px;
}

.admin-dashboard-modal__body--stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-dashboard-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.admin-dashboard-modal__actions {
  justify-content: flex-end;
  border-top: 1px solid rgba(var(--color-border), 0.78);
}

.admin-dashboard-dialog-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-dashboard-table-wrap--dialog {
  max-height: 420px;
  margin-bottom: 0;
}

.admin-dashboard-table--dialog {
  min-width: 720px;
}

.admin-dashboard-toast-fade-enter-active,
.admin-dashboard-toast-fade-leave-active,
.admin-dashboard-modal-fade-enter-active,
.admin-dashboard-modal-fade-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.admin-dashboard-toast-fade-enter-from,
.admin-dashboard-toast-fade-leave-to,
.admin-dashboard-modal-fade-enter-from,
.admin-dashboard-modal-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1260px) {
  .admin-dashboard-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-dashboard-toolbar__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 980px) {
  .admin-dashboard-expanded__supplemental,
  .admin-dashboard-detail-grid,
  .admin-dashboard-stat-grid,
  .admin-dashboard-modal__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .admin-dashboard-card__header,
  .admin-dashboard-pagination,
  .admin-dashboard-modal__header,
  .admin-dashboard-modal__actions,
  .admin-dashboard-inline-card {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-dashboard-detail-grid,
  .admin-dashboard-expanded__supplemental,
  .admin-dashboard-stat-grid,
  .admin-dashboard-toggle-row,
  .admin-dashboard-modal__grid {
    grid-template-columns: 1fr;
  }

  .admin-dashboard-toolbar {
    align-items: stretch;
  }

  .admin-dashboard-field--toolbar-select,
  .admin-dashboard-toolbar__actions {
    flex-basis: 100%;
  }

  .admin-dashboard-table {
    min-width: 760px;
  }

  .admin-dashboard-modal-layer {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .admin-dashboard-toast-layer {
    left: 1rem;
    right: 1rem;
  }

  .admin-dashboard-toast {
    max-width: none;
  }
}

@keyframes admin-dashboard-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes admin-dashboard-progress {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}
</style>
