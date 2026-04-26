<template>
  <section class="rowbg rowheight">
    <div class="rowgrid">
      <div class="text-center">
        <template v-if="isAuthenticated">
          Free Anonymous Chat - Users Online
        </template>
        <template v-else>
          {{ $t("pages.home.homeRow1.offlineUsersOnline") }}
        </template>
      </div>

      <div class="rowgrid__spacer" aria-hidden="true">
        <!-- Put an ad here -->
      </div>

      <div class="text-center">
        {{ $t("pages.home.homeRow1.freeAnonymousChat") }}
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();
const isAuthenticated = computed(() => !!authStore.user);
</script>

<style>
.rowbg {
  background-color: #fdfaf6;
}

.rowheight {
  min-height: 80px;
}

.rowgrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 1rem;
  min-height: 80px;
  padding: 0 1rem;
}

.rowgrid__spacer {
  display: none;
}

.colstyle {
  font-family: "poppins", sans-serif;
  font-size: 1rem;
  font-weight: 400;
}

@media (min-width: 768px) {
  .rowgrid__spacer {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }
}

@media (max-width: 767px) {
  .rowgrid {
    grid-template-columns: 1fr;
    padding: 0.75rem 1rem;
  }
}
</style>
