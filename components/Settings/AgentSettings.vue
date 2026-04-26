<template>
  <div>
    <section class="agent-settings-card">
      <div class="agent-section-header mb-4">
        <div class="flex items-center gap-3">
          <i class="mdi mdi-robot-outline agent-section-header__icon" aria-hidden="true" />
          <div>
            <div class="text-subtitle-1 font-weight-bold">Away Agent</div>
            <div class="text-caption text-medium-emphasis">
              Let an AI agent represent you while you're offline
            </div>
          </div>
          <div class="ml-auto flex-none">
            <label class="agent-toggle">
              <input
                v-model="agentEnabled"
                type="checkbox"
                :disabled="toggling || saving"
                @change="onToggle(agentEnabled)"
              >
            </label>
          </div>
        </div>
      </div>

      <hr class="agent-divider">

      <div class="mb-5">
        <span
          class="agent-status-chip"
          :class="`agent-status-chip--${statusChip.color}`"
        >
          <i :class="['mdi', statusChip.icon, 'agent-status-chip__icon']" aria-hidden="true" />
          {{ statusChip.label }}
        </span>
      </div>

      <template v-if="authStore.authStatus === 'authenticated'">
        <div class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">Agent personality</div>
          <div class="agent-choice-group">
            <button type="button" class="agent-choice-btn" :class="{ 'is-active': config.prompt_preset_key === 'friendly' }" @click="config.prompt_preset_key = 'friendly'">Friendly</button>
            <button type="button" class="agent-choice-btn" :class="{ 'is-active': config.prompt_preset_key === 'curious' }" @click="config.prompt_preset_key = 'curious'">Curious</button>
            <button type="button" class="agent-choice-btn" :class="{ 'is-active': config.prompt_preset_key === 'playful' }" @click="config.prompt_preset_key = 'playful'">Playful</button>
            <button type="button" class="agent-choice-btn" :class="{ 'is-active': config.prompt_preset_key === 'professional' }" @click="config.prompt_preset_key = 'professional'">Professional</button>
            <button type="button" class="agent-choice-btn" :class="{ 'is-active': config.prompt_preset_key === 'custom' }" @click="config.prompt_preset_key = 'custom'">Custom</button>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ presetDescription }}
          </div>
        </div>

        <div v-if="config.prompt_preset_key === 'custom'" class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">Custom instructions</div>
          <textarea
            v-model="config.system_prompt_addition"
            class="agent-textarea"
            placeholder="Describe how you want your agent to represent you. E.g. 'I'm a night owl who loves deep conversations about science and philosophy. I prefer slow, thoughtful exchanges.'"
            rows="3"
            maxlength="400"
          />
          <div class="agent-counter">
            {{ (config.system_prompt_addition || '').length }}/400
          </div>
        </div>

        <div class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">
            Opening message
            <span class="agent-optional-chip">optional</span>
          </div>
          <textarea
            v-model="config.greeting_template"
            class="agent-textarea"
            placeholder="Leave blank to let the agent generate a greeting based on your bio. Or write your own: e.g. 'Hey — I'm away right now but wanted to say hi. What's on your mind?'"
            rows="2"
            maxlength="200"
          />
          <div class="agent-counter">
            {{ (config.greeting_template || '').length }}/200
          </div>
        </div>

        <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div class="text-body-2 font-weight-medium mb-2">Exchanges per conversation</div>
            <select
              v-model="config.max_exchanges_per_conversation"
              class="agent-select"
            >
              <option v-for="count in [3, 5, 10, 20]" :key="count" :value="count">
                {{ count }}
              </option>
            </select>
            <div class="text-caption text-medium-emphasis mt-1">
              Max back-and-forth messages before agent pauses
            </div>
          </div>
          <div>
            <div class="text-body-2 font-weight-medium mb-2">Max simultaneous conversations</div>
            <select
              v-model="config.max_conversations_per_session"
              class="agent-select"
            >
              <option
                v-for="count in AWAY_AGENT_SIMULTANEOUS_CONVERSATION_OPTIONS"
                :key="count"
                :value="count"
              >
                {{ count }}
              </option>
            </select>
            <div class="text-caption text-medium-emphasis mt-1">
              Limit how many people your agent contacts at once
            </div>
          </div>
        </div>

        <button
          type="button"
          class="agent-save-btn"
          :disabled="saving || toggling"
          @click="saveConfig"
        >
          <span v-if="saving" class="agent-save-btn__spinner" aria-hidden="true" />
          Save agent settings
        </button>

        <div class="agent-note agent-note--info mt-5">
          Your agent will introduce itself as your representative and messages it sends will be
          labeled <strong>Away Agent</strong> so other users know. It pauses while you are online
          and resumes the next time you are away.
        </div>
      </template>

      <template v-else-if="authStore.authStatus === 'anon_authenticated'">
        <div class="agent-note agent-note--info mt-4">
          <strong>Almost there.</strong> Away Agent needs a registered account so it knows who
          you are when you return. It only takes your email.
        </div>
        <button
          type="button"
          class="agent-save-btn mt-4"
          @click="showConvertDialog = true"
        >
          <i class="mdi mdi-email-outline" aria-hidden="true" />
          Activate Away Agent
        </button>
      </template>

      <template v-else>
        <div class="agent-note agent-note--warning mt-4">
          Away Agent is only available to registered users.
        </div>
      </template>
    </section>

    <AuthConvertAccountDialog
      v-model="showConvertDialog"
      context="away-agent"
      @converted="onConverted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore1";
