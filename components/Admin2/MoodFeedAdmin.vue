<template>
  <div class="admin-mood-feed">
    <v-card class="pa-4 mb-4" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-tune-variant</v-icon>
        Mood Feed Defaults
        <v-spacer />
      </v-card-title>

      <v-divider class="mb-4" />

      <div class="d-flex flex-wrap align-center gap-3">
        <v-select
          v-model="defaultTone"
          :items="toneOptions"
          label="Default tone"
          density="compact"
          hide-details
          class="tone-select"
        />
        <v-btn color="primary" @click="saveDefaultTone">Save</v-btn>
      </div>
    </v-card>

    <v-card class="pa-4 mb-4" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-comment-question-outline</v-icon>
        Mood Feed Prompts
        <v-spacer />
        <v-btn variant="text" icon="mdi-refresh" @click="loadPrompts" />
        <v-btn color="primary" class="ml-2" @click="openCreate">
          New Prompt
        </v-btn>
      </v-card-title>

      <v-divider class="mb-4" />

      <LoadingContainer v-if="isLoading" />

      <v-alert v-else-if="prompts.length === 0" type="info" class="mt-2">
        No prompts yet.
      </v-alert>

      <v-table v-else>
        <thead>
          <tr>
            <th>Key</th>
            <th>Prompt ({{ locale.toUpperCase() }})</th>
            <th>Active</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prompt in prompts" :key="prompt.id">
            <td>{{ prompt.prompt_key }}</td>
            <td class="prompt-text">
              {{ prompt.prompt_text || "—" }}
            </td>
            <td>
              <v-switch
                :model-value="prompt.is_active"
                density="compact"
                hide-details
                @update:modelValue="(val) => toggleActive(prompt, val)"
              />
            </td>
            <td>{{ formatDate(prompt.updated_at) }}</td>
            <td class="actions-col">
              <v-btn size="small" variant="outlined" @click="openEdit(prompt)">
                Edit
              </v-btn>
              <v-btn
                size="small"
                color="red"
                variant="text"
                @click="deletePrompt(prompt)"
              >
                Delete
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <MoodFeedFlags />
  </div>

  <v-dialog v-model="dialog.open" max-width="560">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ dialog.mode === "create" ? "New Prompt" : "Edit Prompt" }}</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-text-field
          v-model="dialog.form.prompt_key"
          label="Prompt Key"
          :disabled="dialog.mode === 'edit'"
          placeholder="morning_scream"
          hide-details
        />
        <v-textarea
          v-model="dialog.form.prompt_text"
          class="mt-3"
          label="Prompt Text"
          auto-grow
          rows="2"
          hide-details
        />
        <div class="d-flex align-center mt-3">
          <v-switch
            v-model="dialog.form.is_active"
            hide-details
            density="compact"
            label="Active"
          />
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :disabled="saving" @click="saveDialog">
          {{ dialog.mode === "create" ? "Create" : "Save" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import MoodFeedFlags from "~/components/Admin2/MoodFeedFlags.vue";

const { locale } = useI18n();

const prompts = ref([]);
const defaultTone = ref("funny");
const isLoading = ref(true);
const saving = ref(false);

const dialog = reactive({
  open: false,
  mode: "create",
  form: {
    id: null,
    prompt_key: "",
    prompt_text: "",
    is_active: true,
  },
});

const toneOptions = [
  "funny",
  "deadpan",
  "snarky",
  "playful",
  "sarcastic",
  "wholesome",
  "empathetic",
  "serious",
  "reflective",
  "poetic",
  "minimalist",
  "dramatic",
  "optimistic",
  "skeptical",
  "chaotic",
  "dry",
  "quirky",
  "blunt",
  "tender",
  "noir",
];

const loadSettings = async () => {
  try {
    const res = await $fetch("/api/admin/mood-feed/settings");
    defaultTone.value = res?.item?.default_tone || "funny";
  } catch (error) {
    console.error("[admin][mood-feed] settings load error", error);
  }
};

const loadPrompts = async () => {
  isLoading.value = true;
  try {
    const res = await $fetch("/api/admin/mood-feed/prompts", {
      query: { locale: locale.value },
    });
    prompts.value = res?.items || [];
  } catch (error) {
    console.error("[admin][mood-feed] prompts load error", error);
    prompts.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadPrompts);
onMounted(loadSettings);

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

const openCreate = () => {
  dialog.mode = "create";
  dialog.form = {
    id: null,
    prompt_key: "",
    prompt_text: "",
    is_active: true,
  };
  dialog.open = true;
};

const openEdit = (prompt) => {
  dialog.mode = "edit";
  dialog.form = {
    id: prompt.id,
    prompt_key: prompt.prompt_key,
    prompt_text: prompt.prompt_text || "",
    is_active: !!prompt.is_active,
  };
  dialog.open = true;
};

const closeDialog = () => {
  dialog.open = false;
};

const saveDialog = async () => {
  if (!dialog.form.prompt_key.trim()) return;
  saving.value = true;
  try {
    if (dialog.mode === "create") {
      await $fetch("/api/admin/mood-feed/prompts", {
        method: "POST",
        body: {
          prompt_key: dialog.form.prompt_key.trim(),
          prompt_text: dialog.form.prompt_text.trim(),
          is_active: dialog.form.is_active,
          locale: locale.value,
          translate_all: true,
        },
      });
    } else {
      await $fetch(`/api/admin/mood-feed/prompts/${dialog.form.id}`, {
        method: "PATCH",
        body: {
          prompt_key: dialog.form.prompt_key.trim(),
          prompt_text: dialog.form.prompt_text.trim(),
          is_active: dialog.form.is_active,
          locale: locale.value,
          translate_all: true,
        },
      });
    }
    await loadPrompts();
    dialog.open = false;
  } catch (error) {
    console.error("[admin][mood-feed] prompt save error", error);
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (prompt, value) => {
  try {
    await $fetch(`/api/admin/mood-feed/prompts/${prompt.id}`, {
      method: "PATCH",
      body: {
        prompt_key: prompt.prompt_key,
        prompt_text: prompt.prompt_text || "",
        is_active: !!value,
        locale: locale.value,
        translate_all: false,
      },
    });
    prompt.is_active = !!value;
  } catch (error) {
    console.error("[admin][mood-feed] toggle active error", error);
  }
};

const deletePrompt = async (prompt) => {
  if (!prompt?.id) return;
  try {
    await $fetch(`/api/admin/mood-feed/prompts/${prompt.id}`, {
      method: "DELETE",
    });
    prompts.value = prompts.value.filter((item) => item.id !== prompt.id);
  } catch (error) {
    console.error("[admin][mood-feed] delete prompt error", error);
  }
};

const saveDefaultTone = async () => {
  try {
    const res = await $fetch("/api/admin/mood-feed/settings", {
      method: "PATCH",
      body: { default_tone: defaultTone.value },
    });
    defaultTone.value = res?.item?.default_tone || defaultTone.value;
  } catch (error) {
    console.error("[admin][mood-feed] settings save error", error);
  }
};
</script>

<style scoped>
.admin-mood-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prompt-text {
  max-width: 420px;
  white-space: pre-wrap;
}

.actions-col {
  display: flex;
  gap: 8px;
}

.tone-select {
  min-width: 220px;
}
</style>
