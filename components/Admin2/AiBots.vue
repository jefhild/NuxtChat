<template>
  <div class="admin-ai-bots">
    <LoadingContainer
      v-if="loading"
      text="Loading AI bots..."
      class="admin-ai-bots__loading"
    />

    <template v-else>
      <div
        v-if="loadError"
        class="admin-ai-bots__banner admin-ai-bots__banner--danger"
        role="alert"
      >
        {{ loadError }}
      </div>

      <section class="admin-ai-bots__card">
        <div class="admin-ai-bots__header">
          <div>
            <div class="admin-ai-bots__title-row">
              <h2 class="admin-ai-bots__title">AI Bots</h2>
              <span class="admin-ai-bots__count-pill">{{ bots.length }} total</span>
            </div>
            <p class="admin-ai-bots__subtitle">
              Manage personas, prompts, and OpenAI settings for your chat agents.
            </p>
          </div>

          <div class="admin-ai-bots__toolbar">
            <button
              type="button"
              class="admin-ai-bots__button"
              :disabled="loadingList"
              @click="loadBots"
            >
              <span
                v-if="loadingList"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              <i v-else class="mdi mdi-refresh" aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              class="admin-ai-bots__button admin-ai-bots__button--info"
              :disabled="runningHoneyMoltbook"
              @click="runHoneyMoltbookNow"
            >
              <span
                v-if="runningHoneyMoltbook"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              <i v-else class="mdi mdi-post" aria-hidden="true" />
              Run Honey Moltbook
            </button>
            <button
              type="button"
              class="admin-ai-bots__button admin-ai-bots__button--success"
              :disabled="runningLinkedAgents"
              @click="runLinkedAgentsDailyProfileNow"
            >
              <span
                v-if="runningLinkedAgents"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              <i v-else class="mdi mdi-account-broadcast-outline" aria-hidden="true" />
              Run LinkedAgents
            </button>
            <button
              type="button"
              class="admin-ai-bots__button admin-ai-bots__button--primary"
              @click="openCreateDialog"
            >
              <i class="mdi mdi-robot-happy-outline" aria-hidden="true" />
              Add Bot
            </button>
          </div>
        </div>

        <div
          v-if="linkedAgentsRunNotice"
          class="admin-ai-bots__banner"
          :class="bannerToneClass(linkedAgentsRunNotice.type)"
          role="status"
        >
          {{ linkedAgentsRunNotice.message }}
        </div>

        <div class="admin-ai-bots__body">
          <div class="admin-ai-bots__filters">
            <label class="admin-ai-bots__field admin-ai-bots__field--search">
              <span class="admin-ai-bots__field-label">Search</span>
              <span class="admin-ai-bots__input-wrap">
                <i class="mdi mdi-magnify admin-ai-bots__input-icon" aria-hidden="true" />
                <input
                  v-model="search"
                  type="search"
                  class="admin-ai-bots__control admin-ai-bots__control--with-icon"
                  placeholder="Search by name, key, or model"
                >
              </span>
            </label>

            <label class="admin-ai-bots__field admin-ai-bots__field--compact">
              <span class="admin-ai-bots__field-label">Capability filter</span>
              <select
                v-model="capabilityFilter"
                class="admin-ai-bots__control"
              >
                <option
                  v-for="option in capabilityFilterOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div
            v-if="activeFilterNotice"
            class="admin-ai-bots__banner admin-ai-bots__banner--info"
            role="status"
          >
            <div class="admin-ai-bots__banner-row">
              <span>{{ activeFilterNotice }}</span>
              <button
                type="button"
                class="admin-ai-bots__button admin-ai-bots__button--ghost"
                @click="capabilityFilter = 'all'"
              >
                Show all
              </button>
            </div>
          </div>

          <div class="admin-ai-bots__table-wrap">
            <table class="admin-ai-bots__table">
              <thead>
                <tr>
                  <th>Bot</th>
                  <th>Model</th>
                  <th>Prompt</th>
                  <th>Status</th>
                  <th class="admin-ai-bots__table-actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bot in filteredBots" :key="bot.id">
                  <td>
                    <div class="admin-ai-bots__identity">
                      <div class="admin-ai-bots__avatar">
                        <img
                          v-if="bot.profile?.avatar_url"
                          :src="bot.profile.avatar_url"
                          alt=""
                          class="admin-ai-bots__avatar-image"
                        >
                        <span v-else class="admin-ai-bots__avatar-fallback">
                          {{ avatarInitial(bot) }}
                        </span>
                      </div>

                      <div class="admin-ai-bots__identity-copy">
                        <div class="admin-ai-bots__identity-name">
                          <span>{{ bot.profile?.displayname || "Unnamed bot" }}</span>
                          <span class="admin-ai-bots__pill admin-ai-bots__pill--accent">
                            {{ bot.role }}
                          </span>
                        </div>
                        <div class="admin-ai-bots__identity-meta">
                          {{ bot.persona_key }}
                        </div>
                        <div
                          v-if="bot.category?.name || bot.category_id"
                          class="admin-ai-bots__chip-row"
                        >
                          <span class="admin-ai-bots__pill admin-ai-bots__pill--primary">
                            {{ bot.category?.name || "Unassigned category" }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div class="admin-ai-bots__cell-title">{{ bot.model }}</div>
                    <div class="admin-ai-bots__muted">
                      Temp {{ bot.temperature }} · Top P {{ bot.top_p }}
                    </div>
                  </td>

                  <td>
                    <div class="admin-ai-bots__prompt-preview">
                      {{ truncate(bot.system_prompt_template) }}
                    </div>
                    <div class="admin-ai-bots__muted">
                      Updated {{ formatTimestamp(bot.updated_at || bot.created_at) }}
                    </div>
                  </td>

                  <td>
                    <span
                      class="admin-ai-bots__pill"
                      :class="pillToneClass(bot.is_active ? 'success' : 'grey')"
                    >
                      {{ bot.is_active ? "Active" : "Inactive" }}
                    </span>

                    <div class="admin-ai-bots__chip-row admin-ai-bots__chip-row--tight">
                      <span
                        v-for="loc in ['en', 'fr', 'ru', 'zh']"
                        :key="loc"
                        class="admin-ai-bots__pill admin-ai-bots__pill--locale"
                        :class="{
                          'admin-ai-bots__pill--primary': angleTranslatedLocales(bot).includes(loc),
                          'admin-ai-bots__pill--neutral': !angleTranslatedLocales(bot).includes(loc),
                          'admin-ai-bots__pill--dim': !angleTranslatedLocales(bot).includes(loc),
                        }"
                        :title="angleTranslatedLocales(bot).includes(loc) ? `${loc} angle translated` : `${loc} not translated`"
                      >
                        {{ loc }}
                      </span>
                    </div>

                    <div class="admin-ai-bots__chip-row">
                      <span
                        v-if="bot.editorial_enabled"
                        class="admin-ai-bots__pill admin-ai-bots__pill--info"
                      >
                        Editorial
                      </span>
                      <span
                        v-if="bot.counterpoint_enabled"
                        class="admin-ai-bots__pill admin-ai-bots__pill--success"
                      >
                        Counterpoint
                      </span>
                      <span
                        v-if="bot.honey_enabled"
                        class="admin-ai-bots__pill admin-ai-bots__pill--warning"
                      >
                        Honey
                      </span>
                      <span
                        v-if="hasLanguagePracticeCapability(bot)"
                        class="admin-ai-bots__pill admin-ai-bots__pill--success"
                      >
                        Language Practice
                      </span>
                      <span
                        v-else
                        class="admin-ai-bots__pill admin-ai-bots__pill--neutral"
                        :title="languagePracticeDiagnosticText(bot)"
                      >
                        LP off
                      </span>
                      <span
                        class="admin-ai-bots__pill"
                        :class="pillToneClass(moltbookStatusColor(bot))"
                      >
                        Moltbook {{ bot.moltbook?.enabled ? "On" : "Off" }}
                      </span>
                    </div>

                    <div class="admin-ai-bots__muted">
                      {{ moltbookUsageLabel(bot) }}
                    </div>
                  </td>

                  <td>
                    <div class="admin-ai-bots__actions">
                      <button
                        type="button"
                        class="admin-ai-bots__icon-button admin-ai-bots__icon-button--info"
                        :disabled="!canPostToMoltbook(bot)"
                        :title="canPostToMoltbook(bot) ? 'Post to Moltbook' : 'Enable Moltbook posting and configure a matching API key first'"
                        :aria-label="`Post to Moltbook as ${bot.profile?.displayname || bot.persona_key}`"
                        @click="openPostDialog(bot)"
                      >
                        <i class="mdi mdi-post-outline" aria-hidden="true" />
                      </button>

                      <NuxtLink
                        v-if="profileEditLink(bot)"
                        :to="profileEditLink(bot)"
                        class="admin-ai-bots__icon-button admin-ai-bots__icon-button--neutral"
                        :aria-label="`Edit profile for ${bot.profile?.displayname || bot.persona_key}`"
                        title="Edit attached profile"
                      >
                        <i class="mdi mdi-account-edit" aria-hidden="true" />
                      </NuxtLink>
                      <button
                        v-else
                        type="button"
                        class="admin-ai-bots__icon-button admin-ai-bots__icon-button--neutral"
                        disabled
                        title="No attached profile"
                        aria-label="No attached profile"
                      >
                        <i class="mdi mdi-account-edit" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        class="admin-ai-bots__icon-button admin-ai-bots__icon-button--primary"
                        :aria-label="`Edit ${bot.profile?.displayname || bot.persona_key}`"
                        title="Edit bot"
                        @click="openEditDialog(bot)"
                      >
                        <i class="mdi mdi-pencil" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        class="admin-ai-bots__icon-button admin-ai-bots__icon-button--danger"
                        :aria-label="`Delete ${bot.profile?.displayname || bot.persona_key}`"
                        title="Delete bot"
                        @click="openDeleteDialog(bot)"
                      >
                        <i class="mdi mdi-delete" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="!filteredBots.length">
                  <td colspan="5" class="admin-ai-bots__empty-row">
                    {{ emptyBotsMessage }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="admin-ai-bots__card">
        <div class="admin-ai-bots__header">
          <div>
            <div class="admin-ai-bots__title-row">
              <h2 class="admin-ai-bots__title">Match Mood Tester</h2>
            </div>
            <p class="admin-ai-bots__subtitle">
              Set a bot's <code>live_mood_states</code> and create a
              <code>match_intakes</code> snapshot to test the matching pipeline.
            </p>
          </div>
        </div>

        <div class="admin-ai-bots__body">
          <div class="admin-ai-bots__grid admin-ai-bots__grid--tester">
            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Bot</span>
              <select v-model="moodForm.botUserId" class="admin-ai-bots__control">
                <option :value="null">Select a bot</option>
                <option
                  v-for="option in botOptions"
                  :key="option.user_id"
                  :value="option.user_id"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Emotion</span>
              <select v-model="moodForm.emotion" class="admin-ai-bots__control">
                <option :value="null">None</option>
                <option v-for="emotion in MOOD_EMOTIONS" :key="emotion" :value="emotion">
                  {{ emotion }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Intent</span>
              <select v-model="moodForm.intent" class="admin-ai-bots__control">
                <option :value="null">None</option>
                <option
                  v-for="option in MOOD_INTENT_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Energy</span>
              <select v-model="moodForm.energy" class="admin-ai-bots__control">
                <option :value="null">None</option>
                <option v-for="energy in MOOD_ENERGY" :key="energy" :value="energy">
                  {{ energy }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Privacy</span>
              <select v-model="moodForm.privacy" class="admin-ai-bots__control">
                <option
                  v-for="option in MOOD_PRIVACY_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field">
              <span class="admin-ai-bots__field-label">Time horizon</span>
              <select v-model="moodForm.timeHorizon" class="admin-ai-bots__control">
                <option
                  v-for="option in MOOD_TIME_HORIZON_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="admin-ai-bots__field admin-ai-bots__field--full">
              <span class="admin-ai-bots__field-label">Free text (optional)</span>
              <input
                v-model="moodForm.freeText"
                type="text"
                class="admin-ai-bots__control"
                placeholder="Optional note"
              >
            </label>
          </div>

          <div class="admin-ai-bots__toolbar admin-ai-bots__toolbar--tester">
            <button
              type="button"
              class="admin-ai-bots__button admin-ai-bots__button--warning"
              :disabled="settingMood || !moodForm.botUserId"
              @click="submitBotMood"
            >
              <span
                v-if="settingMood"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              <i v-else class="mdi mdi-check-circle-outline" aria-hidden="true" />
              Set Mood
            </button>
            <button
              type="button"
              class="admin-ai-bots__button"
              :disabled="clearingMood || !moodForm.botUserId"
              @click="clearBotMood"
            >
              <span
                v-if="clearingMood"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              Clear Mood
            </button>
            <div class="admin-ai-bots__toolbar-spacer" />
            <button
              type="button"
              class="admin-ai-bots__button admin-ai-bots__button--danger"
              :disabled="clearingAllIntakes"
              @click="clearAllBotIntakes"
            >
              <span
                v-if="clearingAllIntakes"
                class="admin-ai-bots__spinner"
                aria-hidden="true"
              />
              <i v-else class="mdi mdi-delete-sweep-outline" aria-hidden="true" />
              Clear All Bot Intakes
            </button>
          </div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="admin-ai-bots-modal-fade">
        <div
          v-if="dialog"
          class="admin-ai-bots__modal-layer"
          role="presentation"
        >
          <button
            type="button"
            class="admin-ai-bots__modal-backdrop"
            aria-label="Close AI bot dialog"
            :disabled="saving"
            @click="closeDialog"
          />

          <div
            class="admin-ai-bots__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ai-bots-dialog-title"
          >
            <form class="admin-ai-bots__modal-card" @submit.prevent="handleSubmit">
              <div class="admin-ai-bots__modal-header">
                <div>
                  <h2 id="admin-ai-bots-dialog-title" class="admin-ai-bots__modal-title">
                    {{ editingId ? "Edit AI Bot" : "Create AI Bot" }}
                  </h2>
                  <p class="admin-ai-bots__modal-subtitle">
                    Configure the persona, prompts, and capability-specific settings.
                  </p>
                </div>
                <button
                  type="button"
                  class="admin-ai-bots__icon-button admin-ai-bots__icon-button--neutral"
                  :disabled="saving"
                  aria-label="Close AI bot dialog"
                  @click="closeDialog"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </div>

              <div class="admin-ai-bots__modal-body">
                <section class="admin-ai-bots__section">
                  <h3 class="admin-ai-bots__section-title">Profile</h3>

                  <label class="admin-ai-bots__field">
                    <span class="admin-ai-bots__field-label">Attach existing profile</span>
                    <select
                      v-model="form.persona.profile_user_id"
                      class="admin-ai-bots__control"
                      :class="{ 'admin-ai-bots__control--error': formErrors.profile_user_id }"
                      :disabled="Boolean(editingId)"
                    >
                      <option value="">Select a profile</option>
                      <option
                        v-for="profile in profileOptions"
                        :key="profile.user_id"
                        :value="profile.user_id"
                      >
                        {{ profile.label }}
                      </option>
                    </select>
                    <span class="admin-ai-bots__help">
                      Create/edit photos, bio, age, and gender in Profile Admin first, then attach here.
                    </span>
                    <span v-if="formErrors.profile_user_id" class="admin-ai-bots__error">
                      {{ formErrors.profile_user_id }}
                    </span>
                  </label>

                  <div
                    v-if="selectedProfile"
                    class="admin-ai-bots__info-panel admin-ai-bots__info-panel--info"
                  >
                    <div class="admin-ai-bots__profile-preview">
                      <div class="admin-ai-bots__avatar admin-ai-bots__avatar--large">
                        <img
                          v-if="selectedProfile.avatar_url"
                          :src="selectedProfile.avatar_url"
                          alt=""
                          class="admin-ai-bots__avatar-image"
                        >
                        <span v-else class="admin-ai-bots__avatar-fallback">
                          {{ avatarInitial({ profile: selectedProfile }) }}
                        </span>
                      </div>
                      <div>
                        <div class="admin-ai-bots__cell-title">
                          {{ selectedProfile.displayname || selectedProfile.slug || selectedProfile.user_id }}
                        </div>
                        <div class="admin-ai-bots__muted">
                          {{ selectedProfile.slug || selectedProfile.user_id }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="!editingId && selectedProfileLinkedPersonaKey"
                    class="admin-ai-bots__info-panel admin-ai-bots__info-panel--warning"
                  >
                    This profile is already linked to AI persona
                    <strong>{{ selectedProfileLinkedPersonaKey }}</strong>.
                    Edit that bot instead of creating another one.
                  </div>
                </section>

                <section class="admin-ai-bots__section">
                  <h3 class="admin-ai-bots__section-title">Bot Setup</h3>

                  <div class="admin-ai-bots__grid">
                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">Persona Key</span>
                      <input
                        v-model="form.persona.persona_key"
                        type="text"
                        class="admin-ai-bots__control"
                        :class="{ 'admin-ai-bots__control--error': formErrors.persona_key }"
                        @input="personaKeyTouched = true"
                      >
                      <span v-if="formErrors.persona_key" class="admin-ai-bots__error">
                        {{ formErrors.persona_key }}
                      </span>
                    </label>

                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">OpenAI model</span>
                      <input
                        v-model="form.persona.model"
                        type="text"
                        class="admin-ai-bots__control"
                        :class="{ 'admin-ai-bots__control--error': formErrors.model }"
                      >
                      <span v-if="formErrors.model" class="admin-ai-bots__error">
                        {{ formErrors.model }}
                      </span>
                    </label>
                  </div>

                  <div class="admin-ai-bots__toggle-grid">
                    <label class="admin-ai-bots__toggle">
                      <input v-model="form.persona.is_active" type="checkbox">
                      <span>Active</span>
                    </label>
                    <label class="admin-ai-bots__toggle">
                      <input v-model="form.persona.list_publicly" type="checkbox">
                      <span>Public listing</span>
                    </label>
                    <label class="admin-ai-bots__toggle">
                      <input v-model="form.persona.editorial_enabled" type="checkbox">
                      <span>Editorial</span>
                    </label>
                    <label class="admin-ai-bots__toggle">
                      <input v-model="form.persona.counterpoint_enabled" type="checkbox">
                      <span>Counterpoint</span>
                    </label>
                    <label class="admin-ai-bots__toggle">
                      <input v-model="languagePracticeForm.enabled" type="checkbox">
                      <span>Language Practice</span>
                    </label>
                    <label class="admin-ai-bots__toggle">
                      <input v-model="form.persona.honey_enabled" type="checkbox">
                      <span>Honey</span>
                    </label>
                  </div>

                  <div class="admin-ai-bots__help">
                    Role is fixed to <code>assistant</code>.
                  </div>
                  <div
                    v-if="isStarterPersona"
                    class="admin-ai-bots__help admin-ai-bots__help--info"
                  >
                    Starter bots are onboarding guides. They can keep Editorial, Counterpoint, and Honey turned off.
                  </div>

                  <div v-if="form.persona.honey_enabled" class="admin-ai-bots__grid">
                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">Honey delay min (ms)</span>
                      <input
                        v-model.number="form.persona.honey_delay_min_ms"
                        type="number"
                        min="0"
                        class="admin-ai-bots__control"
                        :class="{ 'admin-ai-bots__control--error': formErrors.honey_delay_min_ms }"
                      >
                      <span
                        v-if="formErrors.honey_delay_min_ms"
                        class="admin-ai-bots__error"
                      >
                        {{ formErrors.honey_delay_min_ms }}
                      </span>
                    </label>

                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">Honey delay max (ms)</span>
                      <input
                        v-model.number="form.persona.honey_delay_max_ms"
                        type="number"
                        min="0"
                        class="admin-ai-bots__control"
                        :class="{ 'admin-ai-bots__control--error': formErrors.honey_delay_max_ms }"
                      >
                      <span
                        v-if="formErrors.honey_delay_max_ms"
                        class="admin-ai-bots__error"
                      >
                        {{ formErrors.honey_delay_max_ms }}
                      </span>
                    </label>
                  </div>

                  <label class="admin-ai-bots__field">
                    <span class="admin-ai-bots__field-label">Base system prompt</span>
                    <textarea
                      v-model="form.persona.system_prompt_template"
                      rows="5"
                      class="admin-ai-bots__control admin-ai-bots__control--textarea"
                      :class="{ 'admin-ai-bots__control--error': formErrors.system_prompt_template }"
                    ></textarea>
                    <span class="admin-ai-bots__help">
                      Fallback prompt when capability-specific override is empty.
                    </span>
                    <span
                      v-if="formErrors.system_prompt_template"
                      class="admin-ai-bots__error"
                    >
                      {{ formErrors.system_prompt_template }}
                    </span>
                  </label>

                  <label class="admin-ai-bots__field">
                    <span class="admin-ai-bots__field-label">Base response style (optional)</span>
                    <textarea
                      v-model="form.persona.response_style_template"
                      rows="3"
                      class="admin-ai-bots__control admin-ai-bots__control--textarea"
                    ></textarea>
                  </label>

                  <div v-if="enabledCapabilityTabs.length" class="admin-ai-bots__capability-tabs">
                    <div class="admin-ai-bots__tab-list" role="tablist" aria-label="Capability settings">
                      <button
                        v-for="cap in enabledCapabilityTabs"
                        :key="cap.key"
                        type="button"
                        class="admin-ai-bots__tab"
                        :class="{ 'admin-ai-bots__tab--active': selectedCapabilityTab === cap.key }"
                        :aria-selected="selectedCapabilityTab === cap.key"
                        @click="selectedCapabilityTab = cap.key"
                      >
                        {{ cap.label }}
                      </button>
                    </div>

                    <div
                      v-if="selectedCapabilityTab === 'editorial'"
                      class="admin-ai-bots__tab-panel"
                    >
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Editorial prompt override (optional)</span>
                        <textarea
                          v-model="form.persona.editorial_system_prompt_template"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Editorial response style override (optional)</span>
                        <textarea
                          v-model="form.persona.editorial_response_style_template"
                          rows="3"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                    </div>

                    <div
                      v-if="selectedCapabilityTab === 'counterpoint'"
                      class="admin-ai-bots__tab-panel"
                    >
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Counterpoint prompt override (optional)</span>
                        <textarea
                          v-model="form.persona.counterpoint_system_prompt_template"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Counterpoint response style override (optional)</span>
                        <textarea
                          v-model="form.persona.counterpoint_response_style_template"
                          rows="3"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                    </div>

                    <div
                      v-if="selectedCapabilityTab === 'honey'"
                      class="admin-ai-bots__tab-panel"
                    >
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Honey prompt override (optional)</span>
                        <textarea
                          v-model="form.persona.honey_system_prompt_template"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Honey response style override (optional)</span>
                        <textarea
                          v-model="form.persona.honey_response_style_template"
                          rows="3"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>
                    </div>

                    <div
                      v-if="selectedCapabilityTab === 'language_practice'"
                      class="admin-ai-bots__tab-panel"
                    >
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Language practice prompt override (optional)</span>
                        <textarea
                          v-model="languagePracticeForm.system_prompt_template"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                        <span class="admin-ai-bots__help">
                          Used when this persona is in an active language-practice session.
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Language practice response style override (optional)</span>
                        <textarea
                          v-model="languagePracticeForm.response_style_template"
                          rows="3"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                      </label>

                      <div class="admin-ai-bots__grid">
                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Assistant role</span>
                          <select
                            v-model="languagePracticeForm.assistant_role"
                            class="admin-ai-bots__control"
                          >
                            <option
                              v-for="option in languagePracticeRoleOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>

                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Default correction style</span>
                          <select
                            v-model="languagePracticeForm.default_correction_preference"
                            class="admin-ai-bots__control"
                          >
                            <option
                              v-for="option in languagePracticeCorrectionOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>

                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Default exchange mode</span>
                          <select
                            v-model="languagePracticeForm.default_exchange_mode"
                            class="admin-ai-bots__control"
                          >
                            <option
                              v-for="option in languagePracticeExchangeModeOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>

                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Supported target languages</span>
                          <select
                            v-model="languagePracticeForm.supported_target_languages"
                            multiple
                            class="admin-ai-bots__control admin-ai-bots__control--multiselect"
                          >
                            <option
                              v-for="option in languagePracticeLanguageOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>

                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Supported support languages</span>
                          <select
                            v-model="languagePracticeForm.supported_native_languages"
                            multiple
                            class="admin-ai-bots__control admin-ai-bots__control--multiselect"
                          >
                            <option
                              v-for="option in languagePracticeLanguageOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>

                        <label class="admin-ai-bots__field">
                          <span class="admin-ai-bots__field-label">Supported learner levels</span>
                          <select
                            v-model="languagePracticeForm.supported_levels"
                            multiple
                            class="admin-ai-bots__control admin-ai-bots__control--multiselect"
                          >
                            <option
                              v-for="option in languagePracticeLevelOptions"
                              :key="option.value"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <details class="admin-ai-bots__details">
                  <summary class="admin-ai-bots__details-summary">
                    Advanced Persona Settings
                  </summary>

                  <div class="admin-ai-bots__details-body">
                    <div class="admin-ai-bots__grid">
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Mood group (About page grouping)</span>
                        <select v-model="form.persona.mood_group" class="admin-ai-bots__control">
                          <option :value="null">None</option>
                          <option
                            v-for="option in moodGroupOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                        <span class="admin-ai-bots__help">
                          Which mood section this bot appears under on the About page and match UI.
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Category (editorial / article pipeline)</span>
                        <select v-model="form.persona.category_id" class="admin-ai-bots__control">
                          <option :value="null">None</option>
                          <option
                            v-for="option in categoryOptions"
                            :key="option.id"
                            :value="option.id"
                          >
                            {{ option.name }}
                          </option>
                        </select>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Bias / stance</span>
                        <input v-model="form.persona.bias" type="text" class="admin-ai-bots__control">
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Region</span>
                        <input v-model="form.persona.region" type="text" class="admin-ai-bots__control">
                      </label>
                    </div>

                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">Angle / summary</span>
                      <textarea
                        v-model="form.persona.angle"
                        rows="2"
                        class="admin-ai-bots__control admin-ai-bots__control--textarea"
                      ></textarea>
                    </label>

                    <div class="admin-ai-bots__toolbar admin-ai-bots__toolbar--end">
                      <button
                        type="button"
                        class="admin-ai-bots__button admin-ai-bots__button--neutral"
                        :disabled="translatingPersona || !form.persona.angle"
                        @click="translatePersonaFields"
                      >
                        <span
                          v-if="translatingPersona"
                          class="admin-ai-bots__spinner"
                          aria-hidden="true"
                        />
                        <i v-else class="mdi mdi-translate" aria-hidden="true" />
                        Translate angle
                      </button>
                    </div>

                    <div class="admin-ai-bots__grid admin-ai-bots__grid--metrics">
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Language code</span>
                        <input
                          v-model="form.persona.language_code"
                          type="text"
                          class="admin-ai-bots__control"
                        >
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Temperature</span>
                        <input
                          v-model.number="form.persona.temperature"
                          type="number"
                          step="0.1"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.temperature }"
                        >
                        <span v-if="formErrors.temperature" class="admin-ai-bots__error">
                          {{ formErrors.temperature }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Top P</span>
                        <input
                          v-model.number="form.persona.top_p"
                          type="number"
                          step="0.1"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.top_p }"
                        >
                        <span v-if="formErrors.top_p" class="admin-ai-bots__error">
                          {{ formErrors.top_p }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Presence Penalty</span>
                        <input
                          v-model.number="form.persona.presence_penalty"
                          type="number"
                          step="0.1"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.presence_penalty }"
                        >
                        <span
                          v-if="formErrors.presence_penalty"
                          class="admin-ai-bots__error"
                        >
                          {{ formErrors.presence_penalty }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Frequency Penalty</span>
                        <input
                          v-model.number="form.persona.frequency_penalty"
                          type="number"
                          step="0.1"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.frequency_penalty }"
                        >
                        <span
                          v-if="formErrors.frequency_penalty"
                          class="admin-ai-bots__error"
                        >
                          {{ formErrors.frequency_penalty }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Max tokens</span>
                        <input
                          v-model.number="form.persona.max_response_tokens"
                          type="number"
                          min="1"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.max_response_tokens }"
                        >
                        <span
                          v-if="formErrors.max_response_tokens"
                          class="admin-ai-bots__error"
                        >
                          {{ formErrors.max_response_tokens }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Max history messages</span>
                        <input
                          v-model.number="form.persona.max_history_messages"
                          type="number"
                          min="0"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.max_history_messages }"
                        >
                        <span
                          v-if="formErrors.max_history_messages"
                          class="admin-ai-bots__error"
                        >
                          {{ formErrors.max_history_messages }}
                        </span>
                      </label>
                    </div>
                  </div>
                </details>

                <details class="admin-ai-bots__details">
                  <summary class="admin-ai-bots__details-summary">
                    Moltbook Posting
                  </summary>

                  <div class="admin-ai-bots__details-body">
                    <label class="admin-ai-bots__toggle">
                      <input v-model="moltbookForm.enabled" type="checkbox">
                      <span>Enable Moltbook posting</span>
                    </label>

                    <div class="admin-ai-bots__help">
                      Agent API keys stay server-side in
                      <code>MOLTBOOK_AGENT_KEYS_JSON</code>. Match by agent name or persona key.
                    </div>

                    <div class="admin-ai-bots__grid">
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Credential key / agent name</span>
                        <input
                          v-model="moltbookForm.agent_name"
                          type="text"
                          class="admin-ai-bots__control"
                        >
                        <span class="admin-ai-bots__help">
                          Optional override. If blank, the persona key is used to find the API key in MOLTBOOK_AGENT_KEYS_JSON.
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Default submolt</span>
                        <input
                          v-model="moltbookForm.default_submolt"
                          type="text"
                          class="admin-ai-bots__control"
                        >
                        <span class="admin-ai-bots__help">
                          Used as the default target when posting from admin.
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Daily post limit</span>
                        <input
                          v-model.number="moltbookForm.daily_posts"
                          type="number"
                          min="0"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.daily_posts }"
                        >
                        <span class="admin-ai-bots__help">
                          0 disables admin posting for that day entirely.
                        </span>
                        <span v-if="formErrors.daily_posts" class="admin-ai-bots__error">
                          {{ formErrors.daily_posts }}
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Cooldown between posts (minutes)</span>
                        <input
                          v-model.number="moltbookForm.cooldown_minutes"
                          type="number"
                          min="0"
                          class="admin-ai-bots__control"
                          :class="{ 'admin-ai-bots__control--error': formErrors.cooldown_minutes }"
                        >
                        <span
                          v-if="formErrors.cooldown_minutes"
                          class="admin-ai-bots__error"
                        >
                          {{ formErrors.cooldown_minutes }}
                        </span>
                      </label>
                    </div>

                    <div class="admin-ai-bots__subsection-title">Honey Autopost Voice</div>

                    <label class="admin-ai-bots__toggle">
                      <input v-model="moltbookForm.honey_posting_enabled" type="checkbox">
                      <span>Enable autonomous honey Moltbook posts</span>
                    </label>

                    <div class="admin-ai-bots__help">
                      When enabled, this honey bot can generate short emotional question posts ending with a soft invitation to talk.
                    </div>

                    <label class="admin-ai-bots__field">
                      <span class="admin-ai-bots__field-label">Bot-specific posting prompt</span>
                      <textarea
                        v-model="moltbookForm.honey_prompt_template"
                        rows="4"
                        class="admin-ai-bots__control admin-ai-bots__control--textarea"
                      ></textarea>
                      <span class="admin-ai-bots__help">
                        Describe this bot's unique Moltbook voice, angle, and what emotional territory it should explore.
                      </span>
                    </label>

                    <div class="admin-ai-bots__grid">
                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">Emotional themes</span>
                        <textarea
                          v-model="honeyEmotionalThemesText"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                        <span class="admin-ai-bots__help">
                          One item per line. Examples: mixed signals, lonely nights, wanting reassurance.
                        </span>
                      </label>

                      <label class="admin-ai-bots__field">
                        <span class="admin-ai-bots__field-label">CTA variants</span>
                        <textarea
                          v-model="honeyCtaVariantsText"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                        ></textarea>
                        <span class="admin-ai-bots__help">
                          One item per line. Short ending questions the post can close with.
                        </span>
                      </label>
                    </div>

                    <div
                      v-if="editingId"
                      class="admin-ai-bots__info-panel admin-ai-bots__info-panel--info"
                    >
                      {{ moltbookEditSummary }}
                    </div>
                  </div>
                </details>

                <details class="admin-ai-bots__details">
                  <summary class="admin-ai-bots__details-summary">
                    Advanced JSON Fields
                  </summary>

                  <div class="admin-ai-bots__details-body">
                    <div class="admin-ai-bots__grid">
                      <label
                        v-for="field in jsonFieldList"
                        :key="field.key"
                        class="admin-ai-bots__field"
                      >
                        <span class="admin-ai-bots__field-label">{{ field.label }}</span>
                        <textarea
                          v-model="jsonInputs[field.key]"
                          rows="4"
                          class="admin-ai-bots__control admin-ai-bots__control--textarea"
                          :class="{ 'admin-ai-bots__control--error': jsonErrors[field.key] }"
                        ></textarea>
                        <span class="admin-ai-bots__help">{{ field.hint }}</span>
                        <span v-if="jsonErrors[field.key]" class="admin-ai-bots__error">
                          {{ jsonErrors[field.key] }}
                        </span>
                      </label>
                    </div>
                  </div>
                </details>
              </div>

              <div class="admin-ai-bots__modal-actions">
                <button
                  type="button"
                  class="admin-ai-bots__button"
                  :disabled="saving"
                  @click="closeDialog"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="admin-ai-bots__button admin-ai-bots__button--primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="admin-ai-bots__spinner" aria-hidden="true" />
                  {{ editingId ? "Save Changes" : "Create Bot" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="admin-ai-bots-modal-fade">
        <div
          v-if="deleteDialog"
          class="admin-ai-bots__modal-layer"
          role="presentation"
        >
          <button
            type="button"
            class="admin-ai-bots__modal-backdrop"
            aria-label="Close delete dialog"
            :disabled="deleting"
            @click="deleteDialog = false"
          />

          <div
            class="admin-ai-bots__modal admin-ai-bots__modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ai-bots-delete-title"
          >
            <div class="admin-ai-bots__modal-card">
              <div class="admin-ai-bots__modal-header">
                <h2 id="admin-ai-bots-delete-title" class="admin-ai-bots__modal-title">
                  Delete AI bot
                </h2>
              </div>

              <div class="admin-ai-bots__modal-body">
                Are you sure you want to delete
                <strong>{{ deleteTarget?.profile?.displayname }}</strong>?
                This removes the AI persona behavior only. The profile/user remains.
              </div>

              <div class="admin-ai-bots__modal-actions">
                <button
                  type="button"
                  class="admin-ai-bots__button"
                  :disabled="deleting"
                  @click="deleteDialog = false"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="admin-ai-bots__button admin-ai-bots__button--danger"
                  :disabled="deleting"
                  @click="confirmDelete"
                >
                  <span v-if="deleting" class="admin-ai-bots__spinner" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="admin-ai-bots-modal-fade">
        <div
          v-if="postDialog"
          class="admin-ai-bots__modal-layer"
          role="presentation"
        >
          <button
            type="button"
            class="admin-ai-bots__modal-backdrop"
            aria-label="Close Moltbook dialog"
            :disabled="posting"
            @click="postDialog = false"
          />

          <div
            class="admin-ai-bots__modal admin-ai-bots__modal--medium"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ai-bots-post-title"
          >
            <form class="admin-ai-bots__modal-card" @submit.prevent="submitMoltbookPost">
              <div class="admin-ai-bots__modal-header">
                <div>
                  <h2 id="admin-ai-bots-post-title" class="admin-ai-bots__modal-title">
                    Post To Moltbook
                  </h2>
                </div>
                <button
                  type="button"
                  class="admin-ai-bots__icon-button admin-ai-bots__icon-button--neutral"
                  :disabled="posting"
                  aria-label="Close Moltbook dialog"
                  @click="postDialog = false"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </div>

              <div class="admin-ai-bots__modal-body">
                <div
                  v-if="postTarget"
                  class="admin-ai-bots__info-panel admin-ai-bots__info-panel--info"
                >
                  Posting as
                  <strong>{{ postTarget.profile?.displayname || postTarget.persona_key }}</strong>
                  using key
                  <code>{{ postTarget.moltbook?.credential_key_label || postTarget.persona_key }}</code>.
                </div>

                <div
                  v-if="postTarget?.moltbook?.honey_posting?.enabled"
                  class="admin-ai-bots__info-panel admin-ai-bots__info-panel--info"
                >
                  This bot has honey autoposting enabled. Use Generate Honey Preview to draft a unique emotional post in its voice.
                </div>

                <div class="admin-ai-bots__grid">
                  <label class="admin-ai-bots__field">
                    <span class="admin-ai-bots__field-label">Submolt</span>
                    <input
                      v-model="postForm.submolt_name"
                      type="text"
                      class="admin-ai-bots__control"
                      :class="{ 'admin-ai-bots__control--error': postErrors.submolt_name }"
                    >
                    <span v-if="postErrors.submolt_name" class="admin-ai-bots__error">
                      {{ postErrors.submolt_name }}
                    </span>
                  </label>

                  <label class="admin-ai-bots__field">
                    <span class="admin-ai-bots__field-label">Post type</span>
                    <select v-model="postForm.type" class="admin-ai-bots__control">
                      <option
                        v-for="option in postTypeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>

                  <label class="admin-ai-bots__field admin-ai-bots__field--full">
                    <span class="admin-ai-bots__field-label">Title</span>
                    <input
                      v-model="postForm.title"
                      type="text"
                      maxlength="300"
                      class="admin-ai-bots__control"
                      :class="{ 'admin-ai-bots__control--error': postErrors.title }"
                    >
                    <span v-if="postErrors.title" class="admin-ai-bots__error">
                      {{ postErrors.title }}
                    </span>
                  </label>

                  <label
                    v-if="postForm.type === 'link'"
                    class="admin-ai-bots__field admin-ai-bots__field--full"
                  >
                    <span class="admin-ai-bots__field-label">Link URL</span>
                    <input
                      v-model="postForm.url"
                      type="url"
                      class="admin-ai-bots__control"
                      :class="{ 'admin-ai-bots__control--error': postErrors.url }"
                    >
                    <span v-if="postErrors.url" class="admin-ai-bots__error">
                      {{ postErrors.url }}
                    </span>
                  </label>

                  <label class="admin-ai-bots__field admin-ai-bots__field--full">
                    <span class="admin-ai-bots__field-label">Content</span>
                    <textarea
                      v-model="postForm.content"
                      rows="6"
                      class="admin-ai-bots__control admin-ai-bots__control--textarea"
                    ></textarea>
                    <span class="admin-ai-bots__help">
                      {{ postForm.type === "link" ? "Optional body for a link post." : "Body text for the Moltbook post." }}
                    </span>
                  </label>
                </div>
              </div>

              <div class="admin-ai-bots__modal-actions">
                <button
                  v-if="postTarget?.moltbook?.honey_posting?.enabled"
                  type="button"
                  class="admin-ai-bots__button admin-ai-bots__button--accent"
                  :disabled="previewingPost"
                  @click="generateHoneyPreview"
                >
                  <span
                    v-if="previewingPost"
                    class="admin-ai-bots__spinner"
                    aria-hidden="true"
                  />
                  Generate Honey Preview
                </button>
                <div class="admin-ai-bots__toolbar-spacer" />
                <button
                  type="button"
                  class="admin-ai-bots__button"
                  :disabled="posting"
                  @click="postDialog = false"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="admin-ai-bots__button admin-ai-bots__button--info"
                  :disabled="posting"
                >
                  <span v-if="posting" class="admin-ai-bots__spinner" aria-hidden="true" />
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div
        class="admin-ai-bots__toast-stack"
        aria-live="polite"
        aria-atomic="true"
      >
        <Transition name="admin-ai-bots-toast-fade">
          <div
            v-if="snackbar.show"
            class="admin-ai-bots__toast"
            :class="toastToneClass(snackbar.color)"
            role="status"
          >
            <span>{{ snackbar.message }}</span>
            <button
              type="button"
              class="admin-ai-bots__toast-close"
              aria-label="Dismiss notification"
              @click="snackbar.show = false"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { useAdminAiBots } from "@/composables/useAdminAiBots";
import {
  buildLanguagePracticePersonaMetadata,
  getLanguagePracticePersonaDiagnostics,
  getLanguagePracticePersonaConfig,
  isLanguagePracticePersonaEnabled,
  LANGUAGE_PRACTICE_PERSONA_OPTIONS,
} from "@/utils/languagePracticePersona";

const {
  listBots,
  createBot,
  updateBot,
  deleteBot,
  postToMoltbook,
  generateMoltbookDraft,
  runHoneyMoltbook,
  runLinkedAgentsDailyProfile,
} = useAdminAiBots();
const { getAllCategories, getAdminProfiles } = useDb();
const localPath = useLocalePath();

const loading = ref(true);
const loadingList = ref(false);
const loadError = ref("");
const bots = ref([]);
const profiles = ref([]);
const search = ref("");
const capabilityFilter = ref("all");
const categories = ref([]);
const dialog = ref(false);
const deleteDialog = ref(false);
const postDialog = ref(false);
const deleteTarget = ref(null);
const postTarget = ref(null);
const editingId = ref(null);
const saving = ref(false);
const deleting = ref(false);
const posting = ref(false);
const previewingPost = ref(false);
const runningHoneyMoltbook = ref(false);
const runningLinkedAgents = ref(false);
const translatingPersona = ref(false);
const personaKeyTouched = ref(false);

const DEFAULT_MODERATION_CONFIG = {
  enabled: false,
  blocked_terms: [],
  toxicity_threshold: 0.85,
  spam_threshold: 0.9,
  actions: {
    on_severe_toxicity: "delete",
    on_toxicity: "warn",
    on_spam: "mute",
    on_profanity: "soft_warn",
    fallback: "allow",
  },
  escalate_to_user_id: null,
};

const jsonFieldList = [
  { key: "parameters", label: "Extra parameters", hint: "Sent to OpenAI as-is" },
  { key: "metadata", label: "Metadata", hint: "Free-form object for internal use" },
  { key: "dynamic_fields", label: "Dynamic fields", hint: "Array of template fields" },
  { key: "moderation_config", label: "Moderation config", hint: "Rules to auto moderate replies" },
];

const form = reactive({
  persona: {
    profile_user_id: "",
    persona_key: "",
    role: "assistant",
    is_active: true,
    list_publicly: true,
    editorial_enabled: true,
    counterpoint_enabled: true,
    honey_enabled: false,
    honey_delay_min_ms: 1000,
    honey_delay_max_ms: 10000,
    bias: "",
    angle: "",
    region: "",
    language_code: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    max_response_tokens: 600,
    max_history_messages: 10,
    mood_group: null,
    category_id: null,
    system_prompt_template: "",
    response_style_template: "",
    editorial_system_prompt_template: "",
    editorial_response_style_template: "",
    counterpoint_system_prompt_template: "",
    counterpoint_response_style_template: "",
    honey_system_prompt_template: "",
    honey_response_style_template: "",
  },
});

const moltbookForm = reactive({
  enabled: false,
  agent_name: "",
  default_submolt: "",
  daily_posts: 3,
  cooldown_minutes: 30,
  honey_posting_enabled: false,
  honey_prompt_template: "",
  honey_emotional_themes: [],
  honey_cta_variants: [],
});

const languagePracticeForm = reactive({
  enabled: false,
  assistant_role: "conversation_partner",
  supported_target_languages: [],
  supported_native_languages: [],
  supported_levels: [],
  default_correction_preference: "light_corrections",
  default_exchange_mode: "practice_only",
  system_prompt_template: "",
  response_style_template: "",
});

const jsonInputs = reactive({
  parameters: "{}",
  metadata: "{}",
  dynamic_fields: "[]",
  moderation_config: JSON.stringify(DEFAULT_MODERATION_CONFIG, null, 2),
});

const jsonErrors = reactive({
  parameters: "",
  metadata: "",
  dynamic_fields: "",
  moderation_config: "",
});

const formErrors = reactive({
  profile_user_id: "",
  persona_key: "",
  model: "",
  system_prompt_template: "",
  honey_delay_min_ms: "",
  honey_delay_max_ms: "",
  temperature: "",
  top_p: "",
  presence_penalty: "",
  frequency_penalty: "",
  max_response_tokens: "",
  max_history_messages: "",
  daily_posts: "",
  cooldown_minutes: "",
});

const postErrors = reactive({
  submolt_name: "",
  title: "",
  url: "",
});

const snackbar = reactive({
  show: false,
  message: "",
  color: "primary",
});
const linkedAgentsRunNotice = ref(null);

const postForm = reactive({
  submolt_name: "",
  title: "",
  content: "",
  url: "",
  type: "text",
});

const categoryOptions = computed(() => categories.value || []);

const moodGroupOptions = [
  { label: "Feeling Bored", value: "bored" },
  { label: "Can't Sleep", value: "cant-sleep" },
  { label: "Need Some Advice", value: "want-advice" },
  { label: "Up for Light Chat", value: "light-chat" },
  { label: "Feeling Lonely", value: "lonely" },
  { label: "Sad or Processing", value: "sad" },
  { label: "Calm & Reflective", value: "calm" },
  { label: "Restless & Curious", value: "curious" },
];
const postTypeOptions = [
  { label: "Text", value: "text" },
  { label: "Link", value: "link" },
  { label: "Image", value: "image" },
];
const languagePracticeRoleOptions =
  LANGUAGE_PRACTICE_PERSONA_OPTIONS.assistantRoles.map((value) => ({
    label: value.replace(/_/g, " "),
    value,
  }));
const languagePracticeLanguageOptions =
  LANGUAGE_PRACTICE_PERSONA_OPTIONS.languageCodes.map((value) => ({
    label: value.toUpperCase(),
    value,
  }));
const languagePracticeLevelOptions =
  LANGUAGE_PRACTICE_PERSONA_OPTIONS.targetLevels.map((value) => ({
    label: value.toUpperCase(),
    value,
  }));
const languagePracticeCorrectionOptions =
  LANGUAGE_PRACTICE_PERSONA_OPTIONS.correctionPreferences.map((value) => ({
    label: value.replace(/_/g, " "),
    value,
  }));
const languagePracticeExchangeModeOptions =
  LANGUAGE_PRACTICE_PERSONA_OPTIONS.exchangeModes.map((value) => ({
    label: value.replace(/_/g, " "),
    value,
  }));
const selectedCapabilityTab = ref("honey");

const enabledCapabilityTabs = computed(() => {
  const tabs = [];
  if (form.persona.honey_enabled) tabs.push({ key: "honey", label: "Honey" });
  if (form.persona.counterpoint_enabled) {
    tabs.push({ key: "counterpoint", label: "Counterpoint" });
  }
  if (form.persona.editorial_enabled) {
    tabs.push({ key: "editorial", label: "Editorial" });
  }
  if (languagePracticeForm.enabled) {
    tabs.push({ key: "language_practice", label: "Language Practice" });
  }
  return tabs;
});
const personaKeyByProfileUserId = computed(() => {
  const map = new Map();
  for (const bot of bots.value || []) {
    const userId = String(bot?.profile_user_id || bot?.profile?.user_id || "");
    if (!userId) continue;
    map.set(userId, bot?.persona_key || bot?.id || "existing bot");
  }
  return map;
});
const profileOptions = computed(() =>
  (profiles.value || [])
    .map((profile) => {
      const aiPersonaKey =
        profile.ai_persona_key ||
        personaKeyByProfileUserId.value.get(String(profile.user_id)) ||
        null;
      return {
        ...profile,
        ai_persona_key: aiPersonaKey,
        label:
          `${profile.displayname || "Unnamed"} (${profile.slug || profile.user_id})` +
          (aiPersonaKey ? ` · in use: ${aiPersonaKey}` : ""),
      };
    })
    .sort((a, b) => (a.displayname || "").localeCompare(b.displayname || ""))
);
const selectedProfile = computed(() =>
  profileOptions.value.find(
    (profile) => profile.user_id === form.persona.profile_user_id
  )
);
const selectedProfileLinkedPersonaKey = computed(() => {
  const profile = selectedProfile.value;
  if (!profile?.user_id) return "";
  return (
    profile.ai_persona_key ||
    personaKeyByProfileUserId.value.get(String(profile.user_id)) ||
    ""
  );
});
const isStarterPersona = computed(() =>
  String(form.persona.persona_key || "")
    .trim()
    .toLowerCase()
    .startsWith("starter-")
);
const editingBot = computed(() =>
  bots.value.find((bot) => bot.id === editingId.value) || null
);
const moltbookEditSummary = computed(() => {
  const config = editingBot.value?.moltbook || {};
  const usage = config.usage || {};
  return `Credential configured: ${
    config.credential_configured ? "yes" : "no"
  } · Posts today: ${usage.posts_today || 0} · Last post: ${
    usage.last_post_at ? formatTimestamp(usage.last_post_at) : "never"
  } · Honey autopost: ${config.honey_posting?.enabled ? "on" : "off"}`;
});

const filteredBots = computed(() => {
  const q = search.value.trim().toLowerCase();
  const filteredByCapability = bots.value.filter((bot) => {
    if (capabilityFilter.value === "honey") return !!bot.honey_enabled;
    if (capabilityFilter.value === "editorial") return !!bot.editorial_enabled;
    if (capabilityFilter.value === "counterpoint")
      return !!bot.counterpoint_enabled;
    if (capabilityFilter.value === "language_practice") {
      return hasLanguagePracticeConfig(bot);
    }
    return true;
  });

  if (!q) return filteredByCapability;
  return filteredByCapability.filter((bot) => {
    const profile = bot.profile || {};
    return (
      profile.displayname?.toLowerCase().includes(q) ||
      profile.slug?.toLowerCase().includes(q) ||
      profile.user_id?.toLowerCase().includes(q) ||
      bot.persona_key?.toLowerCase().includes(q) ||
      bot.model?.toLowerCase().includes(q)
    );
  });
});

const activeFilterNotice = computed(() => {
  if (capabilityFilter.value === "all") return "";
  const hiddenCount = bots.value.length - filteredBots.value.length;
  if (hiddenCount <= 0) return "";
  const selected = capabilityFilterOptions.find(
    (item) => item.value === capabilityFilter.value
  );
  const label = selected?.label || "selected capability";
  return `${hiddenCount} bot${hiddenCount === 1 ? "" : "s"} hidden by the ${label} filter.`;
});

const emptyBotsMessage = computed(() => {
  if (search.value?.trim()) return `No bots match "${search.value.trim()}".`;
  if (capabilityFilter.value !== "all") {
    const selected = capabilityFilterOptions.find(
      (item) => item.value === capabilityFilter.value
    );
    return `No bots match the ${selected?.label || "selected"} filter.`;
  }
  return "No AI bots yet.";
});
const capabilityFilterOptions = [
  { label: "All capabilities", value: "all" },
  { label: "Language Practice", value: "language_practice" },
  { label: "Honey", value: "honey" },
  { label: "Editorial", value: "editorial" },
  { label: "Counterpoint", value: "counterpoint" },
];

const hasLanguagePracticeCapability = (bot) =>
  getLanguagePracticePersonaDiagnostics(bot).ready;

const hasLanguagePracticeConfig = (bot) =>
  isLanguagePracticePersonaEnabled(bot) ||
  getLanguagePracticePersonaDiagnostics(bot).config.enabled;

const languagePracticeDiagnosticText = (bot) => {
  const diagnostics = getLanguagePracticePersonaDiagnostics(bot);
  if (diagnostics.ready) return "Language practice is ready";
  return diagnostics.issues.join("; ") || "Language practice is not configured";
};

const requiredRule = (value) =>
  (!!String(value ?? "").trim() && value !== null && value !== undefined) ||
  "This field is required";

const slugRule = (value) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || "")) ||
  "Use lowercase letters, numbers, and dashes";

const makeRangeRule = (min, max, allowEmpty = false) => (value) => {
  if (allowEmpty && (value === null || value === "" || value === undefined)) {
    return true;
  }
  if (value === null || value === "" || value === undefined) return "Required";
  const num = Number(value);
  if (Number.isNaN(num)) return "Enter a number";
  if (num < min || num > max) {
    return `Value must be between ${min} and ${max}`;
  }
  return true;
};

const minRule = (min) => (value) => {
  if (value === null || value === "" || value === undefined) return "Required";
  const num = Number(value);
  if (Number.isNaN(num)) return "Enter a number";
  if (num < min) return `Value must be at least ${min}`;
  return true;
};

const clearErrors = (target) => {
  Object.keys(target).forEach((key) => {
    target[key] = "";
  });
};

const firstRuleError = (rules, value) => {
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) return result;
  }
  return "";
};