import {
  AWAY_AGENT_SIMULTANEOUS_CONVERSATION_OPTIONS,
  clampAwayAgentConversationLimit,
} from "@/constants/awayAgent";

const authStore = useAuthStore();
const route = useRoute();

const agentEnabled = ref(false);
const activeConversations = ref(0);
const pausedBecauseOnline = ref(false);
const toggling = ref(false);
const saving = ref(false);
const showConvertDialog = ref(false);

const config = ref({
  prompt_preset_key: "friendly",
  system_prompt_addition: null,
  greeting_template: null,
  max_exchanges_per_conversation: 5,
  max_conversations_per_session: 5,
});

const PRESET_DESCRIPTIONS = {
  friendly: "Warm and welcoming — focuses on making people feel comfortable.",
  curious: "Asks thoughtful questions and shows genuine interest.",
  playful: "Light, fun, a little witty — keeps the mood upbeat.",
  professional: "Direct and respectful — gets to interesting conversation quickly.",
  custom: "Write your own instructions for how the agent should represent you.",
};

const presetDescription = computed(
  () => PRESET_DESCRIPTIONS[config.value.prompt_preset_key] ?? ""
);
const statusChip = computed(() => {
  if (!agentEnabled.value) {
    return {
      color: "primary",
      variant: "outlined",
      icon: "mdi-robot-off-outline",
      label: "Disabled",
    };
  }

  if (activeConversations.value > 0) {
    return {
      color: "amber",
      variant: "tonal",
      icon: "mdi-robot",
      label: `Enabled · ${activeConversations.value} conversation(s) in progress`,
    };
  }

  if (pausedBecauseOnline.value) {
    return {
      color: "primary",
      variant: "tonal",
      icon: "mdi-pause-circle-outline",
      label: "Enabled · paused while you're online",
    };
  }

  return {
    color: "success",
    variant: "tonal",
    icon: "mdi-robot",
    label: "Enabled · ready for when you're away",
  };
});

