<template>
  <v-footer>
    <v-row>
      <v-col class="text-center">
        <v-card>
          <v-card-text>
            <!-- Footer Content -->
            <!-- <v-row>&copy; 2024 Oliver W. Jones</v-row> -->
            <NuxtLink to="/about">About Us</NuxtLink> |
            <NuxtLink to="/terms">Terms Of Service</NuxtLink> |
            <NuxtLink to="/privacy">Privacy Policy</NuxtLink> |
            <NuxtLink to="/cookies">Cookie Policy</NuxtLink> |
            <NuxtLink to="/profiles">Public Profiles</NuxtLink> |
            <a href="#" class="termly-display-preferences">
              Consent Preferences
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
