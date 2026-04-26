<template>
  <ProfilesPageShell title-key="pages.profiles.recent.title">
    <HomeProfiles
      :limit="100"
      source="recent"
      title-key="components.home.recent.title"
    />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.recent");
</script>
