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
          <v-btn color="primary" @click="openCreateDialog">
            <v-icon start icon="mdi-robot-happy-outline"></v-icon>
            Add Bot
          </v-btn>
        </v-card-title>
        <v-card-subtitle class="text-body-2">
          Manage personas, prompts, and OpenAI settings for your chat agents.
        </v-card-subtitle>

        <v-alert
          v-if="recentCredentials && showCredentialsAlert"
          v-model="showCredentialsAlert"
          type="info"
          variant="tonal"
          class="mt-4"
          closable
        >
          <div class="font-weight-medium">New bot credentials</div>
          <div>
            Email:
            <code>{{ recentCredentials.email }}</code>
          </div>
          <div>
            Password:
            <code>{{ recentCredentials.password }}</code>
          </div>
          <div class="text-caption mt-2">
            Save these credentials now — they won't be shown again.
          </div>
        </v-alert>

        <v-text-field
          v-model="search"
          class="mt-4"
          label="Search by name, key, or model"
          prepend-inner-icon="mdi-magnify"
          clearable
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
              </td>
              <td class="text-right">
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
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.profile.displayname"
                  label="Display Name"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.profile.slug"
                  label="Slug"
                  :rules="[requiredRule, slugRule]"
                  @input="slugTouched = true"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.profile.avatar_url"
                  label="Avatar URL"
                  placeholder="https://..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.profile.tagline"
                  label="Tagline"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.profile.bio"
                  label="Bio"
                  rows="3"
                  auto-grow
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.profile.age"
                  label="Age"
                  type="number"
                  min="18"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.profile.gender_id"
                  :items="genderOptions"
                  item-title="name"
                  item-value="id"
                  label="Gender"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.profile.status_id"
                  :items="statusOptions"
                  item-title="name"
                  item-value="id"
                  label="Status"
                  clearable
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-2">Persona</div>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.persona.persona_key"
                  label="Persona Key"
                  :rules="[requiredRule, slugRule]"
                  @input="personaKeyTouched = true"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.persona.role"
                  :items="personaRoles"
                  label="Role"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="form.persona.is_active"
                  label="Active"
                  inset
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.persona.category_id"
                  :items="categoryOptions"
                  item-title="name"
                  item-value="id"
                  label="Category (expertise)"
                  clearable
                  hint="Assign this persona to an article category"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.persona.bias"
                  label="Bias / stance"
                  hint="Short descriptor for cards (e.g., Center-right - free-market)"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.persona.region"
                  label="Region"
                  hint="e.g., US, EU, US/EU"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.persona.angle"
                  label="Angle / summary"
                  rows="2"
                  auto-grow
                  hint="One-line summary of the persona voice"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.persona.language_code"
                  label="Language code"
                  hint="IETF code (e.g., en-US)"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.persona.model"
                  label="OpenAI model"
                  :rules="[requiredRule]"
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
              <v-col cols="12">
                <v-textarea
                  v-model="form.persona.system_prompt_template"
                  label="System prompt"
                  :rules="[requiredRule]"
                  rows="5"
                  auto-grow
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.persona.response_style_template"
                  label="Response style (optional)"
                  rows="3"
                  auto-grow
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-2">Advanced JSON Fields</div>
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
          removes the persona, profile, and its auth user.
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

const { listBots, createBot, updateBot, deleteBot } = useAdminAiBots();
const { getGenders, getStatuses, getAllCategories } = useDb();

const loading = ref(true);
const loadingList = ref(false);
const loadError = ref("");
const bots = ref([]);
const search = ref("");
const genders = ref([]);
const statuses = ref([]);
const categories = ref([]);
const dialog = ref(false);
const deleteDialog = ref(false);
const deleteTarget = ref(null);
const editingId = ref(null);
const formRef = ref(null);
const saving = ref(false);
const deleting = ref(false);
const recentCredentials = ref(null);
const showCredentialsAlert = ref(true);
const slugTouched = ref(false);
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
  profile: {
    displayname: "",
    slug: "",
    avatar_url: "",
    tagline: "",
    bio: "",
    age: null,
    gender_id: null,
    status_id: null,
  },
  persona: {
    persona_key: "",
    role: "assistant",
    is_active: true,
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
  },
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

const personaRoles = ["assistant", "system", "tool"];

