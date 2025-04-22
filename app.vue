<script setup lang="ts">
useHead({
  script: [
    {
      children: `
        var _iub = _iub || [];
        _iub.csConfiguration = {
          "siteId": 3996857,
          "cookiePolicyId": 87842418,
          "lang": "en",
          "storage": {
            "useSiteId": true
          }
        };
      `,
      type: 'text/javascript'
    },
    {
      src: "https://cs.iubenda.com/autoblocking/3996857.js",
      async: true
    },
    {
      src: "//cdn.iubenda.com/cs/gpp/stub.js",
      async: true
    },
    {
      src: "//cdn.iubenda.com/cs/iubenda_cs.js",
      async: true,
    }
  ]
});
</script>

<template>
  <NuxtLayout>
    <v-app>
      <NuxtPage />
    </v-app>
  </NuxtLayout>
</template>


