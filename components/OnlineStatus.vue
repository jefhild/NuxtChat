<template>
  <v-tooltip text="Toggle online status" location="top" v-if="!loading">
    <template v-slot:activator="{ props }">
      <!-- <v-btn v-bind="props">Tooltip</v-btn> -->
      <v-btn
        v-bind="props"
        size="small"
        :color="isOnline ? 'green' : 'red'"
        :icon="
          isOnline ? 'mdi-power-plug-outline' : 'mdi-power-plug-off-outline'
        "
        @click="toggleStatus"
      ></v-btn>
    </template>
  </v-tooltip>
</template>

<script setup>
const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
});

const supabase = useSupabaseClient();
const isOnline = ref(false);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  await fetchStatus();
  loading.value = false;
});

watch(
  () => props.userId,
  async () => {
    await fetchStatus();
  }
);

const fetchStatus = async () => {
  const { data, error } = await supabase
    .from("presence")
    .select("status")
    .eq("user_id", props.userId)
    .single();

  if (error) {
    console.error("Error fetching status:", error);
  } else {
    isOnline.value = data.status === "online";
  }
};

const toggleStatus = async () => {
  isOnline.value = !isOnline.value;
  await updateStatusInDatabase(isOnline.value);
};

const updateStatusInDatabase = async (status) => {
  const { error } = await supabase
    .from("presence")
    .upsert({ user_id: props.userId, status: status ? "online" : "offline" });

  if (error) {
    console.error("Error updating status:", error);
  }
};
</script>
