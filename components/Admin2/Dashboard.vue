<template>
  <v-container>
    <LoadingContainer v-if="isLoading" />

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="tab" bg-color="primary">
            <v-tab value="registered">Registered</v-tab>
            <v-tab value="ai">AI</v-tab>
          </v-tabs>

          <v-card-text>
            <v-text-field
              v-model="search"
              label="Search profiles..."
              variant="outlined"
              class="mb-6"
              clearable
            ></v-text-field>

            <v-tabs-window v-model="tab">
              <v-tabs-window-item value="registered">
                <ProfileGrid
                  delete
                  :profiles="filteredRegistered"
                  @user-deleted="handleUserDeleted"
                  :limit="null"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="ai">
                <ProfileGrid
                  delete
                  :profiles="filteredAI"
                  @user-deleted="handleUserDeleted"
                  :limit="null"
                />
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const isLoading = ref(true);
const tab = ref("registered");
const profiles = ref([]); // will always be an array after load
const aiProfiles = ref([]);
const search = ref("");

const { getAllProfiles } = useDb();

// tiny helper to coerce “maybe array” -> array
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
};

onMounted(async () => {
  try {
    const [regRaw, aiRaw] = await Promise.all([
      getAllProfiles(false),
      getAllProfiles(true),
    ]);
    profiles.value = toArray(regRaw);
    aiProfiles.value = toArray(aiRaw);
  } catch (e) {
    console.error("[admin] getAllProfiles failed:", e);
    profiles.value = [];
    aiProfiles.value = [];
  } finally {
    isLoading.value = false;
  }
});

const normSearch = computed(() => (search.value || "").toLowerCase());

const filteredRegistered = computed(() =>
  profiles.value.filter(
    (p) =>
      // tolerate missing fields
      p?.provider !== "anonymous" &&
      (!normSearch.value ||
        (p?.displayname || "").toLowerCase().includes(normSearch.value))
  )
);

const filteredAI = computed(() =>
  aiProfiles.value.filter(
    (p) =>
      !normSearch.value ||
      (p?.displayname || "").toLowerCase().includes(normSearch.value)
  )
);

async function handleUserDeleted(userId) {
  try {
    profiles.value = profiles.value.map((p) =>
      p?.user_id === userId
        ? { ...p, marked_for_deletion_at: new Date().toISOString() }
        : p
    );
  } catch (error) {
    console.error("Error marking user for deletion:", error);
  }
}
</script>
