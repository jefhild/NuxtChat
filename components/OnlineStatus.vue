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

const { getUserStatus, updateStatus } = useDb();
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
  const data = await getUserStatus(props.userId); 


  if (data) {
    isOnline.value = data.status === 'online'
  }
};

const toggleStatus = async () => {
  isOnline.value = !isOnline.value;
  await updateStatusInDatabase(isOnline.value);
};

const updateStatusInDatabase = async (status) => {
  await updateStatus(props.userId, status);
};
</script>
