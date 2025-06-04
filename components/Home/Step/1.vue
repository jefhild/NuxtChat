<template>
  <v-row class="d-flex flex-column align-center">
    <v-col class="text-center">
      <h1 class="green--text-h1">A free anonymous chat platform</h1>
      <h2 class="text-h6 mb-3">How old are you?</h2>
      <span class="text-h2 font-weight-light" v-text="age"></span>
      <span class="subheading font-weight-light">Yrs.</span>
      <v-fade-transition>
        <v-avatar
          :color="color"
          :style="{ animationDuration: animationDuration }"
          class="mb-1 v-avatar--metronome"
          size="12"
        ></v-avatar>
      </v-fade-transition>
      <v-container max-width="400">
        <v-slider
          v-model="age"
          :color="color"
          :step="1"
          max="80"
          min="18"
          track-color="grey"
          class="align-center"
        >
          <template v-slot:prepend>
            <v-btn
              :color="color"
              icon="mdi-minus"
              size="small"
              variant="text"
              @click="decrement"
            ></v-btn>
          </template>

          <template v-slot:append>
            <v-btn
              :color="color"
              icon="mdi-plus"
              size="small"
              variant="text"
              @click="increment"
            ></v-btn>
          </template>
        </v-slider>
      </v-container>

      <v-checkbox
        class="d-inline-flex"
        v-model="localIsAgeConfirmed"
        :rules="[
          (v) => !!v || 'You must confirm that you are 18 years or older',
        ]"
        @change="handleChange"
      >
        <template v-slot:label>
          <span id="checkboxLabel">
            I am 18 years of age or older and agree to the
            <NuxtLink :to="localPath('/terms')">Terms of Service</NuxtLink>.
          </span>
        </template>
      </v-checkbox>
      <p>
        <NuxtLink :to="localPath('/signin')" class="text-decoration-none text-subtitle-2"
          >Already Registered? Sign in Here...</NuxtLink
        >
      </p>
    </v-col>
  </v-row>
</template>

<script setup>
const localPath = useLocalePath();
// Define props
const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  isAgeConfirmed: {
    type: Boolean,
    required: true,
  },
});

// Define emits
const emit = defineEmits(["update:modelValue", "update:isAgeConfirmed"]);

// Reactive age variable, synced with parent
const age = ref(props.modelValue);

// Watch for changes in `age` and emit updated value to the parent
watch(age, (newAge) => {
  emit("update:modelValue", newAge);
});

// Color computed property based on age value
const color = computed(() => {
  if (age.value < 30) return "blue";
  if (age.value < 45) return "green";
  if (age.value < 60) return "orange";
  if (age.value < 80) return "red";
  return "purple";
});

// Animation duration based on age
const animationDuration = computed(() => `${30 / age.value}s`);

// Local state for age confirmation, synced with parent
const localIsAgeConfirmed = ref(props.isAgeConfirmed);

// Watch for changes from parent for age confirmation
watch(
  () => props.isAgeConfirmed,
  (newValue) => {
    localIsAgeConfirmed.value = newValue;
  }
);

// Emit changes to parent when age confirmation is toggled
const handleChange = () => {
  emit("update:isAgeConfirmed", localIsAgeConfirmed.value);
};

// Age increment/decrement functions
function decrement() {
  if (age.value > 18) age.value--;
}

function increment() {
  if (age.value < 80) age.value++;
}
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
</style>
