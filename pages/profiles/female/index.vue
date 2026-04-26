<template>
  <ProfilesPageShell title-key="pages.profiles.female.title">
    <HomeProfiles :limit="100" gender="female" />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.female");
</script>
