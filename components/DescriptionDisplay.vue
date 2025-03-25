<template>
  <v-row justify="end">
    <v-col
      v-for="icon in lookingForIcons"
      :key="icon.id"
      cols="auto"
      class="pa-1 mt-3"
    >
      <v-icon size="large" :color="icon.color" v-tooltip="icon.tooltip">{{
        icon.icon
      }}</v-icon>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const props = defineProps<{ userId: string }>();
const lookingForIcons = ref<Icon[]>([]);

const { getInterestsIds, getInterestsIcons } = useDb();

interface Icon {
  id: number;
  name: string;
  icon: string;
  tooltip: string;
  color: string;
}

async function fetchUserLookingForIcons(userId: string) {
  // Fetch the looking_for_ids for the user
  const { data: userLookingFor, error: userLookingForError } = await getInterestsIds(userId);

  if (userLookingForError)
  {
    console.error("Error fetching user looking for:", userLookingForError);
    return [];
  }

  const lookingForIds = userLookingFor ? userLookingFor.map((item) => item.looking_for_id) : [];

  // Fetch the icons from the looking_for table
  const { data: lookingForOptions, error: lookingForOptionsError } = await getInterestsIcons(lookingForIds);

  if (lookingForOptionsError) {
    console.error(
      "Error fetching looking for options:",
      lookingForOptionsError
    );
    return [];
  }

  return lookingForOptions ? lookingForOptions : [];
}

onMounted(async () => {
  lookingForIcons.value = await fetchUserLookingForIcons(props.userId);
});
</script>

<style scoped>
/* Add any custom styles here if needed */
</style>
