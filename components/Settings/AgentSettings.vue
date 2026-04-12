<template>
  <v-card class="agent-settings-card elevation-0 border-0">
    <v-card-text class="pa-0">

      <!-- Section header -->
      <div class="agent-section-header mb-4">
        <div class="d-flex align-center gap-3">
          <v-icon color="primary" size="28">mdi-robot-outline</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold">Away Agent</div>
            <div class="text-caption text-medium-emphasis">
              Let an AI agent represent you while you're offline
            </div>
          </div>
          <v-spacer />
          <div class="flex-0">
            <v-switch
              v-model="agentEnabled"
              class="agent-toggle"
              color="primary"
              hide-details
              inset
              :loading="toggling"
              :disabled="toggling || saving"
              @update:model-value="onToggle"
            />
          </div>
        </div>
      </div>

      <v-divider class="mb-5" />

      <!-- Status chip -->
      <div class="mb-5">
        <v-chip
          :color="statusChip.color"
          :variant="statusChip.variant"
          size="small"
          :prepend-icon="statusChip.icon"
        >
          {{ statusChip.label }}
        </v-chip>
      </div>

      <!-- Config form — only shown to authenticated users -->
      <template v-if="authStore.authStatus === 'authenticated'">

        <!-- Persona preset -->
        <div class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">Agent personality</div>
          <v-btn-toggle
            v-model="config.prompt_preset_key"
            color="primary"
            variant="outlined"
            divided
            density="compact"
            class="flex-wrap"
          >
            <v-btn value="friendly" size="small" variant="outlined">Friendly</v-btn>
            <v-btn value="curious" size="small" variant="outlined">Curious</v-btn>
            <v-btn value="playful" size="small" variant="outlined">Playful</v-btn>
            <v-btn value="professional" size="small" variant="outlined">Professional</v-btn>
            <v-btn value="custom" size="small" variant="outlined">Custom</v-btn>
          </v-btn-toggle>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ presetDescription }}
          </div>
        </div>

        <!-- Custom prompt — only when 'custom' selected -->
        <div v-if="config.prompt_preset_key === 'custom'" class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">Custom instructions</div>
          <v-textarea
            v-model="config.system_prompt_addition"
            placeholder="Describe how you want your agent to represent you. E.g. 'I'm a night owl who loves deep conversations about science and philosophy. I prefer slow, thoughtful exchanges.'"
            rows="3"
            variant="outlined"
            density="compact"
            counter="400"
            maxlength="400"
            hide-details="auto"
          />
        </div>

        <!-- Greeting template -->
        <div class="agent-field mb-5">
          <div class="text-body-2 font-weight-medium mb-2">
            Opening message
            <v-chip size="x-small" variant="tonal" color="secondary" class="ml-1">optional</v-chip>
          </div>
          <v-textarea
            v-model="config.greeting_template"
            placeholder="Leave blank to let the agent generate a greeting based on your bio. Or write your own: e.g. 'Hey — I'm away right now but wanted to say hi. What's on your mind?'"
            rows="2"
            variant="outlined"
            density="compact"
            counter="200"
            maxlength="200"
            hide-details="auto"
          />
        </div>

        <!-- Limits row -->
        <v-row class="mb-5" dense>
          <v-col cols="12" sm="6">
            <div class="text-body-2 font-weight-medium mb-2">Exchanges per conversation</div>
            <v-select
              v-model="config.max_exchanges_per_conversation"
              :items="[3, 5, 10, 20]"
              variant="outlined"
              density="compact"
              hide-details
            />
            <div class="text-caption text-medium-emphasis mt-1">
              Max back-and-forth messages before agent pauses
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-body-2 font-weight-medium mb-2">Max simultaneous conversations</div>
            <v-select
              v-model="config.max_conversations_per_session"
              :items="AWAY_AGENT_SIMULTANEOUS_CONVERSATION_OPTIONS"
              variant="outlined"
              density="compact"
              hide-details
            />
            <div class="text-caption text-medium-emphasis mt-1">
              Limit how many people your agent contacts at once
            </div>
          </v-col>
        </v-row>

        <!-- Save button -->
        <v-btn
          color="primary"
          variant="tonal"
          :loading="saving"
          :disabled="saving || toggling"
          @click="saveConfig"
        >
          Save agent settings
        </v-btn>

        <!-- Info note -->
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-5"
          icon="mdi-information-outline"
        >
          Your agent will introduce itself as your representative and messages it sends will be
          labeled <strong>Away Agent</strong> so other users know. It pauses while you are online
          and resumes the next time you are away.
        </v-alert>

      </template>

      <!-- Anon-authenticated upsell: has a profile but no email yet -->
      <template v-else-if="authStore.authStatus === 'anon_authenticated'">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-4"
          icon="mdi-robot-outline"
        >
          <strong>Almost there.</strong> Away Agent needs a registered account so it knows who
          you are when you return. It only takes your email.
        </v-alert>
        <v-btn
          color="primary"
          variant="tonal"
          class="mt-4"
          prepend-icon="mdi-email-outline"
          @click="showConvertDialog = true"
        >
          Activate Away Agent
        </v-btn>
      </template>

      <!-- Fully unauthenticated gate -->
      <template v-else>
        <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
          Away Agent is only available to registered users.
        </v-alert>
      </template>

    </v-card-text>
  </v-card>

  <AuthConvertAccountDialog
    v-model="showConvertDialog"
    context="away-agent"
    @converted="onConverted"
  />
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
    agentEnabled.value = !value; // revert
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
  background: transparent;
}

.agent-section-header {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 10px;
  padding: 14px 16px;
}

.agent-section-header :deep(.v-switch .v-selection-control) {
  background: transparent !important;
}

.agent-toggle {
  background: transparent !important;
  margin: 0;
  padding: 0;
}

.agent-toggle :deep(.v-input__control),
.agent-toggle :deep(.v-input__details),
.agent-toggle :deep(.v-selection-control),
.agent-toggle :deep(.v-selection-control__wrapper),
.agent-toggle :deep(.v-switch__loader) {
  background: transparent !important;
  box-shadow: none !important;
}

.flex-0 {
  flex: 0 0 auto;
}

.agent-field {
  max-width: 600px;
}
</style>
