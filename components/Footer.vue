<template>
  <v-footer class="compact-footer">
    <v-row>
      <v-col class="text-center">
        <v-card flat>
          <v-card-text class="compact-footer__content">
            <!-- Footer Content -->
            <NuxtLink :to="localPath('/about')">{{
              $t("components.footer.about")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/faq')">{{
              $t("components.footer.faq")
            }}</NuxtLink>
            |

            <NuxtLink :to="localPath('/terms')">{{
              $t("components.footer.terms")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/privacy')">{{
              $t("components.footer.privacy")
            }}</NuxtLink>
            |
            <NuxtLink :to="localPath('/cookies')">{{
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
                        <NuxtLink :to="localPath('/profiles')">{{
              $t("components.footer.public-profiles")
            }}</NuxtLink>
            |
            <!-- GitHub Icon -->
            <a
              href="https://github.com/jefhild/NuxtChat"
              target="_blank"
              rel="noopener"
            >
              <v-icon>mdi-github</v-icon>
            </a>
            |
            <!-- Instagram Icon -->
            <a
              href="https://www.instagram.com/imchatty_site/"
              target="_blank"
              rel="noopener"
            >
              <v-icon>mdi-instagram</v-icon>
            </a>
            |
            <!-- Facebook Icon -->
            <a
              href="https://www.facebook.com/61585988489093/"
              target="_blank"
              rel="noopener"
            >
              <v-icon>mdi-facebook</v-icon>
            </a>
            |
            <!-- Reddit Icon -->
            <a
              href="https://www.reddit.com/r/imchatty_news/"
              target="_blank"
              rel="noopener"
            >
              <v-icon>mdi-reddit</v-icon>
            </a>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-footer>
</template>

<script setup>
const localPath = useLocalePath();
</script>

<style scoped>
.compact-footer {
  padding: 8px 16px;
}

.compact-footer__content {
  padding: 8px 0;
}

.consent-link {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

@media (max-width: 600px) {
  .compact-footer {
    padding: 6px 12px;
  }

  .compact-footer__content {
    padding: 6px 0;
  }
}
</style>
