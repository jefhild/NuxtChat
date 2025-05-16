<template>
  <!-- <v-card> -->
  <!-- <v-card-text> -->
  <!-- <v-row class="rowbg colstyle" justify="center" align="center"
        ><v-col class="text-center">Free anonymous chat.</v-col>
        <v-col class="text-center">AI or human chats.</v-col
        ><v-col class="text-center d-none d-md-flex">
          Sign in to get all the free features.</v-col
        ></v-row
      > -->

  <v-row class="rowbg rowheight" justify="center" align="center">
    <v-col class="text-center">Free anonymous chat.</v-col>
    <v-col class="fill-height">
      <div class="fill-height d-flex align-center justify-center">
        <AdSenseAdBanner ad-slot="2131952668" />
      </div>
    </v-col>
    <v-col class="text-center">Free anonymous chat.</v-col>
  </v-row>
  <!-- </v-card-text> -->
  <!-- </v-card> -->
</template>

<script lang="ts" setup></script>

<style>
.rowbg {
  background-color: #fdfaf6;
}
.rowheight {
  height: 80px;
}
.fill-height {
  height: 100%;
}
.colstyle {
  font-family: "poppins", sans-serif;
  font-size: 1rem;
  font-weight: 400;
}
</style>
