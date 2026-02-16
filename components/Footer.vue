<template>
  <div class="compact-footer">
    <v-row>
      <v-col class="text-center">
        <v-card flat class="compact-footer__card">
          <v-card-text class="compact-footer__content">
            <!-- Footer Content -->
            <NuxtLink :to="localPath('/about')" class="compact-footer__link">{{
              $t("components.footer.about")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/faq')" class="compact-footer__link">{{
              $t("components.footer.faq")
            }}</NuxtLink>
            |

            <NuxtLink :to="localPath('/terms')" class="compact-footer__link">{{
              $t("components.footer.terms")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/privacy')" class="compact-footer__link">{{
              $t("components.footer.privacy")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/cookies')" class="compact-footer__link">{{
              $t("components.footer.cookies")
            }}</NuxtLink>
            |

            <button
              type="button"
              class="termly-display-preferences consent-link"
              aria-label="Update consent preferences"
            >
              {{ $t("components.footer.consent-preferences") }}
            </button>
            |
            <NuxtLink :to="localPath('/profiles')" class="compact-footer__link">{{
              $t("components.footer.public-profiles")
            }}</NuxtLink>
            |
            <!-- GitHub Icon -->
            <a
              href="https://github.com/jefhild/NuxtChat"
              target="_blank"
              rel="noopener"
              class="compact-footer__icon-link"
            >
              <v-icon>mdi-github</v-icon>
            </a>
            |
            <!-- Instagram Icon -->
            <a
              href="https://www.instagram.com/imchatty_site/"
              target="_blank"
              rel="noopener"
              class="compact-footer__icon-link"
            >
              <v-icon>mdi-instagram</v-icon>
            </a>
            |
            <!-- Facebook Icon -->
            <a
              href="https://www.facebook.com/61585988489093/"
              target="_blank"
              rel="noopener"
              class="compact-footer__icon-link"
            >
              <v-icon>mdi-facebook</v-icon>
            </a>
            |
            <!-- Reddit Icon -->
            <a
              href="https://www.reddit.com/r/imchatty_news/"
              target="_blank"
              rel="noopener"
              class="compact-footer__icon-link"
            >
              <v-icon>mdi-reddit</v-icon>
            </a>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
const localPath = useLocalePath();
</script>

<style scoped>
.compact-footer {
  padding: 4px 14px;
  background: transparent;
  width: 100%;
  display: flex;
  justify-content: center;
}

.compact-footer :deep(.v-row) {
  margin: 0;
  width: 100%;
  justify-content: center;
}

.compact-footer :deep(.v-col) {
  padding: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

.compact-footer__card {
  background: rgba(var(--v-theme-surface), 0.96);
  color: rgba(var(--v-theme-on-surface), 0.92);
  border: none;
  border-radius: 10px;
  margin: 0 auto;
}

.compact-footer__content {
  padding: 4px 0;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.compact-footer__link {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  border: none !important;
  box-shadow: none !important;
  outline: none;
}

.compact-footer__icon-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  border: none !important;
  box-shadow: none !important;
  outline: none;
  background: transparent !important;
  padding: 0;
}

.compact-footer__icon-link :deep(.v-icon) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.consent-link {
  background: none;
  border: none;
  color: rgba(var(--v-theme-on-surface), 0.92);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

:global(.v-theme--dark .compact-footer__card) {
  background: rgba(24, 30, 40, 0.96);
  color: rgba(248, 250, 252, 0.92);
  border: none;
}

:global(.v-theme--dark .compact-footer__content) {
  color: rgba(248, 250, 252, 0.92);
}

:global(.v-theme--dark .compact-footer__link),
:global(.v-theme--dark .compact-footer__icon-link) {
  color: #a5b4fc;
}

:global(.v-theme--dark .consent-link) {
  color: #e2e8f0;
}

@media (max-width: 600px) {
  .compact-footer {
    padding: 4px 10px;
  }

  .compact-footer__content {
    padding: 4px 0;
  }
}
</style>
