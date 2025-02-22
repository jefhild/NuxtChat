<template>
  <v-card
    max-width="400"
    prepend-icon="mdi-account"
    title="Just a few questions!"
  >
    <v-card-text>
      <v-row justify="center">
        <v-col class="text-center">
          <v-container>
            <!-- Render all messages -->
            <div
              v-for="message in messages"
              :key="message.id"
              :class="message.role"
            >
              <p>{{ message.text }}</p>
            </div>
          </v-container>
          <!-- Input field for user to type -->
          <input
            v-model="userInput"
            @keyup.enter="sendMessage"
            placeholder="Type your response..."
          />
          <!-- </div> -->
        </v-col>
      </v-row>
    </v-card-text>

    <template v-slot:actions>
      <v-btn color="primary" text @click="emitCloseDialog">Close</v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="showCreateProfileButton"
        color="red"
        @click="submitToDatabase"
      >
        Create Profile
      </v-btn>
      <v-btn v-else class="ms-auto" text @click="sendMessage"> Send </v-btn>
    </template>
  </v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const supabase = useSupabaseClient();
// Track the current step
const authStore = useAuthStore();
const isLoading = ref(false);

const emit = defineEmits(["closeDialog"]);

// Reactive array to hold the conversation messages
const messages = ref([]);
const questions = ref([
  "What would you like to use as your pseudo?",
  "Are you a Man, a Woman, or Something Completely different?",
  "How old are you?",
  "What are your interests?",
  "What are you looking for?",
]);
const userResponses = ref({
  name: "", // Response to "What’s your name?"
  sex: "", // Response
  age: "", // Response to "How old are you?"
  interests: "", // Response to "What are your interests?"
  preferences: "", // Response to "What are you looking for in this app?"
});
// Reactive variable for user input
const userInput = ref("");
const currentQuestionIndex = ref(0);
const showCreateProfileButton = ref(false);

const currentQuestionKey = Object.keys(userResponses.value)[
  currentQuestionIndex.value
];
userResponses.value[currentQuestionKey] = userInput.value;

// Load initial bot message when the component is mounted
onMounted(() => {
  messages.value.push({
    id: Date.now(),
    role: "bot",
    text: questions.value[currentQuestionIndex.value], // Start with the first question
  });
});

const sendMessage = async () => {
  if (!userInput.value.trim()) {
    console.warn("User input is empty. Aborting.");
    return;
  }

  console.log("User input:", userInput.value);
  console.log("Current Question Index:", currentQuestionIndex.value);

  // Validate the response for the current question
  const validation = validateResponse(
    currentQuestionIndex.value,
    userInput.value
  );
  if (!validation.isValid) {
    // Display the error message and retry the same question
    messages.value.push({
      id: Date.now(),
      role: "bot",
      text: validation.errorMessage,
    });

    console.log("Validation failed. User must retry the same question.");
    userInput.value = ""; // Clear input for retry
    return; // Stop further processing
  }

  // Add the user's input to the messages array (to display it in the chat)
  messages.value.push({
    id: Date.now(),
    role: "user",
    text: userInput.value,
  });

  // Save the user's response using the key map
  const questionKeyMap = {
    0: "name",
    1: "sex",
    2: "age",
    3: "interests",
    4: "preferences",
  };

  const currentKey = questionKeyMap[currentQuestionIndex.value];
  if (currentKey) {
    if (currentQuestionIndex.value === 2) {
      // Special handling for age
      const ageMatch = userInput.value.match(/\d+/); // Extract the number
      const age = ageMatch ? parseInt(ageMatch[0], 10) : NaN;

      if (!isNaN(age)) {
        userResponses.value[currentKey] = age.toString(); // Save only the number as a string
        console.log(`Extracted and saved age: ${age}`);
      } else {
        console.warn("Age extraction failed. Using raw input.");
        userResponses.value[currentKey] = userInput.value; // Fallback to raw input if parsing fails
      }
    } else {
      userResponses.value[currentKey] = userInput.value.trim();
    }
    console.log(
      "Updated userResponses:",
      JSON.stringify(userResponses.value, null, 2)
    );
  } else {
    console.warn("Invalid question index.");
  }
  // Check if all questions are answered
  if (currentQuestionIndex.value >= questions.value.length - 1) {
    // Save the user's last response
    const currentKey = questionKeyMap[currentQuestionIndex.value];
    if (currentKey) {
      userResponses.value[currentKey] = userInput.value.trim();
      console.log("Saved last response:", userResponses.value[currentKey]);
    }

    messages.value.push({
      id: Date.now(),
      role: "bot",
      text: "Thanks! That looks workable... Click below to build your profile.",
    });

    userInput.value = ""; // Clear input for retry
    // Show the button to create the profile
    showCreateProfileButton.value = true;
    console.log(
      "Final userResponses:",
      JSON.stringify(userResponses.value, null, 2)
    );
    return; // Stop the flow
  }

  // Prepare payload for AI
  const userPayload = {
    userMessage: userInput.value.trim(),
    currentResponses: userResponses.value,
    currentQuestionIndex: currentQuestionIndex.value,
    questions: questions.value,
  };

  console.log(
    "Payload being sent to /api/aiRegistration:",
    JSON.stringify(userPayload, null, 2)
  );

  // Clear input field
  userInput.value = "";

  try {
    const response = await fetch("/api/aiRegistration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
    });

    const responseData = await response.json();
    console.log("API response:", responseData);

    // Add AI's response
    if (responseData.success && responseData.aiResponse) {
      messages.value.push({
        id: Date.now(),
        role: "bot",
        text: responseData.aiResponse,
      });

      // Move to the next question if applicable
      if (currentQuestionIndex.value < questions.value.length - 1) {
        currentQuestionIndex.value++;
        messages.value.push({
          id: Date.now(),
          role: "bot",
          text: questions.value[currentQuestionIndex.value],
        });

        console.log(
          "Moved to next question:",
          questions.value[currentQuestionIndex.value]
        );
        console.log(
          "Current userResponses:",
          JSON.stringify(userResponses.value, null, 2)
        );
      }
    } else {
      console.warn("API response was not successful:", responseData);
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    messages.value.push({
      id: Date.now(),
      role: "bot",
      text: "Something went wrong. Please try again.",
    });
  }
};

