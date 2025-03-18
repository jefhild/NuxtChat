<template>
  <v-container fluid>
    <HomeRow1 />
    <v-row>
      <v-col>
        <SettingsContainer :first=first />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// this page shouldn't be crawled by search engines
const route = useRoute();
const first = route.query.first || false;
console.log("first: ", first);
</script>