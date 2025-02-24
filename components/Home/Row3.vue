<template>
  <v-row class="bg-color-reverse">

    <v-col class="text-center d-flex align-center justify-center">
      <div>
        <h1>Meet New People, No Strings Attached</h1>
        <h2>Anonymous and Safe Conversations</h2>
        <p>Anonymous</p>
        <p>
          Chat with strangers in a safe environment. No registration required.
        </p>
        <p>Free and Free and still Free</p>
        <p>Create Public or Private Profiles</p>
      </div>
    </v-col>
        <v-col>
      <v-sheet color="transparent">
        <v-row
          ><v-col class="text-center">
            <NuxtImg
              class="image-shadow"
              width="500"
              src="/images/man-woman-talking.webp"
              :modifiers="{ blur: 1 }" /></v-col
        ></v-row>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup></script>

<style scoped>
.bg-color {
  background: linear-gradient(to bottom, white, #c4c4c4);
}
.bg-color-reverse {
  background: linear-gradient(to bottom, #c4c4c4, white);
}

.poppins {
  font-family: "poppins", sans-serif;
}
.image-shadow {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 1); /* Adjust the shadow here */
}
</style>
