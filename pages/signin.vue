<template>
  <HomeMain
    v-if="['unauthenticated', 'guest', 'onboarding'].includes(auth.authStatus)"
  />

  <section
    v-else-if="auth.authStatus === 'anon_authenticated'"
    class="signin-link-shell mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 sm:px-6"
  >
    <article class="signin-link-card">
      <h2 class="signin-link-card__title">
        {{ $t("components.profile-email-link.prompt") }}
      </h2>
      <p class="signin-link-card__body">
        {{ $t("components.profile-email-link.dialog-description") }}
      </p>
      <div class="signin-link-card__actions">
        <button type="button" class="signin-link-card__button" @click="goLinkEmail">
          {{ $t("components.profile-email-link.cta") }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
const auth = useAuthStore();
const localePath = useLocalePath();

function goLinkEmail() {
  navigateTo({ path: localePath("/settings"), query: { linkEmail: "1" } });
}

useSeoI18nMeta("signin", {
  robots: "noindex,nofollow",
});
</script>

<style scoped>
.signin-link-card {
  width: min(100%, 520px);
  padding: 1.5rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.1);
}

.signin-link-card__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.signin-link-card__body {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgb(var(--color-foreground) / 0.72);
}

.signin-link-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.signin-link-card__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.7rem 1rem;
  border: 0;
  border-radius: 12px;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.signin-link-card__button:hover,
.signin-link-card__button:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.12);
  outline: none;
}
</style>
