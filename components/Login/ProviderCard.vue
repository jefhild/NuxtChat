<template>
  <section class="login-provider-card">
    <header class="login-provider-card__header">
      <h2 class="login-provider-card__title">{{ t(titleKey) }}</h2>
    </header>

    <div class="login-provider-card__body">
      <LoginOAuthButton
        :disabled="!isAgeConfirmed"
        :provider="provider"
        :label="label"
        :icon="icon"
        :color="color"
      />

      <label class="login-provider-card__check">
        <input v-model="isAgeConfirmed" type="checkbox">
        <span>{{ t(ageTextKey) }}</span>
      </label>

      <p class="login-provider-card__legal">
        {{ t(registeredInfoKey) }}
        <NuxtLink :to="localPath('/terms')">
          {{ t("components.loginEmail.terms") }}
        </NuxtLink>
      </p>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";

defineProps({
  titleKey: { type: String, required: true },
  ageTextKey: { type: String, required: true },
  registeredInfoKey: { type: String, required: true },
  provider: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: "" },
  color: { type: String, default: "primary" },
});

const { t } = useI18n();
const localPath = useLocalePath();
const isAgeConfirmed = ref(false);
</script>

<style scoped>
.login-provider-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-provider-card__title {
  margin: 0;
  text-align: center;
  font-size: clamp(1.25rem, 1vw + 1rem, 1.5rem);
  font-weight: 650;
  color: rgb(var(--color-foreground) / 0.94);
}

.login-provider-card__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-provider-card__check {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
}

.login-provider-card__check input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  accent-color: rgb(var(--color-primary));
}

.login-provider-card__legal {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.74);
  font-size: 0.8rem;
  line-height: 1.6;
  font-style: italic;
}

.login-provider-card__legal a {
  color: rgb(var(--color-primary));
}
</style>
