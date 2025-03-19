<template>
  <v-card width="650" class="mx-auto">
    <v-card-title class="headline text-center mb-4">Create Your Anonymous Profile</v-card-title>
    <v-card-text>
      <p class="pb-4">
        Please follow the instructions below to create your anonymous profile.
      </p>

      <v-row v-if="submittingtoDatabase" no-gutters>
        <v-col class="text-center">
          <v-progress-circular indeterminate color="primary" size="64" />
        </v-col>
      </v-row>
      <v-row v-else no-gutters>
        <v-col class="text-center">
          <v-container class="chat-container">
            <v-progress-linear :model-value="(currentQuestionIndex / questions.length) * 100" color="light-blue"
              height="10" rounded style="width: 100%" />
            <!-- Display the conversation -->
            <transition-group name="chat" tag="div" v-if="messages.length">
              <!--User response-->
              <div v-if="userInputValue" class="chat-bubble user-message">
                <v-avatar size="24" class="user-avatar">
                  <v-img src="/images/avatars/anonymous.png" />
                </v-avatar>
                {{ userInputValue }}
              </div>

              <p v-for="(message, index) in messages" :key="message.id" :class="[
                  'chat-bubble',
                  message.role === 'bot' ? 'bot-message' : 'user-message',
                  {
                    'current-question':
                      index === currentQuestionIndex && message.role === 'bot',
                  },
                ]">
                {{ message.text }}

                <v-avatar size="32" class="bot-avatar">
                  <v-img src="/robot.png" />
                </v-avatar>
              </p>
            </transition-group>

            <div v-if="showUserBubble" class="chat-bubble user-message">
              <v-avatar size="24" class="user-avatar">
                <v-img src="/images/avatars/anonymous.png" />
              </v-avatar>
              {{ userInput }}
            </div>

            <!-- Typing Indicator -->
            <div v-if="isTyping" class="typing-indicator bot-message">
              <div class="dots"><span></span><span></span><span></span></div>
              <v-avatar size="32" class="bot-avatar">
                <v-img src="/robot.png" />
              </v-avatar>
            </div>
          </v-container>
          <v-text-field v-if="showInputField" ref="inputField" variant="outlined" v-model="userInput"
            @keyup.enter="sendMessage" placeholder="Type your response..." :disabled="isLoading"
            append-inner-icon="mdi-send" @click:append-inner="sendMessage" />
        </v-col>
      </v-row>
      <v-row><v-col>
          <v-btn color="primary" v-if="showCreateProfileButton" @click="submitToDatabase">
            Create Profile
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import useAgeMapper from "@/composables/useAgeMapper";
import useGenderMapper from "@/composables/useGenderMapper";
import useStatusMapper from "@/composables/useStatusMapper";
import useAvatarMapper from "@/composables/useAvatarMapper";

const authStore = useAuthStore();
const router = useRouter();
const supabase = useSupabaseClient();
const isLoading = ref(false);
const submittingtoDatabase = ref(false);
const inputField = ref(null); // Reference to the input field
const mappedDisplayName = ref(null);
const mappedGender = ref(null);
const mappedStatus = ref(null);
const mappedAge = ref(null);
const mappedBio = ref(null);

const { classifyGender } = useGenderMapper();
const { classifyStatus } = useStatusMapper();
const { classifyAge } = useAgeMapper();
const { getAvatarUrl } = useAvatarMapper();

// State variables
const messages = ref([]);
const questions = ref([
  "What would you like to use as your pseudo?",
  "Are you a man, a woman, or something else?",
  "How old are you?",
  "Are you married, single, separated, or maybe it's complicated?",
  "Give us some keywords so we could generate a bio for you.",
]);
const userResponses = ref({
  name: "",
  sex: "",
  age: "",
  status: "",
  bio: "",
});
const userInput = ref("");
const userInputValue = ref("");
const currentQuestionIndex = ref(0);
const showCreateProfileButton = ref(false);
const showInputField = ref(true); // Determines the visibility of the input field
const isTyping = ref(false);
const showUserBubble = ref(false);

const questionKeyMap = {
  0: "name",
  1: "sex",
  2: "age",
  3: "status",
  4: "bio",
};

let messageCounter = 0; // Ensure unique keys for messages

// Load the first question on mount
onMounted(async () => {
  messages.value = [
    { id: messageCounter++, role: "bot", text: questions.value[0] },
  ];
  await nextTick(); // Ensure the DOM has fully rendered before focusing
  focusInput(); // Set focus to the input field
});

