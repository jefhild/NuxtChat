<template>
  <div>
    <LoadingContainer
      v-if="loading"
      text="Loading AI bots..."
      class="mb-4"
    />

    <template v-else>
      <v-alert
        v-if="loadError"
        type="error"
        variant="tonal"
        class="mb-4"
        border="start"
        border-color="red"
      >
        {{ loadError }}
      </v-alert>

      <v-card class="pa-4" elevation="3">
        <v-card-title class="d-flex align-center ga-3">
          <div class="text-h6">AI Bots</div>
          <v-chip size="small" color="primary" variant="tonal">
            {{ bots.length }} total
          </v-chip>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            :disabled="loadingList"
            @click="loadBots"
          ></v-btn>
          <v-btn
            color="indigo"
            variant="tonal"
            :loading="runningHoneyMoltbook"
            @click="runHoneyMoltbookNow"
          >
            <v-icon start icon="mdi-post"></v-icon>
            Run Honey Moltbook
          </v-btn>
          <v-btn color="primary" @click="openCreateDialog">
            <v-icon start icon="mdi-robot-happy-outline"></v-icon>
            Add Bot
          </v-btn>
        </v-card-title>
        <v-card-subtitle class="text-body-2">
          Manage personas, prompts, and OpenAI settings for your chat agents.
        </v-card-subtitle>

        <v-text-field
          v-model="search"
          class="mt-4"
          label="Search by name, key, or model"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />
        <v-select
          v-model="capabilityFilter"
          class="mt-3"
          label="Capability filter"
          :items="capabilityFilterOptions"
          item-title="label"
          item-value="value"
          hide-details
        />

        <v-table class="mt-4" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Bot</th>
              <th class="text-left">Model</th>
              <th class="text-left">Prompt</th>
              <th class="text-left">Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bot in filteredBots" :key="bot.id">
              <td>
                <div class="d-flex align-center ga-3">
                  <v-avatar size="40">
                    <v-img
                      v-if="bot.profile?.avatar_url"
                      :src="bot.profile.avatar_url"
                    />
                    <span v-else class="avatar-fallback">
                      {{ avatarInitial(bot) }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">
                      {{ bot.profile?.displayname || "Unnamed bot" }}
                      <v-chip
                        size="x-small"
                        color="deep-purple"
                        class="ml-2"
                        variant="tonal"
                      >
                        {{ bot.role }}
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ bot.persona_key }}
                    </div>
                    <div
                      v-if="bot.category?.name || bot.category_id"
                      class="d-flex align-center ga-2 mt-1"
                    >
                      <v-chip
                        size="x-small"
                        color="primary"
                        variant="tonal"
                      >
                        {{ bot.category?.name || "Unassigned category" }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div>{{ bot.model }}</div>
                <div class="text-caption text-medium-emphasis">
                  Temp {{ bot.temperature }} · Top P {{ bot.top_p }}
                </div>
              </td>
              <td>
                <div class="text-body-2">
                  {{ truncate(bot.system_prompt_template) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Updated {{ formatTimestamp(bot.updated_at || bot.created_at) }}
                </div>
              </td>
              <td>
                <v-chip
                  :color="bot.is_active ? 'success' : 'grey'"
                  size="small"
                  variant="tonal"
                >
                  {{ bot.is_active ? "Active" : "Inactive" }}
                </v-chip>
                <div class="d-flex flex-wrap ga-1 mt-2">
                  <v-chip
                    v-if="bot.editorial_enabled"
                    size="x-small"
                    color="indigo"
                    variant="tonal"
                  >
                    Editorial
                  </v-chip>
                  <v-chip
                    v-if="bot.counterpoint_enabled"
                    size="x-small"
                    color="teal"
                    variant="tonal"
                  >
                    Counterpoint
                  </v-chip>
                  <v-chip
                    v-if="bot.honey_enabled"
                    size="x-small"
                    color="amber"
                    variant="tonal"
                  >
                    Honey
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="moltbookStatusColor(bot)"
                    variant="tonal"
                  >
                    Moltbook {{ bot.moltbook?.enabled ? "On" : "Off" }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  {{ moltbookUsageLabel(bot) }}
                </div>
              </td>
              <td class="text-right">
                <v-btn
                  icon="mdi-post-outline"
                  variant="text"
                  color="indigo"
                  @click="openPostDialog(bot)"
                  :disabled="!canPostToMoltbook(bot)"
                  size="small"
                ></v-btn>
                <v-btn
                  icon="mdi-account-edit"
                  variant="text"
                  color="secondary"
                  size="small"
                  :to="profileEditLink(bot) || undefined"
                  :disabled="!bot.profile_user_id"
                ></v-btn>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(bot)"
                  size="small"
                ></v-btn>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="red"
                  @click="openDeleteDialog(bot)"
                  size="small"
                ></v-btn>
              </td>
            </tr>
            <tr v-if="!filteredBots.length">
              <td colspan="5" class="text-center py-6 text-medium-emphasis">
                {{ search ? `No bots match "${search}".` : "No AI bots yet." }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card class="pa-4 mt-4" elevation="3">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-thermometer" color="deep-orange" />
          Match Mood Tester
        </v-card-title>
        <v-card-subtitle class="text-body-2">
          Set a bot's <code>live_mood_states</code> and create a <code>match_intakes</code> snapshot to test the matching pipeline.
        </v-card-subtitle>

        <v-row dense class="mt-4">
          <v-col cols="12" md="6">
            <v-select
              v-model="moodForm.botUserId"
              :items="botOptions"
              item-title="label"
              item-value="user_id"
              label="Bot"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="moodForm.emotion"
              :items="MOOD_EMOTIONS"
              label="Emotion"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="moodForm.intent"
              :items="MOOD_INTENT_OPTIONS"
              item-title="label"
              item-value="value"
              label="Intent"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="moodForm.energy"
              :items="MOOD_ENERGY"
              label="Energy"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="moodForm.privacy"
              :items="MOOD_PRIVACY_OPTIONS"
              item-title="label"
              item-value="value"
              label="Privacy"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="moodForm.timeHorizon"
              :items="MOOD_TIME_HORIZON_OPTIONS"
              item-title="label"
              item-value="value"
              label="Time horizon"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="moodForm.freeText"
              label="Free text (optional)"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="d-flex ga-2 mt-4">
          <v-btn
            color="deep-orange"
            variant="tonal"
            :loading="settingMood"
            :disabled="!moodForm.botUserId"
            @click="submitBotMood"
          >
            <v-icon start icon="mdi-check-circle-outline" />
            Set Mood
          </v-btn>
          <v-btn
            color="grey"
            variant="text"
            :loading="clearingMood"
            :disabled="!moodForm.botUserId"
            @click="clearBotMood"
          >
            Clear Mood
          </v-btn>
          <v-spacer />
          <v-btn
            color="red"
            variant="outlined"
            :loading="clearingAllIntakes"
            @click="clearAllBotIntakes"
          >
            <v-icon start icon="mdi-delete-sweep-outline" />
            Clear All Bot Intakes
          </v-btn>
        </div>
      </v-card>
    </template>

    <v-dialog v-model="dialog" max-width="960px" scrollable>
      <v-card>
        <v-card-title class="text-h6">
          {{ editingId ? "Edit AI Bot" : "Create AI Bot" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <div class="text-subtitle-2 mb-2">Profile</div>
            <v-row dense>
              <v-col cols="12">
                <v-select
                  v-model="form.persona.profile_user_id"
                  :items="profileOptions"
                  item-title="label"
                  item-value="user_id"
                  label="Attach existing profile"
                  :rules="[requiredRule]"
                  clearable
                  :disabled="Boolean(editingId)"
                  hint="Create/edit photos, bio, age, and gender in Profile Admin first, then attach here."
                  persistent-hint
                />
              </v-col>
              <v-col v-if="selectedProfile" cols="12">
                <v-alert type="info" variant="tonal" density="comfortable">
                  <div class="d-flex align-center ga-3">
                    <v-avatar size="36">
                      <v-img
                        v-if="selectedProfile.avatar_url"
                        :src="selectedProfile.avatar_url"
                      />
                      <span v-else class="avatar-fallback">
                        {{ avatarInitial({ profile: selectedProfile }) }}
                      </span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">
                        {{ selectedProfile.displayname || selectedProfile.slug || selectedProfile.user_id }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ selectedProfile.slug || selectedProfile.user_id }}
                      </div>
                    </div>
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-2">Bot Setup</div>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.persona.persona_key"
                  label="Persona Key"
                  :rules="[requiredRule, slugRule]"
                  @input="personaKeyTouched = true"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.persona.model"
                  label="OpenAI model"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" class="pt-0">
                <div class="d-flex flex-wrap align-center ga-3 capability-toggles">
                  <v-switch
                    v-model="form.persona.is_active"
                    label="Active"
                    color="success"
                    density="compact"
                    hide-details
                  />
                  <v-switch
                    v-model="form.persona.list_publicly"
                    label="Public listing"
                    color="primary"
                    density="compact"
                    hide-details
                  />
                  <v-switch
                    v-model="form.persona.editorial_enabled"
                    label="Editorial"
                    color="indigo"
                    density="compact"
                    hide-details
                  />
                  <v-switch
                    v-model="form.persona.counterpoint_enabled"
                    label="Counterpoint"
                    color="teal"
                    density="compact"
                    hide-details
                  />
                  <v-switch
                    v-model="form.persona.honey_enabled"
                    label="Honey"
                    color="amber-darken-2"
                    density="compact"
                    hide-details
                  />
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Role is fixed to <code>assistant</code>.
                </div>
                <div
                  v-if="isStarterPersona"
                  class="text-caption text-info mt-1"
                >
                  Starter bots are onboarding guides. They can keep Editorial,
                  Counterpoint, and Honey turned off.
                </div>
              </v-col>
              <v-col v-if="form.persona.honey_enabled" cols="12" md="4">
                <v-text-field
                  v-model.number="form.persona.honey_delay_min_ms"
                  label="Honey delay min (ms)"
                  type="number"
                  min="0"
                  :rules="[minRule(0)]"
                />
              </v-col>
              <v-col v-if="form.persona.honey_enabled" cols="12" md="4">
                <v-text-field
                  v-model.number="form.persona.honey_delay_max_ms"
                  label="Honey delay max (ms)"
                  type="number"
                  min="0"
                  :rules="[minRule(0)]"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.persona.system_prompt_template"
                  label="Base system prompt"
                  :rules="[requiredRule]"
                  rows="5"
                  auto-grow
                  hint="Fallback prompt when capability-specific override is empty."
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.persona.response_style_template"
                  label="Base response style (optional)"
                  rows="3"
                  auto-grow
                />
              </v-col>
              <v-col v-if="enabledCapabilityTabs.length" cols="12">
                <v-tabs
                  v-model="selectedCapabilityTab"
                  density="compact"
                  color="primary"
                  class="mb-2"
                >
                  <v-tab
                    v-for="cap in enabledCapabilityTabs"
                    :key="cap.key"
                    :value="cap.key"
                    size="small"
                  >
                    {{ cap.label }}
                  </v-tab>
                </v-tabs>
                <v-window v-model="selectedCapabilityTab">
                  <v-window-item value="editorial">
                    <v-textarea
                      v-model="form.persona.editorial_system_prompt_template"
                      label="Editorial prompt override (optional)"
                      rows="4"
                      auto-grow
                    />
                    <v-textarea
                      v-model="form.persona.editorial_response_style_template"
                      label="Editorial response style override (optional)"
                      rows="3"
                      auto-grow
                    />
                  </v-window-item>
                  <v-window-item value="counterpoint">
                    <v-textarea
                      v-model="form.persona.counterpoint_system_prompt_template"
                      label="Counterpoint prompt override (optional)"
                      rows="4"
                      auto-grow
                    />
                    <v-textarea
                      v-model="form.persona.counterpoint_response_style_template"
                      label="Counterpoint response style override (optional)"
                      rows="3"
                      auto-grow
                    />
                  </v-window-item>
                  <v-window-item value="honey">
                    <v-textarea
                      v-model="form.persona.honey_system_prompt_template"
                      label="Honey prompt override (optional)"
                      rows="4"
                      auto-grow
                    />
                    <v-textarea
                      v-model="form.persona.honey_response_style_template"
                      label="Honey response style override (optional)"
                      rows="3"
                      auto-grow
                    />
                  </v-window-item>
                </v-window>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <v-expansion-panels variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title>Advanced Persona Settings</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="form.persona.category_id"
                        :items="categoryOptions"
                        item-title="name"
                        item-value="id"
                        label="Category (expertise)"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.persona.bias"
                        label="Bias / stance"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.persona.region"
                        label="Region"
                      />
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="form.persona.angle"
                        label="Angle / summary"
                        rows="2"
                        auto-grow
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="form.persona.language_code"
                        label="Language code"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.temperature"
                        label="Temperature"
                        type="number"
                        step="0.1"
                        :rules="[makeRangeRule(0, 2)]"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.top_p"
                        label="Top P"
                        type="number"
                        step="0.1"
                        :rules="[makeRangeRule(0.01, 1)]"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.presence_penalty"
                        label="Presence Penalty"
                        type="number"
                        step="0.1"
                        :rules="[makeRangeRule(-2, 2, true)]"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.frequency_penalty"
                        label="Frequency Penalty"
                        type="number"
                        step="0.1"
                        :rules="[makeRangeRule(-2, 2, true)]"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.max_response_tokens"
                        label="Max tokens"
                        type="number"
                        min="1"
                        :rules="[minRule(1)]"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="form.persona.max_history_messages"
                        label="Max history messages"
                        type="number"
                        min="0"
                        :rules="[minRule(0)]"
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Moltbook Posting</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row dense>
                    <v-col cols="12">
                      <div class="d-flex flex-wrap align-center ga-3">
                        <v-switch
                          v-model="moltbookForm.enabled"
                          label="Enable Moltbook posting"
                          color="indigo"
                          density="compact"
                          hide-details
                        />
                      </div>
                      <div class="text-caption text-medium-emphasis mt-1">
                        Agent API keys stay server-side in <code>MOLTBOOK_AGENT_KEYS_JSON</code>. Match by agent name or persona key.
                      </div>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="moltbookForm.agent_name"
                        label="Credential key / agent name"
                        hint="Optional override. If blank, the persona key is used to find the API key in MOLTBOOK_AGENT_KEYS_JSON."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="moltbookForm.default_submolt"
                        label="Default submolt"
                        hint="Used as the default target when posting from admin."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="moltbookForm.daily_posts"
                        label="Daily post limit"
                        type="number"
                        min="0"
                        :rules="[minRule(0)]"
                        hint="0 disables admin posting for that day entirely."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="moltbookForm.cooldown_minutes"
                        label="Cooldown between posts (minutes)"
                        type="number"
                        min="0"
                        :rules="[minRule(0)]"
                      />
                    </v-col>
                    <v-col cols="12">
                      <v-divider class="my-2" />
                      <div class="text-subtitle-2 mb-2">Honey Autopost Voice</div>
                    </v-col>
                    <v-col cols="12">
                      <v-switch
                        v-model="moltbookForm.honey_posting_enabled"
                        label="Enable autonomous honey Moltbook posts"
                        color="pink"
                        density="compact"
                        hide-details
                      />
                      <div class="text-caption text-medium-emphasis mt-1">
                        When enabled, this honey bot can generate short emotional question posts ending with a soft invitation to talk.
                      </div>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="moltbookForm.honey_prompt_template"
                        label="Bot-specific posting prompt"
                        rows="4"
                        auto-grow
                        hint="Describe this bot's unique Moltbook voice, angle, and what emotional territory it should explore."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="moltbookForm.honey_emotional_themes"
                        label="Emotional themes"
                        multiple
                        chips
                        closable-chips
                        clearable
                        hint="Examples: mixed signals, lonely nights, wanting reassurance."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-combobox
                        v-model="moltbookForm.honey_cta_variants"
                        label="CTA variants"
                        multiple
                        chips
                        closable-chips
                        clearable
                        hint="Short ending questions the post can close with."
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" v-if="editingId">
                      <v-alert type="info" variant="tonal" density="comfortable">
                        {{ moltbookEditSummary }}
                      </v-alert>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Advanced JSON Fields</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row dense>
                    <v-col cols="12" md="6" v-for="field in jsonFieldList" :key="field.key">
                      <v-textarea
                        v-model="jsonInputs[field.key]"
                        :label="field.label"
                        rows="4"
                        auto-grow
                        :hint="field.hint"
                        persistent-hint
                        :error-messages="jsonErrors[field.key]"
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="handleSubmit">
            {{ editingId ? "Save Changes" : "Create Bot" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">Delete AI bot</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.profile?.displayname }}</strong>? This
          removes the AI persona behavior only. The profile/user remains.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false" :disabled="deleting">
            Cancel
          </v-btn>
          <v-btn color="red" :loading="deleting" @click="confirmDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="postDialog" max-width="720px" scrollable>
      <v-card>
        <v-card-title class="text-h6">
          Post To Moltbook
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="postTarget"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-4"
          >
            Posting as <strong>{{ postTarget.profile?.displayname || postTarget.persona_key }}</strong>
            using key <code>{{ postTarget.moltbook?.credential_key_label || postTarget.persona_key }}</code>.
          </v-alert>
          <v-alert
            v-if="postTarget?.moltbook?.honey_posting?.enabled"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-4"
          >
            This bot has honey autoposting enabled. Use Generate Honey Preview to draft a unique emotional post in its voice.
          </v-alert>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="postForm.submolt_name"
                label="Submolt"
                :rules="[requiredRule]"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="postForm.type"
                :items="postTypeOptions"
                label="Post type"
                item-title="label"
                item-value="value"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="postForm.title"
                label="Title"
                :rules="[requiredRule]"
                counter="300"
              />
            </v-col>
            <v-col cols="12" v-if="postForm.type === 'link'">
              <v-text-field
                v-model="postForm.url"
                label="Link URL"
                :rules="[requiredRule]"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="postForm.content"
                label="Content"
                rows="6"
                auto-grow
                :hint="postForm.type === 'link' ? 'Optional body for a link post.' : 'Body text for the Moltbook post.'"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-btn
            v-if="postTarget?.moltbook?.honey_posting?.enabled"
            variant="tonal"
            color="pink"
            :loading="previewingPost"
            @click="generateHoneyPreview"
          >
            Generate Honey Preview
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="postDialog = false" :disabled="posting">
            Cancel
          </v-btn>
          <v-btn color="indigo" :loading="posting" @click="submitMoltbookPost">
            Publish
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top"
      timeout="3500"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { useAdminAiBots } from "@/composables/useAdminAiBots";

const {
  listBots,
  createBot,
  updateBot,
  deleteBot,
  postToMoltbook,
  generateMoltbookDraft,
  runHoneyMoltbook,
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
const formRef = ref(null);
const saving = ref(false);
const deleting = ref(false);
const posting = ref(false);
const previewingPost = ref(false);
const runningHoneyMoltbook = ref(false);
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

const snackbar = reactive({
  show: false,
  message: "",
  color: "primary",
});

const postForm = reactive({
  submolt_name: "",
  title: "",
  content: "",
  url: "",
  type: "text",
});

const categoryOptions = computed(() => categories.value || []);
const postTypeOptions = [
  { label: "Text", value: "text" },
  { label: "Link", value: "link" },
  { label: "Image", value: "image" },
];
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
  return tabs;
});
const profileOptions = computed(() =>
  (profiles.value || [])
    .map((profile) => ({
      ...profile,
      label:
        `${profile.displayname || "Unnamed"} (${profile.slug || profile.user_id})` +
        (profile.ai_persona_key ? ` · in use: ${profile.ai_persona_key}` : ""),
    }))
    .sort((a, b) => (a.displayname || "").localeCompare(b.displayname || ""))
);
const selectedProfile = computed(() =>
  profileOptions.value.find(
    (profile) => profile.user_id === form.persona.profile_user_id
  )
);
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
    return true;
  });

  if (!q) return filteredByCapability;
  return filteredByCapability.filter((bot) => {
    const profile = bot.profile || {};
    return (
      profile.displayname?.toLowerCase().includes(q) ||
      bot.persona_key?.toLowerCase().includes(q) ||
      bot.model?.toLowerCase().includes(q)
    );
  });
});
const capabilityFilterOptions = [
  { label: "All capabilities", value: "all" },
  { label: "Honey", value: "honey" },
  { label: "Editorial", value: "editorial" },
  { label: "Counterpoint", value: "counterpoint" },
];

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
  Object.keys(jsonErrors).forEach((key) => {
    jsonErrors[key] = "";
  });
  personaKeyTouched.value = false;
  nextTick(() => formRef.value?.resetValidation());
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
  Object.keys(jsonErrors).forEach((key) => {
    jsonErrors[key] = "";
  });
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
  Object.assign(postForm, {
    submolt_name: bot.moltbook?.default_submolt || "",
    title: "",
    content: "",
    url: "",
    type: "text",
  });
  postDialog.value = true;
};

const handleSubmit = async () => {
  const validation = await formRef.value?.validate?.();
  if (validation && !validation.valid) return;

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
    !payload.persona.honey_enabled
  ) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Enable at least one capability (editorial, counterpoint, or honey).";
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
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.error || error?.message || "Failed to save bot.";
  } finally {
    saving.value = false;
  }
};

const submitMoltbookPost = async () => {
  if (!postTarget.value) return;
  if (!String(postForm.submolt_name || "").trim()) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Submolt is required.";
    return;
  }
  if (!String(postForm.title || "").trim()) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Title is required.";
    return;
  }
  if (postForm.type === "link" && !String(postForm.url || "").trim()) {
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = "Link posts require a URL.";
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
  }
});

watch(postDialog, (isOpen) => {
  if (!isOpen) {
    postTarget.value = null;
    previewingPost.value = false;
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
.avatar-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  font-weight: 600;
}

.capability-toggles :deep(.v-label) {
  font-size: 0.85rem;
}
</style>
