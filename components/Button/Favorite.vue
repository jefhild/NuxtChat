<template>
  <button
    type="button"
    class="profile-favorite-btn"
    :class="{ 'is-active': isFavorite }"
    :disabled="isLoading"
    :title="buttonLabel"
    :aria-label="buttonLabel"
    @click.stop="handleFavoriteToggle"
  >
    <i
      :class="[
        'mdi',
        isFavorite ? 'mdi-heart' : 'mdi-heart-outline',
        'profile-favorite-btn__icon',
      ]"
      aria-hidden="true"
    />
  </button>

  <Teleport to="body">
    <Transition name="favorite-login-fade">
      <div
        v-if="loginDialog"
        class="favorite-login-dialog"
        role="presentation"
      >
        <button
          type="button"
          class="favorite-login-dialog__scrim"
          aria-label="Close login prompt"
          @click="loginDialog = false"
        />
        <div
          class="favorite-login-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorite-login-title"
        >
          <h2 id="favorite-login-title" class="favorite-login-dialog__title">
            {{ $t("components.button-favorite.please-log-in") }}
          </h2>
          <p class="favorite-login-dialog__body">
            {{ $t("components.button-favorite.need-log-in") }}
          </p>
          <div class="favorite-login-dialog__actions">
            <button
              type="button"
              class="favorite-login-dialog__button favorite-login-dialog__button--primary"
              @click="redirectToLogin"
            >
              {{ $t("components.button-favorite.log-in") }}
            </button>
            <button
              type="button"
              class="favorite-login-dialog__button favorite-login-dialog__button--secondary"
              @click="loginDialog = false"
            >
              {{ $t("components.button-favorite.cancel") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1"; 
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const { getCountUserFavorites, deleteFavorite, insertFavorite } = useDb();

// Initialize stores and utilities
const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();
// Props
const props = defineProps({
  profile: Object,
});

// Reactive state
const isAuthenticated = ref(false);
const isFavorite = ref(false);
const loginDialog = ref(false);
const isLoading = ref(true);

// Determine if the user is authenticated
const checkAuthStatus = () => {
  isAuthenticated.value = !!authStore.user;
};

const buttonLabel = computed(() =>
  isFavorite.value
    ? t("components.profile-card.remove-favorite")
    : t("components.settings-container.favorites")
);

// Fetch favorite status for the profile
const fetchFavoriteStatus = async () => {
  if (isAuthenticated.value && props.profile) {

    const count = await getCountUserFavorites(authStore.user.id,props.profile.user_id);
    isFavorite.value = count > 0;
    // console.log("Favorite status:", isFavorite.value);

  } else {
    console.log("User not authenticated or profile missing");
  }
};

// Handle the favorite toggle
const handleFavoriteToggle = async () => {
  if (!isAuthenticated.value) {
    loginDialog.value = true;
  } else {
    if (isFavorite.value) {
      await deleteFavorite(authStore.user.id, props.profile.user_id);
    } else {
      await insertFavorite(authStore.user.id, props.profile.user_id);
    }
    isFavorite.value = !isFavorite.value;
  }
};

// Redirect to login
const redirectToLogin = () => {
  router.push(localPath("/signin"));
};

// Run on component mount
onMounted(async () => {
  await authStore.checkAuth(); // Ensure this checks and sets authStore.user
  checkAuthStatus();
  await fetchFavoriteStatus();
  isLoading.value = false;
});
</script>

<style scoped>
.profile-favorite-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #f9a8d4;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, opacity 0.18s ease;
}

.profile-favorite-btn.is-active {
  color: #ec4899;
}

.profile-favorite-btn:hover:not(:disabled),
.profile-favorite-btn:focus-visible {
  background: rgba(236, 72, 153, 0.12);
  outline: none;
}

.profile-favorite-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.profile-favorite-btn__icon {
  font-size: 1.1rem;
  color: currentColor;
}

.favorite-login-dialog {
  position: fixed;
  inset: 0;
  z-index: 2200;
}

.favorite-login-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.64);
}

.favorite-login-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 400px);
  transform: translate(-50%, -50%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.favorite-login-dialog__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.35;
  color: rgb(var(--color-foreground));
}

.favorite-login-dialog__body {
  margin: 0.8rem 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: rgb(var(--color-foreground) / 0.74);
}

.favorite-login-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.favorite-login-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.65rem 0.95rem;
  border-radius: 10px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.favorite-login-dialog__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.favorite-login-dialog__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.favorite-login-dialog__button:hover,
.favorite-login-dialog__button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.favorite-login-fade-enter-active,
.favorite-login-fade-leave-active {
  transition: opacity 160ms ease;
}

.favorite-login-fade-enter-from,
.favorite-login-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .favorite-login-dialog__actions {
    flex-direction: column-reverse;
  }

  .favorite-login-dialog__button {
    width: 100%;
  }
}
</style>