// Update messages and handle visibility
const updateMessages = (aiResponse, nextQuestion) => {
  messages.value = [
    { id: messageCounter++, role: "bot", text: aiResponse },
    ...(nextQuestion
      ? [{ id: messageCounter++, role: "bot", text: nextQuestion }]
      : []),
  ];
  showInputField.value = nextQuestion !== ""; // Hide input if there’s no next question
  if (showInputField.value) {
    focusInput(); // Refocus input field if it's visible
  }
};

// Focus on the input field
const focusInput = async () => {
  await nextTick(); // Wait for DOM updates
  if (inputField.value) {
    inputField.value.focus();
  }
};

// Validate user response
const validateResponse = async (index, input) => {
  // // Check AI response for invalid patterns before specific validation cases
  // const aiValidation = validateAIResponse(input);
  // if (!aiValidation.valid) {
  //   return aiValidation; // Return error if AI response is invalid
  // }

  var payload = {};

  switch (index) {
    case 0: // Pseudo validation
      //Do it with AI
      //If its hateful or more than one word ask AI to give us error message, else return the pseudo
      try {
        const response = await $fetch("/api/aiRegistration", {
          method: "POST",
          body: {
            userMessage: `Extract a pseudonym from the user input.  
									- If the input is a sentence requesting a pseudonym (e.g., "I want my pseudonym to be X"), extract only the single-word pseudonym.  
									- If the input itself is already a multi-word pseudonym (e.g., "Dark Lord"), return this exact error message: "Your pseudonym must be a single word."  
									- If the input contains hate speech or inappropriate words, return an error message explaining why.  
									- Otherwise, return only the valid pseudonym, with no additional text, no "" and no punctuation.  
										User input: ${input}`,
            currentResponses: userResponses.value,
            currentQuestionIndex: currentQuestionIndex.value,
            questions: questions.value,
          },
        });

        //If theres an answer back from the AI
        if (response.success && response.aiResponse) {
          const userPseudo = response.aiResponse.trim();

          //Returning that its hateful/inapropriate or not one word
          if (userPseudo.split(" ").length > 1)
            return { valid: false, error: userPseudo };

          //If the ai response is one word (a pseudonym that isnt hateful etc...)
          if (userPseudo.length < 3 || userPseudo.length > 12) {
            return {
              valid: false,
              error: "Your pseudo must be between 3 and 12 characters.",
            };
          }

          // Check if the username already exists
          console.log("Checking if username exists:", userPseudo);
          if (await checkUsernameExists(userPseudo)) {
            return {
              valid: false,
              error: "This pseudo is already taken. Please choose another one.",
            };
          }

          mappedDisplayName.value = userPseudo;
          //All is good
          return { valid: true };
        }
      } catch (error) {
        console.error("Error fetching AI response:", error);
      }

      return {
        valid: false,
        error:
          "An error occured while validating the pseudo. Please enter your pseudo again",
      };

    case 1: //Gender validation
      const gender = classifyGender(input);
      mappedGender.value = gender;
      if (mappedGender.value === 4) {
        return { valid: false, error: 'Please enter a real gender or "other"' };
      }
      userResponses.value.sex = input;
      return { valid: true };

    case 2: //Age validation
      //Verifying the input using AI
      payload = {
        userMessage: `I need to extract information about age from user input that is : " + ${input} . Give me in response, a single number of what the user inputted`,
        currentResponses: userResponses.value,
        currentQuestionIndex: currentQuestionIndex.value,
        questions: questions.value,
      };

      try {
        const response = await $fetch("/api/aiRegistration", {
          method: "POST",
          body: payload,
        });

        if (response.success && response.aiResponse) {
          const ageValidation = classifyAge(response.aiResponse);
          if (!ageValidation.valid) {
            return { valid: false, error: ageValidation.error };
          }
          mappedAge.value = ageValidation.mappedAge;
          userResponses.value.age = input;

          return { valid: true };
        }
      } catch (error) {
        console.error("Error fetching AI response:", error);
      }

    case 3: //Status validation
      const status = classifyStatus(input);
      mappedStatus.value = status;
      userResponses.value.status = input;
      return { valid: true };

    case 4: //Bio validation
      const bio = input.trim();

      if (bio.split(" ").length < 5) {
        return { valid: false, error: "You must at least give out 5 keywords" };
      }

      payload = {
        userMessage: `Based on the following keywords provided by the user: "${bio}" , 
				generate a short and engaging three-sentence biography that captures their personality, interests, and background. Speak in the first person as if you were the user.
				If in any way the user input is inappropriate, hateful or contains any kind of inappropriate content, return the word and only the word "inappropriate".`,
        currentResponses: userResponses.value,
        currentQuestionIndex: currentQuestionIndex.value,
        questions: questions.value,
      };

      try {
        const response = await $fetch("/api/aiRegistration", {
          method: "POST",
          body: payload,
        });

        if (response.success && response.aiResponse) {
          if (response.aiResponse.trim() == "inappropriate") {
            return { valid: false, error: "Please re-enter other keywords" };
          }

          mappedBio.value = response.aiResponse.trim();
          console.log("Mapped Bio:", mappedBio.value);
          return { valid: true };
        }
      } catch (error) {
        console.error("Error fetching AI response:", error);
      }

    default:
      return { valid: true };
  }
};
const checkUsernameExists = async (displayName) => {
  try {
    const { data, error } = await supabase
      .from("profiles") // Replace with your table name
      .select("displayname", { head: false }) // Select the correct field
      .eq("displayname", displayName) // Match on displayname
      .limit(1) // Limit to one row
      .maybeSingle(); // Fetch a single row

    if (error && error.code !== "PGRST116") {
      console.error("Error checking displayname:", error);
      return false;
    }

    return !!data; // Return true if displayname exists, false otherwise
  } catch (err) {
    console.error("Unexpected error while checking displayname:", err);
    return false;
  }
};

