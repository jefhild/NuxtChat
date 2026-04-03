<template>
  <v-card class="agent-settings-card elevation-0 border-0">
    <v-card-text class="pa-0">

      <!-- Return banner: agent was active when user was away -->
      <v-alert
        v-if="returnBanner"
        type="success"
        variant="tonal"
        closable
        class="mb-5"
        @click:close="returnBanner = false"
      >
        <strong>Welcome back!</strong> Your Away Agent had
        {{ returnStats.conversations }} conversation(s) while you were away.
      </v-alert>

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
          :color="agentEnabled ? 'amber' : 'primary'"
          :variant="agentEnabled ? 'tonal' : 'outlined'"
          size="small"
          :prepend-icon="agentEnabled ? 'mdi-robot' : 'mdi-robot-off-outline'"
        >
          {{ agentEnabled ? `Active · ${activeConversations} conversation(s) in progress` : 'Inactive' }}
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
              :items="[1, 3, 5, 10, 20]"
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
          labeled <strong>Away Agent</strong> so other users know. It stops immediately when you
          log back in.
        </v-alert>

      </template>

      <!-- Registered-only gate -->
      <template v-else>
        <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
          Away Agent is only available to registered users.
        </v-alert>
      </template>

    </v-card-text>
  </v-card>

  <!-- Registration gate dialog -->
  <v-dialog v-model="showAuthDialog" max-width="420" persistent>
    <v-card>
      <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
        <v-icon color="primary">mdi-robot-outline</v-icon>
        Away Agent requires an account
      </v-card-title>
      <v-card-text class="px-5 pb-2">
        <p class="text-body-2 text-medium-emphasis mb-4">
          Create a free account to activate your Away Agent. It only takes a moment.
        </p>

        <v-tabs v-model="authDialogTab" density="compact" class="mb-4">
          <v-tab value="email">Email</v-tab>
          <v-tab value="google">Google</v-tab>
          <v-tab value="facebook">Facebook</v-tab>
        </v-tabs>

        <v-window v-model="authDialogTab">
          <v-window-item value="email">
            <LoginEmail />
          </v-window-item>
          <v-window-item value="google">
            <div class="py-4">
              <LoginOAuthButton provider="google" label="Google" icon="mdi-google" />
            </div>
          </v-window-item>
          <v-window-item value="facebook">
            <div class="py-4">
              <LoginOAuthButton provider="facebook" label="Facebook" icon="mdi-facebook" />
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions class="px-5 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="showAuthDialog = false">Maybe later</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import LoginEmail from "~/components/Login/Email.vue";
import LoginOAuthButton from "~/components/Login/OAuthButton.vue";

const authStore = useAuthStore();

const agentEnabled = ref(false);
const activeConversations = ref(0);
const toggling = ref(false);
const saving = ref(false);
const returnBanner = ref(false);
const returnStats = ref({ conversations: 0 });
const showAuthDialog = ref(false);
const authDialogTab = ref("email");

const config = ref({
  prompt_preset_key: "friendly",
  system_prompt_addition: null,
  greeting_template: null,
  max_exchanges_per_conversation: 5,
  max_conversations_per_session: 10,
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

async function fetchStatus() {
  const data = await $fetch("/api/agent/status").catch(() => null);
  if (!data) return;

  agentEnabled.value = data.enabled ?? false;
  activeConversations.value = data.activeConversations ?? 0;

  if (data.config) {
    config.value = {
      prompt_preset_key: data.config.prompt_preset_key ?? "friendly",
      system_prompt_addition: data.config.system_prompt_addition ?? null,
      greeting_template: data.config.greeting_template ?? null,
      max_exchanges_per_conversation: data.config.max_exchanges_per_conversation ?? 5,
      max_conversations_per_session: data.config.max_conversations_per_session ?? 10,
    };
  }

  // Show return banner if agent was active and is now being deactivated on arrival
  if (data.enabled && data.activeConversations > 0) {
    returnStats.value = { conversations: data.activeConversations };
    returnBanner.value = true;
    // Auto-deactivate since user is back
    await $fetch("/api/agent/activate", {
      method: "POST",
      body: { enabled: false },
    }).catch(() => {});
    agentEnabled.value = false;
  }
}

async function onToggle(value) {
  if (value && authStore.authStatus !== "authenticated") {
    agentEnabled.value = false;
    showAuthDialog.value = true;
    return;
  }
  toggling.value = true;
  try {
    await $fetch("/api/agent/activate", {
      method: "POST",
      body: { enabled: value },
    });
  } catch {
    agentEnabled.value = !value; // revert
  } finally {
    toggling.value = false;
  }
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

onMounted(fetchStatus);
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

.flex-0 {
  flex: 0 0 auto;
}

.agent-field {
  max-width: 600px;
}
</style>
