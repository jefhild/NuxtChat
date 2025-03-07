<template>
  <v-container class="myfont text-center">
    <v-row class=" pt-15 d-flex align-center justify-center text-center">
      <v-col cols="12">
        <DialogAiSignUp />
      </v-col>

    </v-row>
  </v-container>
</template>


<script setup>

const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity

const updateFormValidity = () => {
  isFormValid.value = isAgeConfirmed.value;
};

// Ensure initial form validity state is set correctly
updateFormValidity();
</script>

<style scoped>
.myfont{
  font-family: "poppins", sans-serif;
}
</style>