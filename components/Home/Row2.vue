<template>
  <v-row class="bg-color">
    <v-col>
      <v-sheet color="transparent">
        <v-row
          ><v-col class="text-center">
            <NuxtImg
              class="image-shadow"
              width="500"
              src="/images/man-laptop.webp"
              :modifiers="{ blur: 1 }" /></v-col
        ></v-row>
      </v-sheet>
    </v-col>
    <v-col class="text-center d-flex align-center justify-center">
      <div>
        <h1>A Free Anonymous Chat Site</h1>
        <h2>Chat with Strangers Worldwide</h2>
        <p>1-Click Sign-in</p>
        <p>No registration required</p>
        <p>
          Chat with strangers
        </p>
        <p>Make Friends</p>
        <p>Create a Public Profile</p>
      </div>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup></script>

<style scoped>
.bg-color {
  background: linear-gradient(to bottom, white, #c4c4c4);
}

.poppins {
  font-family: "poppins", sans-serif;
}
.image-shadow {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 1); /* Adjust the shadow here */
}
</style>
