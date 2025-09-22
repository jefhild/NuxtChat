<template>
  <!-- <v-card class="pb-12"> -->
  <v-container fluid>
    <v-row>
      <v-col>
        <v-sheet
          height="100vh"
          class="d-flex align-center justify-center position-relative"
        >
          <!-- Background Image -->
          <v-img
            src="/public/images/background.png"
            cover
            height="80%"
            width="80%"
            class="position-absolute"
            style="z-index: 1"
          ></v-img>

          <!-- Overlay Mask -->
          <div
            class="position-absolute"
            style="
              background-color: rgba(0, 0, 0, 0.6);
              z-index: 2;
              height: 100%;
              width: 100%;
            "
          ></div>

          <!-- Foreground Content -->
          <v-container class="text-center" style="z-index: 3">
            <v-row justify="center">
              <v-col cols="12" md="8">
                <h1 class="text-h4 text-md-h2 font-weight-bold mb-4 text-white">
                  <!-- {{ $t("pages.home.landing_page.title-text") }} -->
                  {{ joke }}
                </h1>
                <p class="text-body-1 text-md-subtitle-1 mb-6 text-white">
                  {{ $t("pages.home.landing_page.title-text2") }}
                </p>

                <v-row justify="center" align="center" class="mx-0" dense>
                  <v-col cols="12" sm="auto" class="mb-2 mb-sm-0">
                    <v-btn color="primary" block>
                      <NuxtLink
                        :to="localPath('/chat')"
                        class="text-dec-none text-white"
                      >
                        {{ $t("pages.home.landing_page.cta_button") }}
                      </NuxtLink>
                    </v-btn>
                  </v-col>
                  <v-col cols="12" sm="auto">
                    <v-btn
                      color="white"
                      variant="outlined"
                      block
                      @click="$router.push(localPath('/about'))"
                    >
                      {{ $t("pages.home.landing_page.learn_more") }}
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-container>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
  <!-- </v-card> -->
</template>

<script setup>
const localPath = useLocalePath();

import { onMounted } from "vue";

const joke = ref("");
const mounted = ref(false);

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
  mounted.value = true;
  joke.value = logoutJokes[Math.floor(Math.random() * logoutJokes.length)];
});


</script>

<style scoped>
.animation-container {
  position: relative;
  height: 100%;
  width: 100%;
  border-radius: 20px;
  border: 2px solid gray;
}

.chat-container {
  max-width: auto;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.chat-bubble {
  display: flex;
  align-items: left;
  gap: 10px;
  padding: 12px;
  margin: 8px 0;
  border-radius: 10px;
  max-width: 80%;
  font-size: 16px;
  position: relative;
}

.bot-message {
  color: black;
  text-align: right;
  margin-left: auto;
  max-width: fit-content;
  display: flex;
  align-items: center;
  padding: 2%;
  border-radius: 10px;
  word-wrap: break-word;
  white-space: pre-wrap;
  position: relative;
}

.bot-message::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -10px;
  width: 0;
  height: 0;
  border-left: 11px solid rgba(0, 150, 255, 0.2);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  transform: translateY(-50%);
}

.user-message {
  color: black;
  text-align: left;
  max-width: fit-content;
  padding: 2%;
  border-radius: 10px;
  word-wrap: break-word;
  white-space: pre-wrap;
  position: relative;
}

.user-message::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -10px;
  /* Position the tail to the left of the bubble */
  width: 0;
  height: 0;
  border-right: 10px solid rgba(70, 169, 101, 0.2);
  /* Tail color */
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  transform: translateY(-50%);
}

.bot-avatar {
  background-color: rgba(0, 150, 255, 0.6);
  padding: 4px;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  padding: 10px;
  border-radius: 10px;
  width: fit-content;
  margin-left: auto;
}

.dots span {
  width: 8px;
  height: 8px;
  margin: 0 2px;
  background: black;
  border-radius: 50%;
  display: inline-block;
  animation: blink 1.5s infinite ease-in-out both;
}

.dots span:nth-child(1) {
  animation-delay: 0s;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0% {
    opacity: 0.3;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.3;
  }
}

.chat-enter-active {
  animation: slide-in 0.4s ease-out;
}

.chat-move {
  transition: transform 0.4s ease;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.text-dec-none {
  text-decoration: none !important;
}
</style>
