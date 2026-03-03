<template>
  <div class="compact-footer">
    <div class="compact-footer__row">
      <div class="compact-footer__col text-center">
        <div class="compact-footer__card">
          <div class="compact-footer__content">
            <template
              v-for="(link, index) in footerPrimaryLinks"
              :key="link.path"
            >
              <NuxtLink :to="localPath(link.path)" class="compact-footer__link">{{
                $t(link.labelKey)
              }}</NuxtLink>
              <span v-if="index < footerPrimaryLinks.length - 1">|</span>
            </template>
            |
            <button
              type="button"
              class="termly-display-preferences consent-link"
              aria-label="Update consent preferences"
            >
              {{ $t("components.footer.consent-preferences") }}
            </button>
            |
            <NuxtLink
              :to="localPath(footerProfilesLink.path)"
              class="compact-footer__link"
            >
              {{ $t(footerProfilesLink.labelKey) }}
            </NuxtLink>
            |
            <template v-for="(social, index) in FOOTER_SOCIAL_LINKS" :key="social.href">
              <a
                :href="social.href"
                target="_blank"
                rel="noopener"
                class="compact-footer__icon-link"
                :aria-label="social.ariaLabel"
              >
                <i :class="`mdi ${social.icon}`" aria-hidden="true" />
              </a>
              <span v-if="index < FOOTER_SOCIAL_LINKS.length - 1">|</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  FOOTER_INTERNAL_LINKS,
  FOOTER_SOCIAL_LINKS,
} from "@/constants/footerLinks";

const localPath = useLocalePath();
const footerProfilesLink = FOOTER_INTERNAL_LINKS.find(
  (link) => link.path === "/profiles"
) || { path: "/profiles", labelKey: "components.footer.public-profiles" };
const footerPrimaryLinks = FOOTER_INTERNAL_LINKS.filter(
  (link) => link.path !== "/profiles"
);
</script>

<style scoped>
.compact-footer {
  padding: 4px 14px;
  background: transparent;
  width: 100%;
  display: flex;
  justify-content: center;
}

.compact-footer__row {
  margin: 0;
  width: 100%;
  justify-content: center;
  display: flex;
}

.compact-footer__col {
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
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2px 6px;
  text-align: center;
}

.compact-footer__link {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  border: none !important;
  box-shadow: none !important;
  outline: none;
  overflow-wrap: anywhere;
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

.compact-footer__icon-link i {
  font-size: 1.15rem;
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
  overflow-wrap: anywhere;
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
