<template>
  <div class="d-flex flex-column ga-6">
    <v-card class="pa-4" elevation="3">
      <v-card-title class="d-flex align-center ga-3">
        <div class="text-h6">Engagement Rules</div>
        <v-chip size="small" color="primary" variant="tonal">
          {{ rules.length }} total
        </v-chip>
        <v-spacer />
        <v-btn
          icon="mdi-refresh"
          variant="text"
          :disabled="loadingList"
          @click="loadRules"
        />
        <v-btn color="primary" @click="openCreateDialog()">
          <v-icon start icon="mdi-shield-account" />
          Add Rule
        </v-btn>
      </v-card-title>
      <v-card-subtitle class="text-body-2">
        Configure how AI personas participate in discussions vs. 1:1 chat.
      </v-card-subtitle>

      <v-alert
        v-if="loadError"
        type="error"
        variant="tonal"
        class="mt-4"
        border="start"
        border-color="red"
      >
        {{ loadError }}
      </v-alert>

      <v-table class="mt-4" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Name</th>
            <th class="text-left">Context</th>
            <th class="text-left">Cadence</th>
            <th class="text-left">Behavior</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule.id">
            <td>
              <div class="d-flex flex-column">
                <div class="font-weight-medium d-flex align-center ga-2">
                  {{ rule.name }}
                  <v-chip v-if="rule.is_default" size="x-small" color="primary" variant="tonal">
                    Default
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="rule.is_active ? 'success' : 'grey'"
                    variant="tonal"
                  >
                    {{ rule.is_active ? "Active" : "Inactive" }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ rule.description || "—" }}
                </div>
              </div>
            </td>
            <td class="text-capitalize">
              {{ rule.context }}
            </td>
            <td class="text-body-2">
              <div>Max replies: {{ rule.rules?.max_replies_per_persona }}</div>
              <div>Delay: {{ formatDelay(rule.rules?.min_delay_ms) }}</div>
              <div>Human activity required: {{ rule.rules?.human_activity_required ? "Yes" : "No" }}</div>
            </td>
            <td class="text-body-2">
              <div>
                Persona-to-persona:
                <strong>
                  {{ rule.rules?.allow_persona_to_persona ? "Enabled" : "Disabled" }}
                </strong>
              </div>
              <div>
                Probability: {{ Math.round((rule.rules?.persona_to_persona_probability || 0) * 100) }}%
              </div>
              <div>Reply length: {{ rule.rules?.reply_length || "short" }}</div>
            </td>
            <td class="text-right">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                color="primary"
                size="small"
                @click="openEditDialog(rule)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="red"
                size="small"
                :loading="deletingId === rule.id"
                @click="openDeleteDialog(rule)"
              />
            </td>
          </tr>
          <tr v-if="!rules.length && !loading">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              No engagement rules yet. Add one to define defaults for bots.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="840px" scrollable>
      <v-card>
        <v-card-title class="text-h6">
          {{ editingId ? "Edit engagement rule" : "Add engagement rule" }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.name"
                  label="Name"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.context"
                  :items="contextOptions"
                  item-title="label"
                  item-value="value"
                  label="Context"
                  :disabled="!!editingId"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  auto-grow
                  rows="2"
                />
              </v-col>
            </v-row>

            <v-row dense class="mt-2">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.rules.max_replies_per_persona"
                  label="Max replies per persona"
                  type="number"
                  min="1"
                  max="10"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.rules.min_delay_ms"
                  label="Min delay (ms)"
                  type="number"
                  min="0"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-switch
                  v-model="form.rules.human_activity_required"
                  label="Require human activity"
                  inset
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="form.rules.allow_persona_to_persona"
                  label="Allow persona-to-persona replies"
                  inset
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="form.rules.persona_to_persona_requires_human"
                  label="Only after human message"
                  inset
                  :disabled="!form.rules.allow_persona_to_persona"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-slider
                  v-model="form.rules.persona_to_persona_probability"
                  label="Persona-to-persona probability"
                  step="0.05"
                  min="0"
                  max="1"
                  thumb-label
                  :disabled="!form.rules.allow_persona_to_persona"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.rules.reply_length"
                  :items="replyLengthOptions"
                  label="Reply length"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.rules.audience_mode"
                  :items="audienceModeOptions"
                  label="Audience mode"
                  hint="Use direct for 1:1 chat"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-switch
                  v-model="form.rules.include_user_age"
                  label="Include user age (chat)"
                  inset
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-switch
                  v-model="form.rules.include_user_gender"
                  label="Include user gender (chat)"
                  inset
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="d-flex flex-wrap ga-3">
              <v-switch v-model="form.is_active" label="Active" inset />
              <v-switch v-model="form.is_default" label="Default for context" inset />
            </div>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false" :disabled="saving">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="handleSave">
            {{ editingId ? "Save changes" : "Create rule" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">Delete engagement rule</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.name }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false" :disabled="!!deletingId">
            Cancel
          </v-btn>
          <v-btn color="red" :loading="!!deletingId" @click="confirmDelete">
            Delete
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

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useAdminEngagementRules } from "@/composables/useAdminEngagementRules";

type EngagementRule = {
  id: string;
  name: string;
  context: string;
  description?: string | null;
  rules: Record<string, any>;
  is_default: boolean;
  is_active: boolean;
};

const { listRules, createRule, updateRule, deleteRule } = useAdminEngagementRules();

const DEFAULT_RULES_BY_CONTEXT: Record<string, Record<string, any>> = {
  discussion: {
    max_replies_per_persona: 3,
    min_delay_ms: 2000,
    human_activity_required: true,
    allow_persona_to_persona: true,
    persona_to_persona_requires_human: true,
    persona_to_persona_probability: 0.4,
    reply_length: "short",
    audience_mode: "discussion",
    include_user_age: false,
    include_user_gender: false,
  },
  chat: {
    max_replies_per_persona: 3,
    min_delay_ms: 2000,
    human_activity_required: true,
    allow_persona_to_persona: false,
    persona_to_persona_requires_human: true,
    persona_to_persona_probability: 0,
    reply_length: "short",
    audience_mode: "direct",
    include_user_age: true,
    include_user_gender: true,
  },
};

const loading = ref(true);
const loadingList = ref(false);
const loadError = ref("");
const rules = ref<EngagementRule[]>([]);
const dialog = ref(false);
const deleteDialog = ref(false);
const deleteTarget = ref<EngagementRule | null>(null);
const deletingId = ref<string | null>(null);
const formRef = ref();
const editingId = ref<string | null>(null);
const saving = ref(false);
const snackbar = reactive({
  show: false,
  message: "",
  color: "primary",
});

const form = reactive({
  name: "",
  context: "discussion",
  description: "",
  is_default: true,
  is_active: true,
  rules: { ...DEFAULT_RULES_BY_CONTEXT.discussion },
});

const contextOptions = [
  { label: "Discussion (article threads)", value: "discussion" },
  { label: "1:1 Chat", value: "chat" },
];

const replyLengthOptions = ["short", "medium", "long"];
const audienceModeOptions = ["discussion", "direct"];

const requiredRule = (value: any) =>
  (!!String(value ?? "").trim() && value !== null && value !== undefined) ||
  "This field is required";

const resetForm = (context = "discussion") => {
  Object.assign(form, {
    name: "",
    context,
    description: "",
    is_default: true,
    is_active: true,
    rules: { ...(DEFAULT_RULES_BY_CONTEXT[context] || DEFAULT_RULES_BY_CONTEXT.discussion) },
  });
};

const formatDelay = (value?: number) => {
  if (!value && value !== 0) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${value}ms`;
};

const openCreateDialog = (context = "discussion") => {
  editingId.value = null;
  resetForm(context);
  dialog.value = true;
};

const openEditDialog = (rule: EngagementRule) => {
  editingId.value = rule.id;
  Object.assign(form, {
    name: rule.name,
    context: rule.context,
    description: rule.description || "",
    is_default: rule.is_default,
    is_active: rule.is_active,
    rules: { ...(rule.rules || DEFAULT_RULES_BY_CONTEXT[rule.context] || {}) },
  });
  dialog.value = true;
};

const openDeleteDialog = (rule: EngagementRule) => {
  deleteTarget.value = rule;
  deleteDialog.value = true;
};

const loadRules = async () => {
  loadingList.value = true;
  loadError.value = "";
  try {
    const res = await listRules();
    if (res?.success === false) throw new Error(res.error);
    rules.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error: any) {
    console.error("[admin][engagement-rules] load error", error);
    loadError.value = error?.data?.error || error?.message || "Failed to load engagement rules.";
  } finally {
    loading.value = false;
    loadingList.value = false;
  }
};

const handleSave = async () => {
  const validation = await formRef.value?.validate?.();
  if (validation && !validation.valid) return;

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      context: form.context,
      description: form.description?.trim() || null,
      is_default: !!form.is_default,
      is_active: !!form.is_active,
      rules: { ...form.rules },
    };

    let res;
    if (editingId.value) {
      res = await updateRule(editingId.value, payload);
    } else {
      res = await createRule(payload);
    }

    if (res?.success === false) throw new Error(res.error);
    await loadRules();

    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = editingId.value ? "Rule updated." : "Rule created.";
    dialog.value = false;
  } catch (error: any) {
    console.error("[admin][engagement-rules] save error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.error || error?.message || "Failed to save rule.";
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async () => {
  if (!deleteTarget.value?.id) return;
  deletingId.value = deleteTarget.value.id;
  try {
    const res = await deleteRule(deleteTarget.value.id);
    if (res?.success === false) throw new Error(res.error);
    rules.value = rules.value.filter((r) => r.id !== deleteTarget.value?.id);
    snackbar.show = true;
    snackbar.color = "primary";
    snackbar.message = "Rule deleted.";
    deleteDialog.value = false;
    deleteTarget.value = null;
  } catch (error: any) {
    console.error("[admin][engagement-rules] delete error", error);
    snackbar.show = true;
    snackbar.color = "red";
    snackbar.message = error?.data?.error || error?.message || "Failed to delete rule.";
  } finally {
    deletingId.value = null;
  }
};

const syncDefaultsOnContextChange = computed(() => form.context);
watch(
  syncDefaultsOnContextChange,
  (context, prev) => {
    if (editingId.value) return;
    if (context !== prev) {
      form.rules = { ...(DEFAULT_RULES_BY_CONTEXT[context] || form.rules) };
    }
  },
  { flush: "post" }
);

onMounted(() => {
  loadRules();
});
</script>
