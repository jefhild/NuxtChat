<template>
  <v-footer>
    <v-row>
      <v-col class="text-center">
        <v-card>
          <v-card-text>
            <!-- Footer Content -->
            <!-- <v-row>&copy; 2024 Oliver W. Jones</v-row> -->
            <NuxtLink to="/about">{{ $t("components.footer.about") }}</NuxtLink> |
            <NuxtLink to="/terms">{{ $t("components.footer.terms") }}</NuxtLink> |
            <NuxtLink to="/privacy">{{ $t("components.footer.privacy") }}</NuxtLink> |
            <NuxtLink to="/cookies">{{ $t("components.footer.cookies") }}</NuxtLink> |
            <NuxtLink to="/profiles">{{ $t("components.footer.public-profiles") }}</NuxtLink> |
            <a href="#" class="termly-display-preferences">
              {{ $t("components.footer.consent-preferences") }}
            </a>
            |
            <!-- GitHub Icon -->
            <a
              href="https://github.com/jefhild/NuxtChat"
              target="_blank"
              rel="noopener"
            >
              <v-icon>mdi-github</v-icon>
            </a>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-footer>
</template>