const validateResponse = (currentIndex, input) => {
  switch (currentIndex) {
    case 0: // Pseudo validation
      if (/\s/.test(input)) {
        return {
          isValid: false,
          errorMessage:
            "Your pseudo should not contain spaces. Please try again.",
        };
      }
      if (input.length > 12) {
        return {
          isValid: false,
          errorMessage:
            "Your pseudo should be no longer than 12 characters. Please try again.",
        };
      }
      return { isValid: true };

    case 1: // Sex validation
      const normalizedInput = input.trim().toLowerCase();
      if (["man", "male"].includes(normalizedInput)) {
        return { isValid: true, value: 1 }; // Key for "man"
      }
      if (["woman", "female"].includes(normalizedInput)) {
        return { isValid: true, value: 2 }; // Key for "woman"
      }
      if (
        ["trans", "transgender", "something different"].some((term) =>
          normalizedInput.includes(term)
        )
      ) {
        return { isValid: true, value: 3 }; // Key for "trans"
      }
      return {
        isValid: false,
        errorMessage:
          "I'm sorry, I couldn't understand your response. Please specify if you are a man, a woman, or transgender for example.",
      };

    case 2: // Age validation
      const ageMatch = input.match(/\d+/);
      const age = ageMatch ? parseInt(ageMatch[0], 10) : NaN;
      if (isNaN(age) || age <= 0 || age > 120) {
        return {
          isValid: false,
          errorMessage:
            "I'm sorry, but the age you entered seems invalid. Please provide a valid age (e.g., 25).",
        };
      }
      return { isValid: true };

    case 3: // Interests validation
      if (input.trim().length < 3) {
        return {
          isValid: false,
          errorMessage:
            "I'm sorry, your response is unclear. Could you specify what your hobbies or interests are? For example, you might be interested in sports, reading, cooking, travel, music, movies, etc.",
        };
      }
      if (input.trim().length > 100) {
        return {
          isValid: false,
          errorMessage:
            "I'm sorry, your response is unclear. Could you specify what your hobbies or interests are? For example, you might be interested in sports, reading, cooking, travel, music, movies, etc.",
        };
      }
      return { isValid: true };
    case 4: // Looking for validation
      if (input.trim().length < 3) {
        return {
          isValid: false,
          errorMessage:
            "I'm sorry, your response is unclear. Could you specify what you're hoping to find here? For example, you might be looking for love, or a just a distraction, maybe you're just hoping to meet new friends, etc.",
        };
      }
      if (input.trim().length > 100) {
        return {
          isValid: false,
          errorMessage:
            "I'm sorry, your response is unclear. Could you specify what you're hoping to find here? For example, you might be looking for love, or a just a distraction, maybe you're just hoping to meet new friends, etc.",
        };
      }
      return { isValid: true };
    default:
      return { isValid: true }; // Default case for questions without specific validation
  }
};

const submitToDatabase = async () => {

  isLoading.value = true;

  try {
    await authStore.checkAuthAnony({
      displayName: userResponses.value.name,
      age: userResponses.value.age,
      selectedGender: "1",
      bio: "test",
    });

    // isProfileCreated.value = true;
  } catch (error) {
    console.error("Error during profile creation:", error);
  }



};

function emitCloseDialog() {
  emit("closeDialog");
}
</script>

<style scoped>
.bot {
  text-align: left;
  color: blue;
}

.user {
  text-align: right;
  color: green;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
