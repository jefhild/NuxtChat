<template>
  <component :is="selectedModelComponent" />
</template>

<script setup>
import LoginFacebook from "@/components/LoginFacebook.vue";
import LoginEmail from "@/components/LoginEmail.vue";
import LoginGoogle from "@/components/LoginGoogle.vue";

const props = defineProps({
  selectedModel: {
    type: String,
    required: true,
  },
});

const { selectedModel } = toRefs(props);

const selectedModelComponent = computed(() => {
  switch (selectedModel.value) {
    case "LoginGoogle":
      return LoginGoogle;
    case "LoginFacebook":
      return LoginFacebook;
    case "LoginEmail":
      return LoginEmail;
    default:
      return null;
  }
});
</script>