const normalizeStringList = (value) =>
  String(value || "")
    .split(/\n|,/)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const honeyEmotionalThemesText = computed({
  get: () => moltbookForm.honey_emotional_themes.join("\n"),
  set: (value) => {
    moltbookForm.honey_emotional_themes = normalizeStringList(value);
  },
});

const honeyCtaVariantsText = computed({
  get: () => moltbookForm.honey_cta_variants.join("\n"),
  set: (value) => {
    moltbookForm.honey_cta_variants = normalizeStringList(value);
  },
});

const validateMainForm = () => {
  clearErrors(formErrors);

  formErrors.profile_user_id = firstRuleError(
    [requiredRule],
    form.persona.profile_user_id
  );
  formErrors.persona_key = firstRuleError(
    [requiredRule, slugRule],
    form.persona.persona_key
  );
  formErrors.model = firstRuleError([requiredRule], form.persona.model);
  formErrors.system_prompt_template = firstRuleError(
    [requiredRule],
    form.persona.system_prompt_template
  );
  formErrors.temperature = firstRuleError(
    [makeRangeRule(0, 2)],
    form.persona.temperature
  );
  formErrors.top_p = firstRuleError([makeRangeRule(0.01, 1)], form.persona.top_p);
  formErrors.presence_penalty = firstRuleError(
    [makeRangeRule(-2, 2, true)],
    form.persona.presence_penalty
  );
  formErrors.frequency_penalty = firstRuleError(
    [makeRangeRule(-2, 2, true)],
    form.persona.frequency_penalty
  );
  formErrors.max_response_tokens = firstRuleError(
    [minRule(1)],
    form.persona.max_response_tokens
  );
  formErrors.max_history_messages = firstRuleError(
    [minRule(0)],
    form.persona.max_history_messages
  );
  formErrors.daily_posts = firstRuleError([minRule(0)], moltbookForm.daily_posts);
  formErrors.cooldown_minutes = firstRuleError(
    [minRule(0)],
    moltbookForm.cooldown_minutes
  );

  if (form.persona.honey_enabled) {
    formErrors.honey_delay_min_ms = firstRuleError(
      [minRule(0)],
      form.persona.honey_delay_min_ms
    );
    formErrors.honey_delay_max_ms = firstRuleError(
      [minRule(0)],
      form.persona.honey_delay_max_ms
    );
  }

  return !Object.values(formErrors).some(Boolean);
};

