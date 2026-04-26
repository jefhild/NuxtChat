<template>
  <ProfilesPageShell title-key="pages.profiles.popular.title">
    <HomeProfiles
      :limit="100"
      source="popular"
      title-key="components.home.most-popular.title"
    />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.popular");
</script>
