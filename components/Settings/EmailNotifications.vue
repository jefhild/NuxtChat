<template>
  <section class="settings-section-card mx-auto mt-4">
      <div class="settings-section-card__title">
        {{ $t("pages.settings.emailNotifications.title") }}
      </div>
      <p class="settings-section-card__subtitle">
        {{ $t("pages.settings.emailNotifications.subtitle") }}
      </p>

      <div v-if="authStore.authStatus !== 'authenticated'" class="settings-status-alert settings-status-alert--info">
        {{ $t("components.settings-container.registered-only") }}
      </div>

      <div v-else>
        <div class="settings-toggle-row">
          <i class="mdi mdi-calendar-week settings-toggle-row__icon" aria-hidden="true" />
          <label class="settings-switch">
            <input
              v-model="digestEnabled"
              type="checkbox"
              :disabled="saving"
              @change="savePreference(digestEnabled)"
            >
            <span>{{ $t('pages.settings.emailNotifications.weekly_digest_label') }}</span>
          </label>
        </div>
        <p class="settings-helper-text">
          {{ $t("pages.settings.emailNotifications.weekly_digest_description") }}
        </p>

        <div
          v-if="saveError"
          class="settings-status-alert settings-status-alert--error mt-3"
        >
          {{ saveError }}
        </div>

        <p class="settings-footnote">
          {{ $t("pages.settings.emailNotifications.email_on_file") }}
          <strong>{{ maskedEmail }}</strong>
        </p>
      </div>
  </section>
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

<style scoped>
.settings-section-card {
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
}

.settings-section-card__title {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.settings-section-card__subtitle,
.settings-helper-text,
.settings-footnote {
  color: rgb(var(--color-foreground) / 0.72);
  line-height: 1.6;
}

.settings-section-card__subtitle {
  margin: 0 0 1rem;
  font-size: 0.95rem;
}

.settings-toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.settings-toggle-row__icon {
  margin-top: 0.2rem;
  color: rgb(var(--color-foreground) / 0.6);
}

.settings-switch {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgb(var(--color-foreground) / 0.86);
}

.settings-switch input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.2rem;
  accent-color: rgb(var(--color-primary));
}

.settings-helper-text {
  margin: 0.25rem 0 0;
  padding-left: 2rem;
  font-size: 0.8rem;
}

.settings-footnote {
  margin: 1rem 0 0;
  font-size: 0.8rem;
}

.settings-status-alert {
  padding: 0.8rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
}

.settings-status-alert--info {
  background: rgb(var(--color-info) / 0.12);
  border-color: rgb(var(--color-info) / 0.22);
  color: rgb(var(--color-info));
}

.settings-status-alert--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}
</style>