const validatePostForm = () => {
  clearErrors(postErrors);
  postErrors.submolt_name = firstRuleError([requiredRule], postForm.submolt_name);
  postErrors.title = firstRuleError([requiredRule], postForm.title);
  if (postForm.type === "link") {
    postErrors.url = firstRuleError([requiredRule], postForm.url);
  }
  return !Object.values(postErrors).some(Boolean);
};

const slugifyLocal = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

watch(
  () => form.persona.profile_user_id,
  (value) => {
    if (editingId.value || !value || personaKeyTouched.value) return;
    const profile = profileOptions.value.find((item) => item.user_id === value);
    if (!profile) return;
    form.persona.persona_key = slugifyLocal(profile.slug || profile.displayname);
  }
);

watch(
  enabledCapabilityTabs,
  (tabs) => {
    const current = selectedCapabilityTab.value;
    if (!tabs.length) {
      selectedCapabilityTab.value = "honey";
      return;
    }
    if (!tabs.some((tab) => tab.key === current)) {
      selectedCapabilityTab.value = tabs[0].key;
    }
  },
  { immediate: true }
);

const formatTimestamp = (value) => {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const angleTranslatedLocales = (bot) => {
  const translations = bot?.profile?.profile_translations || [];
  return translations
    .filter((t) => t?.angle && String(t.angle).trim())
    .map((t) => String(t.locale || "").trim().toLowerCase().split("-")[0])
    .filter(Boolean);
};

const truncate = (text, len = 100) => {
  if (!text) return "-";
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= len) return normalized;
  return `${normalized.slice(0, len)}…`;
};