const specificQuestionIndex = 4; // Specify the index of the question to store AI response

const sendMessage = async () => {
  isLoading.value = true;
  isTyping.value = true;
  showUserBubble.value = true;
  if (!userInput.value.trim()) {
    console.warn("User input is empty. Aborting.");
    return;
  }

  const currentKey = questionKeyMap[currentQuestionIndex.value];
  if (!currentKey) {
    console.warn("Invalid question index.");
    return;
  }

  // Validate the response
  const validation = await validateResponse(
    currentQuestionIndex.value,
    userInput.value.trim()
  );

  if (!validation.valid) {
    // Display validation error and do not proceed to the next question
    updateMessages(
      validation.error,
      questions.value[currentQuestionIndex.value]
    );
    userInput.value = ""; // Clear input for retry
    showUserBubble.value = false;
    isLoading.value = false;
    isTyping.value = false;
    return;
  }

  // Prepare payload for AI API
  const payload = {
    userMessage: userInput.value.trim(),
    currentResponses: userResponses.value,
    currentQuestionIndex: currentQuestionIndex.value,
    questions: questions.value,
  };

  try {
    const response = await $fetch("/api/aiRegistration", {
      method: "POST",
      body: payload,
    });

    if (response.success && response.aiResponse) {
      var aiResponse = response.aiResponse;
      userResponses.value[currentKey] = userInput.value.trim(); // Save user input for the questions

      // Determine the next question or finish
      const nextQuestion =
        currentQuestionIndex.value < questions.value.length - 1
          ? questions.value[currentQuestionIndex.value + 1]
          : "";

      if (currentQuestionIndex.value === specificQuestionIndex) {
        // Store the AI response for the specific question
        aiResponse =
          "Here is your generated bio (feel free to change it in your profile settings):" +
          mappedBio.value;
      }

      // Update messages and input visibility
      updateMessages(aiResponse, nextQuestion);

      // Move to the next question if applicable
      if (currentQuestionIndex.value != specificQuestionIndex) {
        currentQuestionIndex.value++;
      } else {
        showCreateProfileButton.value = true;
      }
    } else {
      console.warn("API response was not successful:", response);
      updateMessages("Something went wrong. Please try again.", "");
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    updateMessages("Failed to fetch AI response. Please try again.", "");
  } finally {
    userInputValue.value = userInput.value.trim(); // Store user input
    isLoading.value = false;
    isTyping.value = false;
    userInput.value = ""; // Clear input for the next question
    showUserBubble.value = false;
  }
};

// Submit data to the database
const submitToDatabase = async () => {
  submittingtoDatabase.value = true;
  isLoading.value = true;
  try {
    // console.log("User Input Gender:", userResponses.value.sex);
    // console.log("Mapped Gender:", mappedGender.value);
    // console.log("User Input Status:", userResponses.value.status);
    // console.log("Mapped Status:", mappedStatus.value);

    const avatarUrl = getAvatarUrl(null, mappedGender.value);

    await authStore.checkAuthAnony({
      displayName: mappedDisplayName.value,
      age: mappedAge.value,
      avatarUrl: avatarUrl,
      bio: mappedBio.value,
      selectedGender: mappedGender.value,
      selectedStatus: mappedStatus.value,
    });
  } catch (error) {
    console.error("Error during profile creation:", error);
  } finally {
    isLoading.value = false;
    router.push({ path: "/settings", query: { first: true} });
  }
};
</script>

<style scoped>
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
  /* Position the tail to the right of the bubble */
  width: 0;
  height: 0;
  border-left: 11px solid rgba(0, 150, 255, 0.2);
  /* Tail color */
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

.user-avatar {
  background-color: rgba(70, 169, 101, 0.6);
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
