<template>
  <v-container class="myfont text-center pa-0">
    <v-row class="mt-16" align-content="center">
        <DialogAiSignUp :titleText="props.titleText"/>
    </v-row>
  </v-container>
</template>
 
<script setup>

const props = defineProps({
  titleText: {
    type: String,
    default: 'Create Your Anonymous Profile',
  }
});

const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity

const updateFormValidity = () => {
  isFormValid.value = isAgeConfirmed.value;
};

// Ensure initial form validity state is set correctly
updateFormValidity();
</script>

<style scoped>
.myfont {
  font-family: "poppins", sans-serif;
}
</style>
