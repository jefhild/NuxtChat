<template>
  <component :is="selectedModelComponent" />
</template>

<script setup>
import LoginFacebook1 from "~/components/Login/Facebook1.vue";
import LoginEmail from "~/components/Login/Email.vue";
import LoginGoogle1 from "~/components/Login/Google1.vue";
import LoginGitHub from "~/components/Login/GitHub.vue";

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
      console.log("[LoginContainer1] selectedModel is LoginGoogle");
      return LoginGoogle1;
    case "LoginFacebook":
      return LoginFacebook1;
    // case "LoginEmail":
    //   return LoginEmail;
    case "LoginGitHub":
      console.log("[LoginContainer1] selectedModel is LoginGithub");
      return LoginGitHub;
    default:
      return null;
  }
});
</script>
