<template>
  <section class="logout-hero">
    <div class="logout-hero__background" aria-hidden="true" />
    <div class="logout-hero__overlay" aria-hidden="true" />

    <div class="logout-hero__content">
      <div class="logout-hero__copy">
        <h1 class="logout-hero__title">
          {{ joke }}
        </h1>
        <p class="logout-hero__body">
          {{ $t("pages.home.landing_page.title-text2") }}
        </p>

        <div class="logout-hero__actions">
          <NuxtLink
            :to="localPath('/chat')"
            class="logout-hero__button logout-hero__button--primary"
          >
            {{ $t("pages.home.landing_page.cta_button") }}
          </NuxtLink>
          <button
            type="button"
            class="logout-hero__button logout-hero__button--secondary"
            @click="$router.push(localPath('/about'))"
          >
            {{ $t("pages.home.landing_page.learn_more") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const localPath = useLocalePath();

const joke = ref("");

const logoutJokes = [
  "Why did the user log out? Because they needed to cache some sleep! 😴💾",
  "You're logging out? But... we were just getting started! 😢🔄",
  "Logging out already? Don't worry, I'll just buffer my sadness. 😭💡",
  "Leaving so soon? I guess you're just a bit binary about it. 🤖👋",
  "Logging out? Be sure to commit to coming back soon! 💾💙",
  "You're leaving? But who will keep the server company now? 🤖😞",
  "Goodbye! Hope you don't get 404: User Not Found on your way out!🚪❌",
  "Did you hear about the lazy logout button? It just never clicked with anyone! 😂🖱",
  "Logging out? I guess our connection just timed out. ⏳🔌",
  "Remember: Logging out is just a temporary breakpoint in our friendship! 🛑👨‍💻",
];

onMounted(() => {
  joke.value = logoutJokes[Math.floor(Math.random() * logoutJokes.length)];
});
</script>

<style scoped>
.logout-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
}

.logout-hero__background,
.logout-hero__overlay {
  position: absolute;
  inset: 0;
}

.logout-hero__background {
  background:
    linear-gradient(rgb(15 23 42 / 0.3), rgb(15 23 42 / 0.3)),
    url("/images/background2.webp") center / cover no-repeat;
  transform: scale(1.02);
}

.logout-hero__overlay {
  background: rgb(0 0 0 / 0.58);
}

.logout-hero__content {
  position: relative;
  z-index: 1;
  width: min(100%, 72rem);
  padding: 2rem 1rem;
}

.logout-hero__copy {
  width: min(100%, 54rem);
  margin: 0 auto;
  text-align: center;
  color: #fff;
}

.logout-hero__title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.75rem);
  font-weight: 700;
  line-height: 1.15;
}

.logout-hero__body {
  margin: 1rem 0 0;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.7;
  color: rgb(255 255 255 / 0.88);
}

.logout-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.9rem;
  margin-top: 1.75rem;
}

.logout-hero__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0.8rem 1.2rem;
  border-radius: 14px;
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.logout-hero__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.logout-hero__button--secondary {
  border: 1px solid rgb(255 255 255 / 0.72);
  background: transparent;
  color: #fff;
}

.logout-hero__button:hover,
.logout-hero__button:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgb(2 6 23 / 0.24);
  outline: none;
}

@media (max-width: 640px) {
  .logout-hero__actions {
    flex-direction: column;
  }

  .logout-hero__button {
    width: 100%;
  }
}
</style>