const moltbookStatusColor = (bot) => {
  if (!bot?.moltbook?.enabled) return "grey";
  return bot?.moltbook?.credential_configured ? "indigo" : "amber";
};

const moltbookUsageLabel = (bot) => {
  const config = bot?.moltbook || {};
  const limits = config.limits || {};
  const usage = config.usage || {};
  const credentialLabel = config.credential_configured
    ? `key ${config.credential_key_label || bot.persona_key}`
    : "no key";
  return `${credentialLabel} · ${usage.posts_today || 0}/${limits.daily_posts ?? 0} posts today`;
};

const canPostToMoltbook = (bot) =>
  Boolean(bot?.moltbook?.enabled && bot?.moltbook?.credential_configured);

const resolveUiTone = (value) => {
  const tone = String(value || "").trim().toLowerCase();
  if (["red", "error", "danger"].includes(tone)) return "danger";
  if (["success", "teal"].includes(tone)) return "success";
  if (["amber", "amber-darken-2", "deep-orange", "warning"].includes(tone)) {
    return "warning";
  }
  if (tone === "pink") return "accent";
  if (["indigo", "info"].includes(tone)) return "info";
  if (["grey", "gray", "neutral"].includes(tone)) return "neutral";
  return "primary";
};

const bannerToneClass = (value) => `admin-ai-bots__banner--${resolveUiTone(value)}`;
const toastToneClass = (value) => `admin-ai-bots__toast--${resolveUiTone(value)}`;
const pillToneClass = (value) => `admin-ai-bots__pill--${resolveUiTone(value)}`;

