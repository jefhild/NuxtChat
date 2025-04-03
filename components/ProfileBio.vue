<template>
  <v-textarea
    v-if="isEditable"
    v-model="bio"
    label="Bio"
    rows="5"
    outlined
  ></v-textarea>
  <div v-else>
    <p class="bio-paragraph">{{ bio }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  bio: {
    type: String,
    default: "",
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});
const bio = ref(props.bio);
watch(
  () => props.bio,
  (newBio) => {
    bio.value = newBio;
  }
);

const emits = defineEmits(["updateBio"]);

watch(bio, (newBio) => {
  emits("updateBio", newBio);
});
</script>

<style scoped>
.bio-paragraph {
  font-size: 1rem;
  line-height: 1.65;
  color: #374151; /* Tailwind's gray-700 */
  font-style: italic;
  border-left: 4px solid #d1d5db; /* Tailwind's gray-300 */
  padding-left: 1rem;
  text-align: justify;
}
</style>
