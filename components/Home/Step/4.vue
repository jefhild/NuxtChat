<template>
  <v-row>
    <v-col class="text-center">
      <LookingForDisplay />
      <LookingForMenu />
    </v-col>
  </v-row>
</template>

<script setup>
// import { defineProps } from 'vue';

const props = defineProps({
  userProfile: {
    type: Object,
    required: false, // Make it optional in case userProfile is not always available
    default: () => null
  }
});
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.text-h6 {
  font-family: "poppins", sans-serif;
  font-size: 1.2rem;
  font-weight: 100;
  color: rgb(51, 90, 78);
}

.avatar-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 10px;
}
</style>