const resetForm = () => {
  Object.assign(form.persona, {
    profile_user_id: "",
    persona_key: "",
    role: "assistant",
    is_active: true,
    list_publicly: true,
    editorial_enabled: true,
    counterpoint_enabled: true,
    honey_enabled: false,
    honey_delay_min_ms: 1000,
    honey_delay_max_ms: 10000,
    bias: "",
    angle: "",
    region: "",
    language_code: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    max_response_tokens: 600,
    max_history_messages: 10,
    mood_group: null,
    category_id: null,
    system_prompt_template: "",
    response_style_template: "",
    editorial_system_prompt_template: "",
    editorial_response_style_template: "",
    counterpoint_system_prompt_template: "",
    counterpoint_response_style_template: "",
    honey_system_prompt_template: "",
    honey_response_style_template: "",
  });
  jsonInputs.parameters = "{}";
  jsonInputs.metadata = "{}";
  jsonInputs.dynamic_fields = "[]";
  jsonInputs.moderation_config = JSON.stringify(DEFAULT_MODERATION_CONFIG, null, 2);
  Object.assign(moltbookForm, {
    enabled: false,
    agent_name: "",
    default_submolt: "",
    daily_posts: 3,
    cooldown_minutes: 30,
    honey_posting_enabled: false,
    honey_prompt_template: "",
    honey_emotional_themes: [],
    honey_cta_variants: [],
  });
  Object.assign(languagePracticeForm, {
    enabled: false,
    assistant_role: "conversation_partner",
    supported_target_languages: [],
    supported_native_languages: [],
    supported_levels: [],
    default_correction_preference: "light_corrections",
    default_exchange_mode: "practice_only",
    system_prompt_template: "",
    response_style_template: "",
  });
  clearErrors(jsonErrors);
  clearErrors(formErrors);
  clearErrors(postErrors);
  personaKeyTouched.value = false;
};

