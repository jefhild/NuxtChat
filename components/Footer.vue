<template>
  <v-footer>
    <v-row>
      <v-col class="text-center">
        <v-card>
          <v-card-text>
            <!-- Footer Content -->
            &copy; 2024 Oliver W. Jones
            <NuxtLink to="/about">About Us</NuxtLink> |
            <NuxtLink to="/terms">Terms Of Service</NuxtLink> |
            <NuxtLink to="/privacy">Privacy Policy</NuxtLink> |
            <!-- GitHub Icon -->
            <a href="https://github.com/jefhild/NuxtChat" target="_blank" rel="noopener">
              <v-icon>mdi-github</v-icon>
            </a> |
            <NuxtLink to="/cookiepolicy">Cookie Policy</NuxtLink> |

            <a href="#" class="termly-display-preferences">
              Consent Preferences
            </a>

          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-footer>
</template>