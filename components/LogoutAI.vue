<template>
  <v-card class="pb-12">
    <v-container fluid>
      <v-row align="center" justify="center">
        <v-col cols="12" md="6" class="text-center">
          <h2 class="font-weight-bold">{{ joke }}</h2>
          <p class="mt-3">
            Come back anytime. We're excited to have you back.
          </p>
        </v-col>
      </v-row>

      <v-row align="center" justify="center" class="mt-12">
        <v-col cols="10" md="10" class="animation-container">
          <v-row justify="center" no-gutters>
            <v-col class="text-center">
              <v-container class="chat-container">
                <!-- Display the conversation -->
                <transition-group name="chat" tag="div">
                  <!--User response-->
                  <div v-if="!showUserBubble && aiResponse" class="chat-bubble user-message">
                    <v-avatar size="24" class="user-avatar">
                      <v-img src="/images/avatars/anonymous.png" />
                    </v-avatar>
                    {{ previosUserInput }}
                  </div>

                  <p class="chat-bubble bot-message" :key="'bot-message'" v-if="aiResponse">
                    {{aiResponse}}
                    <v-avatar size="32" class="bot-avatar">
                      <v-img src="/robot.png" />
                    </v-avatar>
                  </p>
                  <p class="chat-bubble bot-message" :key="'bot-message'" v-if="mounted && questions[currentQuestionIndex]">
                    {{ questions[currentQuestionIndex] }}
                    <v-avatar size="32" class="bot-avatar">
                      <v-img src="/robot.png" />
                    </v-avatar>
                  </p>
                </transition-group>


                <div v-if="showUserBubble" class="chat-bubble user-message">
                  <v-avatar size="24" class="user-avatar">
                    <v-img src="/images/avatars/anonymous.png" />
                  </v-avatar>
                  {{ previosUserInput }}
                </div>
                <!-- Typing Indicator -->
                <div v-if="isTyping" class="typing-indicator bot-message">
                  <div class="dots"><span></span><span></span><span></span></div>
                  <v-avatar size="32" class="bot-avatar">
                    <v-img src="/robot.png" />
                  </v-avatar>
                </div>

              </v-container>
              <v-text-field v-if="!submittingtoDatabase" variant="outlined" v-model="userInput"
                @keyup.enter="sendMessage" placeholder="Type your response..." append-inner-icon="mdi-send"
                @click:append-inner="sendMessage" />

            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <!-- Home button -->
      <v-row>
        <v-col cols="12" align="center">
          <v-btn color="primary" dark class="mt-4" @click="redirectToLogin">Go to the Home Page</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const { insertFeedback } = useDb();


const router = useRouter();
const authStore = useAuthStore();
const joke = ref("");
const submittingtoDatabase = ref(false);
const userInput = ref("");
const previosUserInput = ref("");
const currentQuestionIndex  = ref(0);
const isTyping = ref(false);
const showUserBubble = ref(false);
const aiResponse = ref("");
const triviaQuestion = ref("");
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

const questions = [
  "Would you like to play a quick game before you go?",
  "",
  "One last question : If you could improve one thing about this site, what would it be?",
];

const redirectToLogin = async () => {
  try {
    const navigationResult = await router.push('/');
    //window.location.reload();
  } catch (error) {
    console.error("Failed to redirect to login page:", error);
  }
};

onMounted(() => {
  mounted.value = true;
  joke.value = logoutJokes[Math.floor(Math.random() * logoutJokes.length)];
});

const sendMessage = async () => {
  isTyping.value = true;
  previosUserInput.value = userInput.value;
  userInput.value = "";
  showUserBubble.value = true;
  switch (currentQuestionIndex.value) {
    case 0:
        //ask ai to create trivia question if answer yes 
      try{
        const response = await $fetch("/api/aiTrivia", {
          method: "POST",
          body: {
            userInput: `I asked the user if they wanted to play a game. Based on their response: "${previosUserInput.value}", return ONLY one of the following:  
                        - A real random trivia question that the user can answer if the user said yes in any way (e.g., "yes", "sure", "okay", "why not", "let's do it").  
                        - The word "Okay" if the user said no or anything unrelated.  
                        Do not include any explanations, just return the trivia question or "Okay".`,
          },
        });

        //If theres an answer back from the AI
        if (response.success && response.aiResponse)
        {
          if (response.aiResponse === "Okay")
          {
            aiResponse.value = "Okay! Maybe next time! ";
            currentQuestionIndex.value++;
          }
          else
          {
            triviaQuestion.value = response.aiResponse;
            aiResponse.value = "Okay! Here's a trivia question for you! : " + response.aiResponse;
          }
        }
      }catch (error){
        console.error("Failed to create trivia question:", error);
      }
      break;
 
    case 1: 
      try
      {
        aiResponse.value = "";
        const response = await $fetch("/api/aiTrivia", {
          method: "POST",
          body: {
            userInput: `I asked the user this trivia question : "${triviaQuestion.value}". Based on their response: "${previosUserInput.value}", return ONLY one of the following:  
                        - the word "okay" if the user answered the trivia question correctly.  
                        - The word sentence sayin "Incorrect! The correct answer is: ..." (... being the correct answert to the question) if the user answered the trivia question incorrectly or said anything unrelated.
                        Do not include any explanations, just return "Okay" or the sentence starting with "Incorrect".`,
          },
        });

        //If theres an answer back from the AI
        if (response.success && response.aiResponse)
        {
          if(response.aiResponse.includes("Incorrect"))
          { 
            aiResponse.value = response.aiResponse;
          }
          else
          {
            aiResponse.value = "Correct! Great job!";
          }
        }
      } catch (error)
      {
        console.error("Failed to verify trivia answer:", error);
      }
      break;
    
    case 2: 
      if (!previosUserInput.value.trim())
      {
        aiResponse.value = "Try again!";
        showUserBubble.value = false;
        isTyping.value = false;
        console.warn("User input is empty. Aborting.");
        return;
      }
      
      submittingtoDatabase.value = true;
      await insertFeedback(previosUserInput.value);
      
    
      aiResponse.value = "Thanks! I'll sure to send it to my boss... if I had one! 😅";  
      break;
  
    default:
      break;
  }

  showUserBubble.value = false;
  currentQuestionIndex.value++;
  isTyping.value = false;
};
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

</style>