const avatarInitial = (bot) => {
  const source =
    bot?.profile?.displayname || bot?.persona_key || bot?.profile?.slug || "?";
  return source.charAt(0).toUpperCase();
};

const profileEditLink = (bot) => {
  if (!bot?.profile_user_id) return null;
  return localPath(`/admin/profiles/${bot.profile_user_id}`);
};

const formatJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
};

const populateForm = (bot) => {
  Object.assign(form.persona, {
    profile_user_id: bot.profile_user_id || bot.profile?.user_id || "",
    persona_key: bot.persona_key || "",
    role: "assistant",
    is_active: bot.is_active ?? true,
    list_publicly: bot.list_publicly ?? true,
    editorial_enabled: bot.editorial_enabled ?? true,
    counterpoint_enabled: bot.counterpoint_enabled ?? true,
    honey_enabled: bot.honey_enabled ?? false,
    honey_delay_min_ms: bot.honey_delay_min_ms ?? 1000,
    honey_delay_max_ms: bot.honey_delay_max_ms ?? 10000,
    bias: bot.bias || "",
    angle: bot.angle || "",
    region: bot.region || "",
    language_code: bot.language_code || "",
    model: bot.model || "gpt-4o-mini",
    temperature: bot.temperature ?? 0.7,
    top_p: bot.top_p ?? 1,
    presence_penalty: bot.presence_penalty ?? 0,
    frequency_penalty: bot.frequency_penalty ?? 0,
    max_response_tokens: bot.max_response_tokens ?? 600,
    max_history_messages: bot.max_history_messages ?? 10,
    category_id: bot.category_id ?? bot.category?.id ?? null,
    mood_group: bot.mood_group ?? null,
    system_prompt_template: bot.system_prompt_template || "",
    response_style_template: bot.response_style_template || "",
    editorial_system_prompt_template: bot.editorial_system_prompt_template || "",
    editorial_response_style_template: bot.editorial_response_style_template || "",
    counterpoint_system_prompt_template:
      bot.counterpoint_system_prompt_template || "",
    counterpoint_response_style_template:
      bot.counterpoint_response_style_template || "",
    honey_system_prompt_template: bot.honey_system_prompt_template || "",
    honey_response_style_template: bot.honey_response_style_template || "",
  });

  jsonInputs.parameters = formatJson(bot.parameters, "{}");
  jsonInputs.metadata = formatJson(bot.metadata, "{}");
  jsonInputs.dynamic_fields = formatJson(bot.dynamic_fields, "[]");
  jsonInputs.moderation_config = formatJson(
    bot.moderation_config,
    JSON.stringify(DEFAULT_MODERATION_CONFIG, null, 2)
  );
  Object.assign(moltbookForm, {
    enabled: bot.moltbook?.enabled ?? false,
    agent_name: bot.moltbook?.agent_name || "",
    default_submolt: bot.moltbook?.default_submolt || "",
    daily_posts: bot.moltbook?.limits?.daily_posts ?? 3,
    cooldown_minutes: bot.moltbook?.limits?.cooldown_minutes ?? 30,
    honey_posting_enabled: bot.moltbook?.honey_posting?.enabled ?? false,
    honey_prompt_template: bot.moltbook?.honey_posting?.prompt_template || "",
    honey_emotional_themes: Array.isArray(bot.moltbook?.honey_posting?.emotional_themes)
      ? [...bot.moltbook.honey_posting.emotional_themes]
      : [],
    honey_cta_variants: Array.isArray(bot.moltbook?.honey_posting?.cta_variants)
      ? [...bot.moltbook.honey_posting.cta_variants]
      : [],
  });
  Object.assign(
    languagePracticeForm,
    getLanguagePracticePersonaConfig(bot.metadata)
  );
  languagePracticeForm.system_prompt_template =
    languagePracticeForm.system_prompt_template || "";
  languagePracticeForm.response_style_template =
    languagePracticeForm.response_style_template || "";
  clearErrors(jsonErrors);
  clearErrors(formErrors);
  clearErrors(postErrors);
};

const parseJsonInputs = () => {
  let invalid = false;
  const result = {};
  Object.keys(jsonInputs).forEach((key) => {
    const raw = jsonInputs[key];
    jsonErrors[key] = "";
    if (!raw || !raw.trim()) {
      result[key] = key === "dynamic_fields" ? [] : {};
      return;
    }
    try {
      result[key] = JSON.parse(raw);
    } catch {
      jsonErrors[key] = "Invalid JSON";
      invalid = true;
    }
  });
  return invalid ? null : result;
};

const loadBots = async () => {
  loadingList.value = true;
  loadError.value = "";
  try {
    const res = await listBots();
    if (res?.success === false) throw new Error(res.error);
    bots.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error("[admin][ai-bots] load error", error);
    loadError.value = error?.data?.error || error?.message || "Failed to load bots";
  } finally {
    loading.value = false;
    loadingList.value = false;
  }
};

const loadLookups = async () => {
  try {
    const [categoryData, profileData] = await Promise.all([
      getAllCategories(),
      getAdminProfiles(null),
    ]);
    categories.value = categoryData || [];
    profiles.value = (profileData?.data || [])
      .filter((profile) => profile?.user_id)
      .map((profile) => ({
        ...profile,
        user_id: String(profile.user_id),
      }));
  } catch (error) {
    console.error("[admin][ai-bots] lookup error", error);
  }
};

const openCreateDialog = () => {
  editingId.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (bot) => {
  editingId.value = bot?.id || null;
  personaKeyTouched.value = true;
  populateForm(bot);
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
};

const openDeleteDialog = (bot) => {
  deleteTarget.value = bot;
  deleteDialog.value = true;
};

const openPostDialog = (bot) => {
  if (!canPostToMoltbook(bot)) {
    snackbar.show = true;
    snackbar.color = "amber-darken-2";
    snackbar.message =
      "This bot needs Moltbook posting enabled and a matching API key in MOLTBOOK_AGENT_KEYS_JSON.";
    return;
  }
  postTarget.value = bot;
  clearErrors(postErrors);
  Object.assign(postForm, {
    submolt_name: bot.moltbook?.default_submolt || "",
    title: "",
    content: "",
    url: "",
    type: "text",
  });
  postDialog.value = true;
};

const translatePersonaFields = async () => {
  const profileUserId = form.persona.profile_user_id;
  const angle = form.persona.angle?.trim() || "";

  if (!profileUserId || !angle) {
    snackbar.show = true;
    snackbar.color = "amber-darken-2";
    snackbar.message = "No angle/summary text to translate.";
    return;
  }

  translatingPersona.value = true;
  try {
    const result = await $fetch("/api/admin/ai-bots/translate", {
      method: "POST",
      body: { profileUserId, angle, sourceLocale: "en" },
    });
    if (result?.ok) {
      snackbar.show = true;
      snackbar.color = "success";
      snackbar.message = `Angle translated to: ${(result.translated || []).join(", ") || "all locales"}.`;
    } else {
      snackbar.show = true;
      snackbar.color = "red";
      snackbar.message = result?.error || "Translation failed.";
    }
  } catch (err) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = err?.data?.error || "Translation request failed.";
  } finally {
    translatingPersona.value = false;
  }
};

const handleSubmit = async () => {
  if (!validateMainForm()) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Fix the highlighted fields before saving.";
    return;
  }

  const jsonPayload = parseJsonInputs();
  if (!jsonPayload) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Fix invalid JSON before saving.";
    return;
  }

  saving.value = true;

  const selected = profileOptions.value.find(
    (profile) => profile.user_id === form.persona.profile_user_id
  );
  if (!selected) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Select a valid profile.";
    saving.value = false;
    return;
  }

  if (
    !editingId.value &&
    selected.ai_persona_key &&
    String(selected.ai_persona_key).trim()
  ) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "This profile already has an AI persona.";
    saving.value = false;
    return;
  }

  const payload = {
    persona: {
      ...form.persona,
      role: "assistant",
      profile_user_id: String(form.persona.profile_user_id),
      persona_key: slugifyLocal(form.persona.persona_key),
      temperature: Number(form.persona.temperature),
      top_p: Number(form.persona.top_p),
      presence_penalty: Number(form.persona.presence_penalty),
      frequency_penalty: Number(form.persona.frequency_penalty),
      max_response_tokens: Number(form.persona.max_response_tokens),
      max_history_messages: Number(form.persona.max_history_messages),
      category_id: form.persona.category_id || null,
      mood_group: form.persona.mood_group || null,
      moltbook_config: {
        enabled: Boolean(moltbookForm.enabled),
        agent_name: String(moltbookForm.agent_name || "").trim() || null,
        default_submolt:
          String(moltbookForm.default_submolt || "").trim() || null,
        limits: {
          daily_posts: Number(moltbookForm.daily_posts),
          cooldown_minutes: Number(moltbookForm.cooldown_minutes),
        },
        honey_posting: {
          enabled: Boolean(moltbookForm.honey_posting_enabled),
          prompt_template:
            String(moltbookForm.honey_prompt_template || "").trim() || null,
          emotional_themes: Array.isArray(moltbookForm.honey_emotional_themes)
            ? moltbookForm.honey_emotional_themes
                .map((item) => String(item || "").trim())
                .filter(Boolean)
            : [],
          cta_variants: Array.isArray(moltbookForm.honey_cta_variants)
            ? moltbookForm.honey_cta_variants
                .map((item) => String(item || "").trim())
                .filter(Boolean)
            : [],
        },
      },
      ...jsonPayload,
    },
  };

  payload.persona.metadata = buildLanguagePracticePersonaMetadata(
    payload.persona.metadata,
    languagePracticeForm
  );

  if (
    payload.persona.honey_delay_max_ms < payload.persona.honey_delay_min_ms
  ) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Honey max delay must be greater than or equal to min delay.";
    saving.value = false;
    return;
  }
  if (
    !isStarterPersona.value &&
    !payload.persona.editorial_enabled &&
    !payload.persona.counterpoint_enabled &&
    !payload.persona.honey_enabled &&
    !languagePracticeForm.enabled
  ) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Enable at least one capability (language practice, editorial, counterpoint, or honey).";
    saving.value = false;
    return;
  }

  try {
    let res;
    if (editingId.value) {
      res = await updateBot(editingId.value, payload);
    } else {
      res = await createBot(payload);
    }

    if (res?.success === false) throw new Error(res.error);

    if (res?.data) {
      const idx = bots.value.findIndex((b) => b.id === res.data.id);
      if (idx >= 0) {
        bots.value[idx] = res.data;
      } else {
        bots.value.unshift(res.data);
      }
    } else {
      await loadBots();
    }

    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = editingId.value
      ? "Bot updated successfully."
      : "Bot created successfully.";

    dialog.value = false;
  } catch (error) {
    console.error("[admin][ai-bots] save error", error);
    const message =
      error?.data?.error || error?.message || "Failed to save bot.";
    await revealExistingPersonaFromError(message);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = message;
  } finally {
    saving.value = false;
  }
};