async function fetchStatus() {
  const data = await $fetch("/api/agent/status").catch(() => null);
  if (!data) return;

  agentEnabled.value = data.enabled ?? false;
  activeConversations.value = data.activeConversations ?? 0;
  pausedBecauseOnline.value = data.pausedBecauseOnline ?? false;

  if (data.config) {
    config.value = {
      prompt_preset_key: data.config.prompt_preset_key ?? "friendly",
      system_prompt_addition: data.config.system_prompt_addition ?? null,
      greeting_template: data.config.greeting_template ?? null,
      max_exchanges_per_conversation: data.config.max_exchanges_per_conversation ?? 5,
      max_conversations_per_session: clampAwayAgentConversationLimit(
        data.config.max_conversations_per_session
      ),
    };
  }

}

async function onToggle(value) {
  if (value && authStore.authStatus !== "authenticated") {
    agentEnabled.value = false;
    showConvertDialog.value = true;
    return;
  }
  toggling.value = true;
  try {
    const result = await $fetch("/api/agent/activate", {
      method: "POST",
      body: { enabled: value },
    });
    agentEnabled.value = result?.enabled ?? value;
    if (!agentEnabled.value) {
      activeConversations.value = 0;
      pausedBecauseOnline.value = false;
    } else {
      await fetchStatus();
    }
  } catch {
    agentEnabled.value = !value;
  } finally {
    toggling.value = false;
  }
}

async function onConverted() {
  await authStore.checkAuth();
}

async function saveConfig() {
  saving.value = true;
  try {
    await $fetch("/api/agent/config", {
      method: "POST",
      body: config.value,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchStatus();
  if (route.query.convertAccount === "1" && authStore.authStatus === "anon_authenticated") {
    showConvertDialog.value = true;
  }
});
</script>

<style scoped>
.agent-settings-card {
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
}

.agent-section-header {
  background: rgb(var(--color-foreground) / 0.04);
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 10px;
  padding: 14px 16px;
}

.agent-section-header__icon {
  font-size: 28px;
  color: rgb(var(--color-primary));
}

.agent-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.1rem;
}

.agent-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: rgb(var(--color-primary));
}

.agent-divider {
  margin: 0 0 1.25rem;
  border: 0;
  border-top: 1px solid rgb(var(--color-border) / 0.72);
}

.agent-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.agent-status-chip--primary {
  background: rgb(var(--color-primary) / 0.1);
  border-color: rgb(var(--color-primary) / 0.22);
  color: rgb(var(--color-primary));
}

.agent-status-chip--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.agent-status-chip--amber {
  background: rgb(var(--color-warning) / 0.12);
  border-color: rgb(var(--color-warning) / 0.22);
  color: rgb(var(--color-warning));
}

.agent-choice-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.agent-choice-btn,
.agent-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.agent-choice-btn {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.agent-choice-btn.is-active {
  border-color: rgb(var(--color-primary) / 0.4);
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-foreground));
}

.agent-textarea,
.agent-select {
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
}

.agent-textarea {
  resize: vertical;
}

.agent-counter {
  margin-top: 0.35rem;
  color: rgb(var(--color-foreground) / 0.56);
  font-size: 0.78rem;
  text-align: right;
}

.flex-0 {
  flex: 0 0 auto;
}

.agent-field {
  max-width: 600px;
}

.agent-optional-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgb(var(--color-secondary) / 0.12);
  color: rgb(var(--color-secondary));
  font-size: 0.72rem;
  font-weight: 600;
}

.agent-save-btn {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.agent-save-btn:disabled,
.agent-choice-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.agent-save-btn__spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: agent-spin 0.7s linear infinite;
}

.agent-note {
  padding: 0.9rem 1rem;
  border: 1px solid transparent;
  border-radius: 12px;
  line-height: 1.6;
}

.agent-note--info {
  background: rgb(var(--color-info) / 0.12);
  border-color: rgb(var(--color-info) / 0.22);
  color: rgb(var(--color-info));
}

.agent-note--warning {
  background: rgb(var(--color-warning) / 0.12);
  border-color: rgb(var(--color-warning) / 0.22);
  color: rgb(var(--color-warning));
}

@keyframes agent-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
