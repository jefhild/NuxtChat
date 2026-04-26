<template>
  <ProfilesPageShell title-key="pages.profiles.ai.title">
    <HomeProfiles
      :limit="100"
      source="ai"
      title-key="components.home.ai.title"
    />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.ai");
</script>