async function revealExistingPersonaFromError(message = "") {
  const match = String(message).match(/AI persona "([^"]+)"/i);
  const personaKey = match?.[1]?.trim();
  if (!personaKey) return;
  capabilityFilter.value = "all";
  search.value = personaKey;
  await loadBots();
}

const submitMoltbookPost = async () => {
  if (!postTarget.value) return;
  if (!validatePostForm()) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Complete the required Moltbook fields.";
    return;
  }

  posting.value = true;
  try {
    const res = await postToMoltbook(postTarget.value.id, {
      submolt_name: String(postForm.submolt_name || "").trim(),
      title: String(postForm.title || "").trim(),
      content: String(postForm.content || "").trim(),
      url: String(postForm.url || "").trim(),
      type: postForm.type,
    });

    if (res?.success === false) throw new Error(res.error);

    if (res?.data?.persona?.id) {
      const idx = bots.value.findIndex((bot) => bot.id === res.data.persona.id);
      if (idx >= 0) bots.value[idx] = res.data.persona;
    } else {
      await loadBots();
    }

    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = "Moltbook post published.";
    postDialog.value = false;
    postTarget.value = null;
  } catch (error) {
    console.error("[admin][ai-bots] moltbook post error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message =
      error?.data?.error || error?.message || "Failed to publish Moltbook post.";
  } finally {
    posting.value = false;
  }
};

