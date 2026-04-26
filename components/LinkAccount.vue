<template>
  <section class="link-account-card">
    <h2 class="link-account-card__title">Link an account</h2>
    <p class="link-account-card__body">Please pick a provider.</p>
    <div class="link-account-card__actions">
      <button type="button" class="link-account-card__button" @click="checkEmail">Email</button>
      <button type="button" class="link-account-card__button" @click="checkGoogle">Google</button>
      <button type="button" class="link-account-card__button" @click="checkFacebook">Facebook</button>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="link-account-fade">
      <div v-if="loginEmailDialog" class="link-account-dialog" role="presentation">
        <button
          type="button"
          class="link-account-dialog__scrim"
          aria-label="Close email link dialog"
          @click="loginEmailDialog = false"
        />
        <div
          class="link-account-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-account-dialog-title"
        >
          <h3 id="link-account-dialog-title" class="link-account-dialog__title">
            Login with Email
          </h3>
          <LoginEmail />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import LoginEmail from "~/components/Login/Email.vue";
import { useDb } from "@/composables/useDB";

const { signInWithOAuth } = useDb();
const loginEmailDialog = ref(false);

const checkGoogle = async () => {
  try {
    await signInWithOAuth("google", "/chat");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

const checkFacebook = async () => {
  try {
    await signInWithOAuth("facebook", "/chat");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

const checkEmail = async () => {
  try {
    loginEmailDialog.value = true;
    return LoginEmail;
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};
</script>

<style scoped>
.link-account-card {
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.1);
}

.link-account-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.link-account-card__body {
  margin: 0.55rem 0 0;
  color: rgb(var(--color-foreground) / 0.74);
}

.link-account-card__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.link-account-card__button {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.link-account-dialog {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.link-account-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.64);
}

.link-account-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 520px);
  transform: translate(-50%, -50%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.link-account-dialog__title {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.link-account-fade-enter-active,
.link-account-fade-leave-active {
  transition: opacity 160ms ease;
}

.link-account-fade-enter-from,
.link-account-fade-leave-to {
  opacity: 0;
}
</style>
