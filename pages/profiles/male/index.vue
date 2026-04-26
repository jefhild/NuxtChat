<template>
  <ProfilesPageShell title-key="pages.profiles.male.title">
    <HomeProfiles :limit="100" gender="male" />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.male");
</script>
