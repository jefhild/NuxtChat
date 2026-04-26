<template>
  <ProfilesPageShell title-key="pages.profiles.otherList.title">
    <HomeProfiles :limit="100" gender="other" />
  </ProfilesPageShell>
</template>

<script setup>
useSeoI18nMeta("profiles.otherList");
</script>