const generateHoneyPreview = async () => {
  if (!postTarget.value?.id) return;
  previewingPost.value = true;
  try {
    const res = await generateMoltbookDraft(postTarget.value.id);
    if (res?.success === false) throw new Error(res.error);
    const draft = res?.data?.draft || {};
    postForm.type = "text";
    postForm.url = "";
    postForm.title = String(draft.title || "").trim();
    postForm.content = String(draft.content || "").trim();
    postForm.submolt_name =
      String(postForm.submolt_name || "").trim() ||
      postTarget.value?.moltbook?.default_submolt ||
      "";

    snackbar.show = true;
    snackbar.color = "pink";
    snackbar.message = "Honey Moltbook preview generated.";
  } catch (error) {
    console.error("[admin][ai-bots] moltbook draft error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message =
      error?.data?.error || error?.message || "Failed to generate honey preview.";
  } finally {
    previewingPost.value = false;
  }
};

const runHoneyMoltbookNow = async () => {
  runningHoneyMoltbook.value = true;
  try {
    const res = await runHoneyMoltbook({ limit: 5 });
    if (res?.success === false) throw new Error(res.error);

    const updatedPersonas = Array.isArray(res?.data?.results)
      ? res.data.results
          .map((item) => item?.persona)
          .filter((item) => item?.id)
      : [];

    updatedPersonas.forEach((persona) => {
      const idx = bots.value.findIndex((bot) => bot.id === persona.id);
      if (idx >= 0) bots.value[idx] = persona;
    });

    const postedCount = Number(res?.data?.posted_count || 0);
    const skippedCount = Number(res?.data?.skipped_count || 0);

    snackbar.show = true;
    snackbar.color = postedCount > 0 ? "indigo" : "amber-darken-2";
    snackbar.message =
      postedCount > 0
        ? `Published ${postedCount} honey Moltbook post${postedCount === 1 ? "" : "s"}${skippedCount ? ` · ${skippedCount} skipped` : ""}.`
        : `No honey Moltbook posts published${skippedCount ? ` · ${skippedCount} skipped` : ""}.`;
  } catch (error) {
    console.error("[admin][ai-bots] moltbook run error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message =
      error?.data?.error || error?.message || "Failed to run honey Moltbook posting.";
  } finally {
    runningHoneyMoltbook.value = false;
  }
};

const runLinkedAgentsDailyProfileNow = async () => {
  runningLinkedAgents.value = true;
  try {
    const res = await runLinkedAgentsDailyProfile({ dry_run: false });
    if (res?.success === false) throw new Error(res.error);

    const status = String(res?.data?.status || "").trim();
    const profileSlug = String(res?.data?.draft?.entry_payload?.profile_slug || "").trim();

    const message =
      status === "posted"
        ? `LinkedAgents daily profile posted${profileSlug ? ` for ${profileSlug}` : ""}.`
        : status === "skipped"
          ? "LinkedAgents daily profile was already posted today."
          : status === "queued"
            ? `LinkedAgents daily profile publish queued${profileSlug ? ` for ${profileSlug}` : ""}.`
            : "LinkedAgents daily profile run completed.";

    linkedAgentsRunNotice.value = {
      type: status === "posted" ? "success" : status === "queued" ? "warning" : "info",
      message,
    };
    snackbar.show = true;
    snackbar.color = status === "posted" ? "teal" : "amber-darken-2";
    snackbar.message = message;
  } catch (error) {
    console.error("[admin][ai-bots] linked agents run error", {
      message: error?.message,
      statusCode: error?.statusCode,
      data: error?.data,
      raw: error,
    });
    const message =
      error?.data?.error ||
      error?.message ||
      "Failed to run LinkedAgents daily profile post.";
    linkedAgentsRunNotice.value = {
      type: "error",
      message,
    };
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = message;
  } finally {
    runningLinkedAgents.value = false;
  }
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    const res = await deleteBot(deleteTarget.value.id);
    if (res?.success === false) throw new Error(res.error);
    bots.value = bots.value.filter((bot) => bot.id !== deleteTarget.value.id);
    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = "Bot deleted.";
    deleteDialog.value = false;
    deleteTarget.value = null;
  } catch (error) {
    console.error("[admin][ai-bots] delete error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.error || error?.message || "Failed to delete bot.";
  } finally {
    deleting.value = false;
  }
};

watch(dialog, (isOpen) => {
  if (!isOpen) {
    editingId.value = null;
    clearErrors(formErrors);
    clearErrors(jsonErrors);
  }
});

watch(postDialog, (isOpen) => {
  if (!isOpen) {
    postTarget.value = null;
    previewingPost.value = false;
    clearErrors(postErrors);
  }
});

let snackbarTimer = null;
watch(
  () => snackbar.show,
  (isOpen) => {
    if (snackbarTimer) {
      clearTimeout(snackbarTimer);
      snackbarTimer = null;
    }
    if (!isOpen) return;
    snackbarTimer = setTimeout(() => {
      snackbar.show = false;
    }, 7000);
  }
);

onBeforeUnmount(() => {
  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }
});

onMounted(async () => {
  await Promise.all([loadBots(), loadLookups()]);
});

// ─── Match Mood Tester ───────────────────────────────────────────────────────

const MOOD_EMOTIONS = ["lonely", "calm", "annoyed", "overwhelmed", "playful", "curious", "hopeful", "sad"];
const MOOD_ENERGY = ["drained", "normal", "wired"];
const MOOD_INTENT_OPTIONS = [
  { label: "Be heard", value: "be_heard" },
  { label: "Listen", value: "listen" },
  { label: "Distract me", value: "distract_me" },
  { label: "Deep talk", value: "deep_talk" },
  { label: "Casual chat", value: "casual_chat" },
  { label: "Meet someone similar", value: "meet_someone_similar" },
];
const MOOD_PRIVACY_OPTIONS = [
  { label: "Private (matching only)", value: "private_matching_only" },
  { label: "Public mood post", value: "public_mood_post" },
];
const MOOD_TIME_HORIZON_OPTIONS = [
  { label: "Right now", value: "right_now" },
  { label: "Today", value: "today" },
  { label: "Generally lately", value: "generally_lately" },
];

const moodForm = reactive({
  botUserId: null,
  emotion: null,
  intent: null,
  energy: null,
  privacy: "private_matching_only",
  timeHorizon: "right_now",
  freeText: "",
});

const settingMood = ref(false);
const clearingMood = ref(false);

const botOptions = computed(() =>
  bots.value
    .filter((bot) => bot.profile_user_id)
    .map((bot) => ({
      user_id: bot.profile_user_id,
      label: `${bot.profile?.displayname || "Unnamed"} (${bot.persona_key})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
);

const submitBotMood = async () => {
  if (!moodForm.botUserId) return;
  settingMood.value = true;
  try {
    await $fetch("/api/admin/bot-mood", {
      method: "POST",
      body: {
        botUserId: moodForm.botUserId,
        emotion: moodForm.emotion || null,
        intent: moodForm.intent || null,
        energy: moodForm.energy || null,
        privacy: moodForm.privacy,
        timeHorizon: moodForm.timeHorizon,
        freeText: moodForm.freeText || null,
      },
    });
    snackbar.show = true;
    snackbar.color = "deep-orange";
    snackbar.message = "Mood state set and match intake created.";
  } catch (error) {
    console.error("[admin][bot-mood] set error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.statusMessage || error?.message || "Failed to set mood.";
  } finally {
    settingMood.value = false;
  }
};

const clearBotMood = async () => {
  if (!moodForm.botUserId) return;
  clearingMood.value = true;
  try {
    await $fetch("/api/admin/bot-mood", {
      method: "POST",
      body: { botUserId: moodForm.botUserId, clear: true },
    });
    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = "Bot mood state cleared.";
  } catch (error) {
    console.error("[admin][bot-mood] clear error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.statusMessage || error?.message || "Failed to clear mood.";
  } finally {
    clearingMood.value = false;
  }
};

const clearingAllIntakes = ref(false);
const clearAllBotIntakes = async () => {
  clearingAllIntakes.value = true;
  try {
    const result = await $fetch("/api/admin/bot-mood", {
      method: "POST",
      body: { clearAll: true },
    });
    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = `Cleared all intakes for ${result?.count ?? 0} bots.`;
  } catch (error) {
    console.error("[admin][bot-mood] clearAll error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.statusMessage || error?.message || "Failed to clear all intakes.";
  } finally {
    clearingAllIntakes.value = false;
  }
};
</script>

<style scoped>
.admin-ai-bots {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-ai-bots__loading {
  margin-bottom: 0;
}

.admin-ai-bots__card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-ai-bots__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-ai-bots__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px 22px;
}

.admin-ai-bots__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.admin-ai-bots__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-ai-bots__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
  line-height: 1.5;
}

.admin-ai-bots__subtitle code,
.admin-ai-bots__help code,
.admin-ai-bots__info-panel code {
  border-radius: 8px;
  background: rgba(var(--color-primary), 0.1);
  padding: 2px 6px;
}

.admin-ai-bots__count-pill,
.admin-ai-bots__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.78);
  background: rgba(var(--color-surface), 0.84);
  color: rgb(var(--color-text));
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: none;
}

.admin-ai-bots__count-pill,
.admin-ai-bots__pill--primary {
  border-color: rgba(var(--color-primary), 0.24);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.admin-ai-bots__pill--info {
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(99, 102, 241, 0.12);
  color: rgb(67, 56, 202);
}

.admin-ai-bots__pill--success {
  border-color: rgba(34, 197, 94, 0.28);
  background: rgba(34, 197, 94, 0.12);
  color: rgb(21, 128, 61);
}

.admin-ai-bots__pill--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: rgb(180, 83, 9);
}

.admin-ai-bots__pill--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-ai-bots__pill--neutral {
  border-color: rgba(var(--color-border), 0.82);
  background: rgba(var(--color-surface), 0.88);
  color: rgba(var(--color-text), 0.72);
}

.admin-ai-bots__pill--accent {
  border-color: rgba(168, 85, 247, 0.28);
  background: rgba(168, 85, 247, 0.12);
  color: rgb(126, 34, 206);
}

.admin-ai-bots__pill--dim {
  opacity: 0.5;
}

.admin-ai-bots__pill--locale {
  text-transform: uppercase;
}

.admin-ai-bots__toolbar,
.admin-ai-bots__actions,
.admin-ai-bots__banner-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-ai-bots__toolbar {
  align-items: center;
}

.admin-ai-bots__toolbar--tester {
  margin-top: 4px;
}

.admin-ai-bots__toolbar--end {
  justify-content: flex-end;
}

.admin-ai-bots__toolbar-spacer {
  flex: 1 1 auto;
}

.admin-ai-bots__button,
.admin-ai-bots__icon-button,
.admin-ai-bots__toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 16px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
}

.admin-ai-bots__icon-button {
  width: 38px;
  min-height: 38px;
  padding: 0;
}

.admin-ai-bots__button:disabled,
.admin-ai-bots__icon-button:disabled,
.admin-ai-bots__toast-close:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.admin-ai-bots__button--primary,
.admin-ai-bots__icon-button--primary {
  border-color: rgba(var(--color-primary), 0.32);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.admin-ai-bots__button--info,
.admin-ai-bots__icon-button--info {
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(99, 102, 241, 0.12);
  color: rgb(67, 56, 202);
}

.admin-ai-bots__button--success {
  border-color: rgba(20, 184, 166, 0.28);
  background: rgba(20, 184, 166, 0.12);
  color: rgb(13, 148, 136);
}

.admin-ai-bots__button--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: rgb(180, 83, 9);
}

.admin-ai-bots__button--danger,
.admin-ai-bots__icon-button--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-ai-bots__button--neutral,
.admin-ai-bots__icon-button--neutral,
.admin-ai-bots__button--ghost {
  color: rgba(var(--color-text), 0.8);
}

.admin-ai-bots__button--accent {
  border-color: rgba(236, 72, 153, 0.28);
  background: rgba(236, 72, 153, 0.12);
  color: rgb(190, 24, 93);
}

.admin-ai-bots__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: admin-ai-bots-spin 0.8s linear infinite;
}

.admin-ai-bots__filters,
.admin-ai-bots__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.admin-ai-bots__grid--tester {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.admin-ai-bots__grid--metrics {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.admin-ai-bots__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.admin-ai-bots__field--search {
  grid-column: span 2;
}

.admin-ai-bots__field--compact {
  max-width: 260px;
}

.admin-ai-bots__field--full {
  grid-column: span 2;
}

.admin-ai-bots__field-label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-ai-bots__input-wrap {
  position: relative;
}

.admin-ai-bots__input-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: rgba(var(--color-text), 0.52);
  font-size: 1rem;
}

.admin-ai-bots__control {
  width: 100%;
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  color-scheme: light dark;
}

.admin-ai-bots__control--with-icon {
  padding-left: 38px;
}

.admin-ai-bots__control--textarea {
  min-height: 120px;
  resize: vertical;
}

.admin-ai-bots__control--multiselect {
  min-height: 132px;
}

.admin-ai-bots__control:focus {
  border-color: rgba(var(--color-primary), 0.5);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.12);
}

.admin-ai-bots__control--error {
  border-color: rgba(239, 68, 68, 0.48);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.admin-ai-bots__help,
.admin-ai-bots__muted {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.82rem;
  line-height: 1.5;
}

.admin-ai-bots__help--info {
  color: rgb(var(--color-primary));
}

.admin-ai-bots__error {
  color: rgb(185, 28, 28);
  font-size: 0.8rem;
  font-weight: 600;
}

.admin-ai-bots__banner,
.admin-ai-bots__info-panel {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.92rem;
}

.admin-ai-bots__banner--primary,
.admin-ai-bots__banner--info,
.admin-ai-bots__info-panel--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.24);
  color: rgb(var(--color-text));
}

.admin-ai-bots__banner--success {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.28);
  color: rgb(21, 128, 61);
}

.admin-ai-bots__banner--warning,
.admin-ai-bots__info-panel--warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.28);
  color: rgb(180, 83, 9);
}

.admin-ai-bots__banner--danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.32);
  color: rgb(185, 28, 28);
}

.admin-ai-bots__table-wrap {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.92);
  overflow: auto;
}

.admin-ai-bots__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
}

.admin-ai-bots__table th,
.admin-ai-bots__table td {
  padding: 16px 14px;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
  text-align: left;
  vertical-align: top;
}

.admin-ai-bots__table th {
  color: rgba(var(--color-text), 0.66);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(var(--color-surface-elevated), 0.9);
}

.admin-ai-bots__table tbody tr:last-child td {
  border-bottom: none;
}

.admin-ai-bots__table-actions-head {
  text-align: right;
}

.admin-ai-bots__empty-row {
  color: rgba(var(--color-text), 0.72);
  text-align: center;
  padding: 28px 18px;
}

.admin-ai-bots__identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.admin-ai-bots__identity-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.admin-ai-bots__identity-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: rgb(var(--color-heading));
  font-weight: 700;
}

.admin-ai-bots__identity-meta,
.admin-ai-bots__prompt-preview {
  color: rgb(var(--color-text));
  font-size: 0.92rem;
  line-height: 1.5;
}

.admin-ai-bots__cell-title {
  color: rgb(var(--color-heading));
  font-size: 0.95rem;
  font-weight: 700;
}

.admin-ai-bots__avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.82);
  background: rgba(var(--color-primary), 0.12);
  flex: 0 0 auto;
}

.admin-ai-bots__avatar--large {
  width: 44px;
  height: 44px;
}

.admin-ai-bots__avatar-image,
.admin-ai-bots__avatar-fallback {
  width: 100%;
  height: 100%;
}

.admin-ai-bots__avatar-image {
  display: block;
  object-fit: cover;
}

.admin-ai-bots__avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  text-transform: uppercase;
  color: rgb(var(--color-primary));
}

.admin-ai-bots__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.admin-ai-bots__chip-row--tight {
  margin-top: 10px;
}

.admin-ai-bots__modal-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-ai-bots__modal-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.52);
}

.admin-ai-bots__modal {
  position: relative;
  width: min(100%, 980px);
  max-height: calc(100vh - 48px);
  z-index: 1;
}

.admin-ai-bots__modal--medium {
  width: min(100%, 760px);
}

.admin-ai-bots__modal--compact {
  width: min(100%, 420px);
}

.admin-ai-bots__modal-card {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}

.admin-ai-bots__modal-header,
.admin-ai-bots__modal-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
}

.admin-ai-bots__modal-header {
  justify-content: space-between;
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.admin-ai-bots__modal-title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.1rem;
  font-weight: 700;
}

.admin-ai-bots__modal-subtitle {
  margin: 4px 0 0;
  color: rgba(var(--color-text), 0.68);
  font-size: 0.84rem;
}

.admin-ai-bots__modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  overflow: auto;
}

.admin-ai-bots__modal-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid rgba(var(--color-border), 0.82);
}

.admin-ai-bots__section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-ai-bots__section-title,
.admin-ai-bots__subsection-title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-weight: 700;
}

.admin-ai-bots__subsection-title {
  font-size: 0.95rem;
  margin-top: 6px;
}

.admin-ai-bots__profile-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-ai-bots__toggle-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-ai-bots__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.84);
  background: rgba(var(--color-surface), 0.9);
  padding: 0 14px;
  color: rgb(var(--color-text));
  font-size: 0.88rem;
  font-weight: 600;
}

.admin-ai-bots__toggle input {
  width: 16px;
  height: 16px;
  accent-color: rgb(var(--color-primary));
}

.admin-ai-bots__capability-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-ai-bots__tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-ai-bots__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.84);
  background: rgba(var(--color-surface), 0.92);
  color: rgba(var(--color-text), 0.76);
  padding: 0 12px;
  font-size: 0.84rem;
  font-weight: 700;
}

.admin-ai-bots__tab--active {
  border-color: rgba(var(--color-primary), 0.34);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.admin-ai-bots__tab-panel,
.admin-ai-bots__details-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-ai-bots__details {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 18px;
  background: rgba(var(--color-surface), 0.9);
  overflow: hidden;
}

.admin-ai-bots__details-summary {
  list-style: none;
  cursor: pointer;
  padding: 16px 18px;
  color: rgb(var(--color-heading));
  font-size: 0.94rem;
  font-weight: 700;
}

.admin-ai-bots__details-summary::-webkit-details-marker {
  display: none;
}

.admin-ai-bots__details-summary::after {
  content: "▾";
  float: right;
  color: rgba(var(--color-text), 0.6);
}

.admin-ai-bots__details[open] .admin-ai-bots__details-summary::after {
  content: "▴";
}

.admin-ai-bots__details-body {
  border-top: 1px solid rgba(var(--color-border), 0.76);
  padding: 0 18px 18px;
}

.admin-ai-bots__toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1300;
}

.admin-ai-bots__toast {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: min(420px, calc(100vw - 40px));
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.98);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  padding: 12px 14px;
  color: rgb(var(--color-text));
}

.admin-ai-bots__toast--primary,
.admin-ai-bots__toast--info {
  border-color: rgba(var(--color-primary), 0.24);
}

.admin-ai-bots__toast--success {
  border-color: rgba(34, 197, 94, 0.3);
}

.admin-ai-bots__toast--warning {
  border-color: rgba(245, 158, 11, 0.3);
}

.admin-ai-bots__toast--danger {
  border-color: rgba(239, 68, 68, 0.3);
}

.admin-ai-bots__toast--accent {
  border-color: rgba(236, 72, 153, 0.3);
}

.admin-ai-bots__toast-close {
  margin-left: auto;
  width: 32px;
  min-height: 32px;
  padding: 0;
  background: transparent;
}

.admin-ai-bots-modal-fade-enter-active,
.admin-ai-bots-modal-fade-leave-active,
.admin-ai-bots-toast-fade-enter-active,
.admin-ai-bots-toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.admin-ai-bots-modal-fade-enter-from,
.admin-ai-bots-modal-fade-leave-to,
.admin-ai-bots-toast-fade-enter-from,
.admin-ai-bots-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes admin-ai-bots-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 959px) {
  .admin-ai-bots__filters,
  .admin-ai-bots__grid,
  .admin-ai-bots__grid--tester {
    grid-template-columns: 1fr;
  }

  .admin-ai-bots__field--search,
  .admin-ai-bots__field--full {
    grid-column: span 1;
  }

  .admin-ai-bots__field--compact {
    max-width: none;
  }

  .admin-ai-bots__header {
    align-items: stretch;
  }

  .admin-ai-bots__toolbar-spacer {
    display: none;
  }
}

@media (max-width: 767px) {
  .admin-ai-bots__body,
  .admin-ai-bots__modal-body,
  .admin-ai-bots__modal-header,
  .admin-ai-bots__modal-actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .admin-ai-bots__modal-layer {
    padding: 12px;
  }

  .admin-ai-bots__toast-stack {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .admin-ai-bots__toast {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
