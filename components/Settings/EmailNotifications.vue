<template>
  <v-card class="mx-auto mt-4" flat>
    <v-card-text>
      <div class="text-subtitle-1 font-weight-medium mb-2">
        {{ $t("pages.settings.emailNotifications.title") }}
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ $t("pages.settings.emailNotifications.subtitle") }}
      </p>

      <v-alert v-if="authStore.authStatus !== 'authenticated'" type="info" variant="tonal">
        {{ $t("components.settings-container.registered-only") }}
      </v-alert>

      <div v-else>
        <div class="d-flex align-center">
          <v-icon class="mr-3 text-medium-emphasis">mdi-calendar-week</v-icon>
          <v-switch
            v-model="digestEnabled"
            inset
            class="mt-2"
            color="primary"
            :label="$t('pages.settings.emailNotifications.weekly_digest_label')"
            :disabled="saving"
            hide-details
            @update:model-value="savePreference"
          />
        </div>
        <p class="text-caption text-medium-emphasis ml-9 mt-n2 mb-2">
          {{ $t("pages.settings.emailNotifications.weekly_digest_description") }}
        </p>

        <v-alert
          v-if="saveError"
          type="error"
          variant="tonal"
          class="mt-3"
          density="compact"
        >
          {{ saveError }}
        </v-alert>

        <p class="text-caption text-medium-emphasis mt-4">
          {{ $t("pages.settings.emailNotifications.email_on_file") }}
          <strong>{{ maskedEmail }}</strong>
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();

const digestEnabled = ref(true);
const saving = ref(false);
const saveError = ref(null);

const maskedEmail = computed(() => {
  const email = authStore.user?.email ?? "";
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) + "***" : "***";
  return `${visible}@${domain}`;
});

onMounted(() => {
  if (authStore.userProfile?.email_digest_enabled !== undefined) {
    digestEnabled.value = authStore.userProfile.email_digest_enabled;
  }
});

async function savePreference(value) {
  saving.value = true;
  saveError.value = null;
  try {
    const res = await $fetch("/api/profile/email-preferences", {
      method: "PATCH",
      body: { email_digest_enabled: value },
    });
    if (authStore.userProfile) {
      authStore.userProfile.email_digest_enabled = res.email_digest_enabled;
    }
  } catch (err) {
    saveError.value = err?.data?.error ?? "Failed to save preference.";
    digestEnabled.value = !value;
  } finally {
    saving.value = false;
  }
}
</script>
