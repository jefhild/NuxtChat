<template>
  <v-container fluid class="profiles-shell">
    <div class="profiles-header-shell">
      <div class="profiles-header-actions">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          class="profiles-menu-btn"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader
        :text="$t('pages.profiles.otherList.title')"
        :subtitle="$t('pages.profiles.index.subtitle')"
      />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="260"
      class="profiles-drawer"
      aria-label="Profile filters"
    >
      <v-list density="compact" class="profiles-drawer-list text-body-2">
        <v-list-subheader>{{ $t("pages.profiles.index.filters") }}</v-list-subheader>
        <div class="px-3 py-2 d-flex flex-column ga-3">
          <v-list-item :to="localPath('/profiles')">
            <template #prepend>
              <v-icon>mdi-account-multiple</v-icon>
            </template>
            {{ $t("pages.profiles.index.title") }}
          </v-list-item>
          <v-list-item :to="localPath('/profiles/male')">
            <template #prepend>
              <v-icon color="blue">mdi-gender-male</v-icon>
            </template>
            {{ $t("components.profile-container.gender-male") }}
          </v-list-item>
          <v-list-item :to="localPath('/profiles/female')">
            <template #prepend>
              <v-icon color="pink">mdi-gender-female</v-icon>
            </template>
            {{ $t("components.profile-container.gender-female") }}
          </v-list-item>
          <v-list-item :to="localPath('/profiles/other')">
            <template #prepend>
              <v-icon color="purple">mdi-gender-non-binary</v-icon>
            </template>
            {{ $t("components.profile-container.gender-other") }}
          </v-list-item>
        </div>
      </v-list>
    </v-navigation-drawer>

    <v-row>
      <v-col cols="12">
        <HomeProfiles :limit="100" gender="other" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const localPath = useLocalePath();
const filtersOpen = ref(false);

useSeoI18nMeta("profiles.otherList");

onMounted(async () => {
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
});
</script>

<style scoped>
.profiles-shell {
  padding-top: 6px;
}

.profiles-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.profiles-header-shell :deep(.page-header-row) {
  padding-left: 52px;
  box-sizing: border-box;
}

.profiles-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.profiles-menu-btn {
  margin: 0;
}

.profiles-drawer {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
}

.profiles-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}
</style>
