<template>
  <v-container fluid>
    <!-- Title Row -->

    <v-expansion-panels flat v-model="activePanels">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col>
              <h1
                class="font-style-poppins font-weight-light text-md-h4 text-h5"
              >
                Other
              </h1>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row no-gutters>
            <!-- First Column -->
            <v-col cols="12" sm="6" md="3">
              <div class="image-container">
                <v-img
                  src="/images/test/test10.jpg"
                  alt="Image 1"
                  height="200px"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title text-left">
                      Date
                    </v-col>
                    <v-col cols="4" class="d-flex justify-end align-center">
                      <span class="white--text">123</span>
                      <v-icon class="white--text ml-2">mdi-thumb-up</v-icon>
                    </v-col>
                    <v-col cols="12" class="white--text text-left">
                      Tagline
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-col>

            <!-- Second Column -->
            <v-col cols="12" sm="6" md="3">
              <div class="image-container">
                <v-img
                  src="/images/test/test11.jpg"
                  alt="Image 2"
                  height="200px"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title text-left">
                      Date
                    </v-col>
                    <v-col cols="4" class="d-flex justify-end align-center">
                      <span class="white--text">123</span>
                      <v-icon class="white--text ml-2">mdi-thumb-up</v-icon>
                    </v-col>
                    <v-col cols="12" class="white--text text-left">
                      Tagline
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-col>

            <!-- Third Column -->
            <v-col cols="12" sm="6" md="3">
              <div class="image-container">
                <v-img
                  src="/images/test/test12.jpg"
                  alt="Image 3"
                  height="200px"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title text-left">
                      Date
                    </v-col>
                    <v-col cols="4" class="d-flex justify-end align-center">
                      <span class="white--text">123</span>
                      <v-icon class="white--text ml-2">mdi-thumb-up</v-icon>
                    </v-col>
                    <v-col cols="12" class="white--text text-left">
                      Tagline
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-col>

            <!-- Fourth Column -->
            <v-col cols="12" sm="6" md="3">
              <div class="image-container">
                <v-img
                  src="/images/test/test13.jpg"
                  alt="Image 4"
                  height="200px"
                  cover
                ></v-img>
                <div class="text-overlay">
                  <v-row no-gutters>
                    <v-col cols="8" class="white--text-title text-left">
                      Date
                    </v-col>
                    <v-col cols="4" class="d-flex justify-end align-center">
                      <span class="white--text">123</span>
                      <v-icon class="white--text ml-2">mdi-thumb-up</v-icon>
                    </v-col>
                    <v-col cols="12" class="white--text text-left">
                      Tagline
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-container>
</template>

<script setup>
const activePanels = ref([0]);

// No special script needed unless handling dynamic data.
</script>

<style scoped>
.white--text-title {
  font-family: "poppins", sans-serif;
  font-size: 0.8rem;
  font-weight: 400;
  color: white;
}

.image-container {
  position: relative; /* Position reference for text overlay */
  margin-left: 5px;
  margin-top: 5px;
}

.text-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(
    0,
    0,
    0,
    0.5
  ); /* Optional background for readability */
  padding: 10px;
}

.white--text {
  color: white; /* Ensures text is white */
  font-weight: bold;
}

.align-center {
  align-items: center; /* Vertically centers the icon and number */
}

.justify-end {
  justify-content: flex-end; /* Pushes icon and number to the right */
}

.ml-2 {
  margin-left: 8px; /* Space between number and icon */
}

.font-style-poppins {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
}
</style>
