<template>
  <component :is="selectedModelComponent" />
</template>

<script setup>
import LoginFacebook from "@/components/LoginFacebook.vue";
import LoginEmail from "@/components/LoginEmail.vue";
import LoginAnony from "@/components/LoginAnony.vue";
import LoginGoogle from "@/components/LoginGoogle.vue";
import LoginAi from "@/components/LoginAi.vue";

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
    case "LoginAnony":
      return LoginAnony;
    case "LoginAi":
      return LoginAi;
    default:
      return null;
  }
});
</script>
