<template>
  <v-container>
    <v-row class="mt-3 mb-3">
      <v-col cols="12" sm="4" order="1" order-sm="1">
        <v-row no-gutters>
          <v-col>
            <p class="text-center green-text-poppins mb-2">
              <!-- {{ rowCount }} users online -->
            </p>
            <v-card>
              <v-card-title
                ><h1 class="green--text-h1">
                  {{ $t("components.home.main.sign-in") }}
                </h1></v-card-title
              >
              <v-card-text>
                <div class="signin-list">
                  <v-btn
                    v-for="provider in providerButtons"
                    :key="provider.component"
                    class="signin-btn text-blue"
                    variant="plain"
                    :aria-label="$t(provider.labelKey)"
                    @click="switchModel(provider.component)"
                  >
                    <v-icon
                      :icon="provider.icon"
                      :color="provider.iconColor"
                      class="signin-icon"
                    />
                    <span class="green--text-h2 signin-label">
                      {{ $t(provider.labelKey) }}
                    </span>
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <!-- Second Column: Main Content -->
      <v-col cols="12" sm="8" order="2" order-sm="2">
        <v-card :class="{ 'highlight-card': highlight }">
          <v-card-text>
            <LoginContainer1 :selectedModel="selectedModel" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const discordIconPath =
  "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.007-.1273c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.0991.246.1981.3728.2924a.077.077 0 01-.006.1273c-.598.3514-1.2205.6433-1.8733.8919a.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9565-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.4189 0 1.3333-.9565 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9564-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1569 2.4189 0 1.3333-.946 2.419-2.1569 2.419z";

const providerButtons = [
  {
    component: "LoginGoogle",
    labelKey: "components.home.main.google",
    icon: "mdi-google",
    iconColor: "#4285F4",
  },
  {
    component: "LoginFacebook",
    labelKey: "components.home.main.facebook",
    icon: "mdi-facebook",
    iconColor: "#1877F2",
  },
  {
    component: "LoginGitHub",
    labelKey: "components.home.main.github",
    icon: "mdi-github",
    iconColor: "#24292e",
  },
  {
    component: "LoginDiscord",
    labelKey: "components.home.main.discord",
    icon: [discordIconPath],
    iconColor: "#5865F2",
  },
  {
    component: "LoginEmail",
    labelKey: "components.home.main.email",
    icon: "mdi-email-outline",
    iconColor: "#335a4e",
  },
];

const highlight = ref(false);
const selectedModel = ref(providerButtons[0].component);

const switchModel = (model) => {
  selectedModel.value = model;
  // Trigger highlight
  highlight.value = false;
  requestAnimationFrame(() => {
    highlight.value = true;
  });
};
</script>

<style scoped>
.image-shadow {
  box-shadow: 0 4px 6px rgb(186, 214, 174); /* Adjust the shadow here */
}

.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: clamp(1.5rem, 2vw + 1rem, 2.2rem);
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.imchattyLogo {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgb(80, 51, 90);
}

.green-text-poppins {
  font-family: "poppins", sans-serif;
  color: rgb(51, 90, 78);
}

.green--text-h2 {
  font-family: "poppins", sans-serif;
  font-size: clamp(0.95rem, 1.2vw + 0.6rem, 1.15rem);
  font-weight: 500;
  color: rgb(51, 90, 78);
}

.signin-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.signin-btn {
  justify-content: flex-start;
  gap: 0.75rem;
  padding-inline-start: 0;
  padding-inline-end: 0;
  text-transform: none;
  width: 100%;
}

.signin-icon {
  font-size: 1.5rem;
}

@media (max-width: 600px) {
  .signin-list {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    column-gap: 0.75rem;
    row-gap: 0.5rem;
  }

  .signin-btn {
    justify-content: center;
    width: 3rem;
    height: 3rem;
    padding: 0;
    border-radius: 999px;
  }

  .signin-label {
    display: none;
  }
}

.highlight-card {
  animation: pulse-highlight 0.4s ease;
}

@media (max-width: 960px) {
  .green--text-h1 {
    font-size: 1.75rem;
  }
  .green--text-h2 {
    font-size: 1rem;
  }
}

@media (max-width: 600px) {
  .green--text-h1 {
    font-size: 1.4rem;
  }
  .green--text-h2 {
    font-size: 0.95rem;
  }
}

@keyframes pulse-highlight {
  0% {
    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 10px rgba(51, 90, 78, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 rgba(0, 255, 0, 0);
    transform: scale(1);
  }
}
</style>
