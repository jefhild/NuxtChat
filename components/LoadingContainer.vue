<template>
  <div class="loading-container">
    <div class="loading-container__inner">
      <div class="loading-container__logo-wrap">
        <img
          src="/images/robot.png"
          alt="ImChatty logo"
          width="40"
          height="40"
          class="loading-container__logo"
        >
      </div>

      <div class="loading-container__bar" aria-hidden="true">
        <span class="loading-container__bar-fill" />
      </div>

      <div class="loading-container__text">
        {{ text || t("components.loadingContainer.loading") }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps({
  text: String,
});
</script>

<style scoped>
.loading-container {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: rgb(var(--color-foreground));
  text-align: center;
}

.loading-container__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-container__logo-wrap {
  display: flex;
  width: 100%;
  justify-content: center;
}

.loading-container__logo {
  opacity: 0.7;
  filter: grayscale(1);
}

.loading-container__bar {
  position: relative;
  width: 200px;
  height: 6px;
  margin-top: 1rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(var(--color-foreground) / 0.16);
}

.loading-container__bar-fill {
  position: absolute;
  inset: 0;
  width: 40%;
  border-radius: inherit;
  background: rgb(var(--color-primary));
  animation: loading-container-slide 1.1s ease-in-out infinite;
}

.loading-container__text {
  width: 100%;
  margin-top: 1rem;
  font-size: 1.125rem;
  font-weight: 500;
}

@keyframes loading-container-slide {
  0% {
    transform: translateX(-120%);
  }

  50% {
    transform: translateX(160%);
  }

  100% {
    transform: translateX(300%);
  }
}
</style>