const genderOptions = computed(() => genders.value || []);
const statusOptions = computed(() => statuses.value || []);
const categoryOptions = computed(() => categories.value || []);

const filteredBots = computed(() => {
  if (!search.value.trim()) return bots.value;
  const q = search.value.trim().toLowerCase();
  return bots.value.filter((bot) => {
    const profile = bot.profile || {};
    return (
      profile.displayname?.toLowerCase().includes(q) ||
      bot.persona_key?.toLowerCase().includes(q) ||
      bot.model?.toLowerCase().includes(q)
    );
  });
});

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
  () => form.profile.displayname,
  (value) => {
    if (editingId.value) return;
    if (!value) return;
    if (!slugTouched.value) {
      form.profile.slug = slugifyLocal(value);
    }
    if (!personaKeyTouched.value) {
      form.persona.persona_key = slugifyLocal(value);
    }
  }
);

watch(showCredentialsAlert, (isVisible) => {
  if (!isVisible) {
    recentCredentials.value = null;
  }
});

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

const resetForm = () => {
  Object.assign(form.profile, {
    displayname: "",
    slug: "",
    avatar_url: "",
    tagline: "",
    bio: "",
    age: null,
    gender_id: null,
    status_id: null,
  });
  Object.assign(form.persona, {
    persona_key: "",
    role: "assistant",
    is_active: true,
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
  });
  jsonInputs.parameters = "{}";
  jsonInputs.metadata = "{}";
  jsonInputs.dynamic_fields = "[]";
  jsonInputs.moderation_config = JSON.stringify(DEFAULT_MODERATION_CONFIG, null, 2);
  Object.keys(jsonErrors).forEach((key) => {
    jsonErrors[key] = "";
  });
  slugTouched.value = false;
  personaKeyTouched.value = false;
  nextTick(() => formRef.value?.resetValidation());
};

const avatarInitial = (bot) => {
  const source =
    bot?.profile?.displayname || bot?.persona_key || bot?.profile?.slug || "?";
  return source.charAt(0).toUpperCase();
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
  Object.assign(form.profile, {
    displayname: bot.profile?.displayname || "",
    slug: bot.profile?.slug || "",
    avatar_url: bot.profile?.avatar_url || "",
    tagline: bot.profile?.tagline || "",
    bio: bot.profile?.bio || "",
    age: bot.profile?.age ?? null,
    gender_id: bot.profile?.gender_id ?? null,
    status_id: bot.profile?.status_id ?? null,
  });

  Object.assign(form.persona, {
    persona_key: bot.persona_key || "",
    role: bot.role || "assistant",
    is_active: bot.is_active ?? true,
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
  });

  jsonInputs.parameters = formatJson(bot.parameters, "{}");
  jsonInputs.metadata = formatJson(bot.metadata, "{}");
  jsonInputs.dynamic_fields = formatJson(bot.dynamic_fields, "[]");
  jsonInputs.moderation_config = formatJson(
    bot.moderation_config,
    JSON.stringify(DEFAULT_MODERATION_CONFIG, null, 2)
  );
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
    } catch (error) {
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
    const [genderData, statusData, categoryData] = await Promise.all([
      getGenders(),
      getStatuses(),
      getAllCategories(),
    ]);
    genders.value = genderData || [];
    statuses.value = statusData || [];
    categories.value = categoryData || [];
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
  slugTouched.value = true;
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

  const payload = {
    profile: {
      ...form.profile,
      displayname: form.profile.displayname.trim(),
      slug: slugifyLocal(form.profile.slug),
    },
    persona: {
      ...form.persona,
      persona_key: slugifyLocal(form.persona.persona_key),
      temperature: Number(form.persona.temperature),
      top_p: Number(form.persona.top_p),
      presence_penalty: Number(form.persona.presence_penalty),
      frequency_penalty: Number(form.persona.frequency_penalty),
      max_response_tokens: Number(form.persona.max_response_tokens),
      max_history_messages: Number(form.persona.max_history_messages),
      category_id: form.persona.category_id || null,
      ...jsonPayload,
    },
  };

  if (Number.isNaN(payload.profile.age)) payload.profile.age = null;

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

    if (!editingId.value && res?.credentials) {
      recentCredentials.value = res.credentials;
      showCredentialsAlert.value = true;
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

onMounted(async () => {
  await Promise.all([loadBots(), loadLookups()]);
});
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
</style>
