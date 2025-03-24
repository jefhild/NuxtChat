<template>
  <v-textarea
    v-if="isEditable"
    v-model="bio"
    label="Bio"
    rows="5"
    outlined
  ></v-textarea>
  <div v-else>
    <!-- <label>Bio:</label> -->
    <p class="text-h6">{{ bio }}</p>
  </div>
</template>

<script setup>

const props = defineProps({
  bio: {
    type: String,
    default: '',
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});
const bio = ref(props.bio);
watch(() => props.bio, (newBio) =>
{
  bio.value = newBio;
});

const emits = defineEmits(['updateBio']);



watch(bio, (newBio) => {
  emits('updateBio', newBio);
});
</script>

<style>
/* Add any additional styles if needed */
</style>
