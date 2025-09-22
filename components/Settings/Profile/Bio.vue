<template>
  <v-textarea
    :disabled="!props.isEditable"
    v-model="internalBio"
    :label="$t('components.profile-bio.bio')"
    rows="5"
    variant="outlined"
  />
  <!-- <div v-else>
    <p class="bio-paragraph">{{ bio }}</p>
  </div> -->
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  bio: {
    type: String,
    required: true,
  },
  isEditable: {
    type: Boolean,
    required: true,
  },
});

const emits = defineEmits(["updateBio"]);
const internalBio = ref(props.bio);

// Keep internalBio in sync with props.bio
watch(
  () => props.bio,
  (newVal) => {
    if (newVal !== internalBio.value) {
      internalBio.value = newVal;
    }
  }
);

// Emit only on user input
watch(internalBio, (newVal) => {
  emits("updateBio", newVal);
});
</script>

<style scoped>
.bio-paragraph {
  font-size: 1rem;
  line-height: 1.65;
  color: #374151;
  font-style: italic;
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  text-align: justify;
}
</style>