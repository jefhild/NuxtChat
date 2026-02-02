<template>
  <v-card class="pa-4" elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-flag</v-icon>
      Mood Feed Flags
      <v-spacer />
      <v-btn variant="text" icon="mdi-refresh" @click="loadFlags" />
    </v-card-title>

    <v-divider class="mb-4" />

    <LoadingContainer v-if="isLoading" />

    <v-alert v-else-if="flags.length === 0" type="info" class="mt-2">
      No flagged mood feed items.
    </v-alert>

    <v-table v-else>
      <thead>
        <tr>
          <th>Target</th>
          <th>Content</th>
          <th>Reporter</th>
          <th>Author</th>
          <th>Reason</th>
          <th>Flagged</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="flag in flags" :key="flag.id">
          <td>
            <v-chip
              :color="flag.target_type === 'entry' ? 'indigo' : 'teal'"
              class="ma-1"
              size="small"
              label
            >
              {{ flag.target_type }}
            </v-chip>
            <div class="text-caption text-medium-emphasis">
              {{ flag.target_id }}
            </div>
          </td>
          <td>
            <div v-if="flag.target?.missing" class="text-error">
              Missing target
            </div>
            <div v-else>
              <div class="flag-content">
                {{ flag.target?.content || "" }}
              </div>
              <div v-if="flag.target?.prompt_text" class="text-caption">
                Prompt: {{ flag.target.prompt_text }}
              </div>
            </div>
          </td>
          <td>
            <div>{{ flag.reporter?.displayname || flag.reporter?.user_id }}</div>
          </td>
          <td>
            <div>{{ flag.target?.author?.displayname || flag.target?.author?.user_id }}</div>
          </td>
          <td>{{ flag.reason || "—" }}</td>
          <td>{{ formatDate(flag.created_at) }}</td>
          <td class="actions-col">
            <v-btn
              size="small"
              color="red"
              variant="outlined"
              :disabled="flag.target?.missing"
              @click="deleteTarget(flag)"
            >
              Delete
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              @click="dismissFlag(flag.id)"
            >
              Dismiss
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
const isLoading = ref(true);
const flags = ref([]);

const loadFlags = async () => {
  isLoading.value = true;
  try {
    const res = await $fetch("/api/admin/mood-feed/flags");
    flags.value = res?.flags || [];
  } catch (error) {
    console.error("[admin][mood-feed] flags load error", error);
    flags.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadFlags);

const deleteTarget = async (flag) => {
  if (!flag?.target_id || !flag?.target_type) return;
  const endpoint =
    flag.target_type === "entry"
      ? `/api/admin/mood-feed/entries/${flag.target_id}`
      : `/api/admin/mood-feed/replies/${flag.target_id}`;

  try {
    await $fetch(endpoint, { method: "DELETE" });
    flags.value = flags.value.filter(
      (item) =>
        !(
          item.target_type === flag.target_type &&
          item.target_id === flag.target_id
        )
    );
  } catch (error) {
    console.error("[admin][mood-feed] delete target error", error);
  }
};

const dismissFlag = async (flagId) => {
  if (!flagId) return;
  try {
    await $fetch(`/api/admin/mood-feed/flags/${flagId}`, { method: "DELETE" });
    flags.value = flags.value.filter((item) => item.id !== flagId);
  } catch (error) {
    console.error("[admin][mood-feed] dismiss flag error", error);
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};
</script>

<style scoped>
.flag-content {
  max-width: 420px;
  white-space: pre-wrap;
}

.actions-col {
  display: flex;
  gap: 8px;
}
</style>
