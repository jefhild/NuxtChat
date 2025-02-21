<template>
	<v-card max-width="400">
		<v-card-text>
			<v-row justify="center" no-gutters>
				<v-col class="text-center">
					<v-container>
						<!-- Display the conversation -->
						<div v-if="messages.length">
							<p v-for="(message, index) in messages" :key="message.id" :class="[
								message.role,
								{
									'current-question':
										index === currentQuestionIndex && message.role === 'bot',
								},
							]">
								{{ message.text }}
							</p>
						</div>
					</v-container>
					<v-text-field v-if="showInputField" ref="inputField" variant="outlined" v-model="userInput"
						@keyup.enter="sendMessage" placeholder="Type your response..." :disabled="isLoading" />
				</v-col>
			</v-row>
		</v-card-text>

		<template v-slot:actions>
			<v-btn color="primary" text @click="emitCloseDialog">Close</v-btn>
			<v-spacer></v-spacer>
			<v-btn v-if="showCreateProfileButton" color="red" @click="submitToDatabase">
				Create Profile
			</v-btn>
			<v-btn v-else class="ms-auto" text @click="sendMessage"> Send </v-btn>
		</template>
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
const inputField = ref(null); // Reference to the input field
const mappedDisplayName = ref(null);
const mappedGender = ref(null);
const mappedStatus = ref(null);
const mappedAge = ref(null);

const { classifyGender } = useGenderMapper();
const { classifyStatus } = useStatusMapper();
const { classifyAge } = useAgeMapper();
const { getAvatarUrl } = useAvatarMapper();

const emit = defineEmits(["closeDialog"]);

// State variables
const messages = ref([]);
const questions = ref([
	"What would you like to use as your pseudo?",
	"Are you a man, a woman, or something else?",
	"How old are you?",
	"Are you married, single, separated, or maybe it's complicated?",
	"What are your interests?",
]);
const userResponses = ref({
	name: "",
	sex: "",
	age: "",
	status: "",
	bio: "",
});
const userInput = ref("");
const currentQuestionIndex = ref(0);
const showCreateProfileButton = ref(false);
const showInputField = ref(true); // Determines the visibility of the input field

const questionKeyMap = {
	0: "name",
	1: "sex",
	2: "age",
	3: "status",
	4: "bio",
};

let messageCounter = 0; // Ensure unique keys for messages

// Load the first question on mount
onMounted(async () =>
{
	messages.value = [
		{ id: messageCounter++, role: "bot", text: questions.value[0] },
	];
	await nextTick(); // Ensure the DOM has fully rendered before focusing
	focusInput(); // Set focus to the input field
});

// Update messages and handle visibility
const updateMessages = (aiResponse, nextQuestion) =>
{
	messages.value = [
		{ id: messageCounter++, role: "bot", text: aiResponse },
		...(nextQuestion
			? [{ id: messageCounter++, role: "bot", text: nextQuestion }]
			: []),
	];
	showInputField.value = nextQuestion !== ""; // Hide input if there’s no next question
	if (showInputField.value)
	{
		focusInput(); // Refocus input field if it's visible
	}
};

// Focus on the input field
const focusInput = async () =>
{
	await nextTick(); // Wait for DOM updates
	if (inputField.value)
	{
		inputField.value.focus();
	}
};

const validateAIResponse = (responseText) =>
{
	const invalidPatterns = [
		/\b(can you clarify|could you clarify|please clarify)\b/i,
		/\b(do you mean|did you mean)\b/i,
		/\b(or\b.+?\?)$/i, // Matches "or ..." questions at the end
	];

	for (const pattern of invalidPatterns)
	{
		if (pattern.test(responseText))
		{
			return {
				valid: false,
				error:
					"The AI response included follow-up questions or suggestions. Please try again.",
			};
		}
	}
	return { valid: true };
};

// Validate user response
const validateResponse = async (index, input) =>
{
	// // Check AI response for invalid patterns before specific validation cases
	// const aiValidation = validateAIResponse(input);
	// if (!aiValidation.valid) {
	//   return aiValidation; // Return error if AI response is invalid
	// }

	var payload = {};

	switch (index)
	{
		case 0: // Pseudo validation
			//Do it with AI
			//If its hateful or more than one word ask AI to give us error message, else return the pseudo
			try
			{
				const response = await $fetch("/api/aiRegistration", {
					method: "POST",
					body: {
						userMessage: `Extract a pseudonym from the user input.  
									- If the input is a sentence requesting a pseudonym (e.g., "I want my pseudonym to be X"), extract only the single-word pseudonym.  
									- If the input itself is already a multi-word pseudonym (e.g., "Dark Lord"), return this exact error message: "Your pseudonym must be a single word."  
									- If the input contains hate speech or inappropriate words, return an error message explaining why.  
									- Otherwise, return only the valid pseudonym, with no additional text.  
										User input: ${input}`,
						currentResponses: userResponses.value,
						currentQuestionIndex: currentQuestionIndex.value,
						questions: questions.value,
					},
				});

				//If theres an answer back from the AI
				if (response.success && response.aiResponse)
				{
					const userPseudo = response.aiResponse.trim();

					//Returning that its hateful/inapropriate or not one word
					if (userPseudo.split(" ").length > 1) return { valid: false, error: userPseudo };
					
					//If the ai response is one word (a pseudonym that isnt hateful etc...)
					if (userPseudo.length < 3 || userPseudo.length > 12)
					{
						return {
							valid: false,
							error: "Your pseudo must be between 3 and 12 characters.",
						};
					}

					// Check if the username already exists
					if (await checkUsernameExists(userPseudo))
					{
						return {
							valid: false,
							error: "This pseudo is already taken. Please choose another one.",
						};
					}

					mappedDisplayName.value = userPseudo;
					//All is good 
					return { valid: true };
				}				
				
			} catch (error)
			{ console.error("Error fetching AI response:", error); }

			return { valid: false, error: "An error occured while validating the pseudo. Please enter your pseudo again" };


		case 1: //Gender validation
			const gender = classifyGender(input);
			mappedGender.value = gender;
			if (mappedGender.value === 3) { return { valid: false, error: "Please enter a real gender or \"other\""}; }
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

			try
			{
				const response = await $fetch("/api/aiRegistration", {
					method: "POST",
					body: payload,
				});

				if (response.success && response.aiResponse)
				{
					const ageValidation = classifyAge(response.aiResponse);
					if (!ageValidation.valid)
					{
						return { valid: false, error: ageValidation.error };
					}
					mappedAge.value = ageValidation.mappedAge;
					userResponses.value.age = input;

					return { valid: true };
				}
			} catch (error)
			{ console.error("Error fetching AI response:", error); }



		case 3: //Status validation
			const status = classifyStatus(input);
			mappedStatus.value = status;
			userResponses.value.status = input;
			return { valid: true };

		case 4: //Bio validation
			const bio = input.trim();
			payload = {
				userMessage: `Here is the user input for the bio: ${bio}. Validate it. If it contains innapropriate information or any hatfeul content, return an error message to retry. Otherwise, asnwer with only the word "okay".`,
				currentResponses: userResponses.value,
				currentQuestionIndex: currentQuestionIndex.value,
				questions: questions.value,
			};

			try
			{
				const response = await $fetch("/api/aiRegistration", {
					method: "POST",
					body: payload,
				});

				if (response.success && response.aiResponse)
				{
					if (response.aiResponse.trim().split(" ").length > 1)
					{
						return { valid: false, error: response.aiResponse };
					}

					userResponses.value.bio = bio;
					return { valid: true };
				}

			}catch (error){ console.error("Error fetching AI response:", error); }


		default:
			return { valid: true };
	}
};
const checkUsernameExists = async (displayName) =>
{
	try
	{
		const { data, error } = await supabase
			.from("profiles") // Replace with your table name
			.select("displayname", { head: false }) // Select the correct field
			.eq("displayname", displayName) // Match on displayname
			.limit(1) // Limit to one row
			.maybeSingle(); // Fetch a single row	

		if (error && error.code !== "PGRST116")
		{
			console.error("Error checking displayname:", error);
			return false;
		}

		return !!data; // Return true if displayname exists, false otherwise
	} catch (err)
	{
		console.error("Unexpected error while checking displayname:", err);
		return false;
	}
};

const specificQuestionIndex = 4; // Specify the index of the question to store AI response

const sendMessage = async () =>
{
	isLoading.value = true;
	if (!userInput.value.trim())
	{
		console.warn("User input is empty. Aborting.");
		return;
	}

	const currentKey = questionKeyMap[currentQuestionIndex.value];
	if (!currentKey)
	{
		console.warn("Invalid question index.");
		return;
	}

	// Validate the response
	const validation = await validateResponse(
		currentQuestionIndex.value,
		userInput.value.trim()
	);

	if (!validation.valid)
	{
		// Display validation error and do not proceed to the next question
		updateMessages(
			validation.error,
			questions.value[currentQuestionIndex.value]
		);
		userInput.value = ""; // Clear input for retry
		isLoading.value = false;
		return;
	}

	const userInputValue = userInput.value.trim(); // Store user input
	userInput.value = ""; // Clear input for the next question

	// Prepare payload for AI API
	const payload = {
		userMessage: userInputValue,
		currentResponses: userResponses.value,
		currentQuestionIndex: currentQuestionIndex.value,
		questions: questions.value,
	};

	try
	{
		const response = await $fetch("/api/aiRegistration", {
			method: "POST",
			body: payload,
		});

		if (response.success && response.aiResponse)
		{
			const aiResponse = response.aiResponse;
			userResponses.value[currentKey] = userInputValue; // Save user input for the questions
			

			console.log("User responses:", userResponses.value);
			// Determine the next question or finish
			const nextQuestion =
				currentQuestionIndex.value < questions.value.length - 1
					? questions.value[currentQuestionIndex.value + 1]
					: "";

			// Update messages and input visibility
			updateMessages(aiResponse, nextQuestion);

			// Move to the next question if applicable
			if (currentQuestionIndex.value < questions.value.length - 1)
			{
				currentQuestionIndex.value++;
			} else
			{
				showCreateProfileButton.value = true;
			}
		} else
		{
			console.warn("API response was not successful:", response);
			updateMessages("Something went wrong. Please try again.", "");
		}
	} catch (error)
	{
		console.error("Error fetching AI response:", error);
		updateMessages("Failed to fetch AI response. Please try again.", "");
	} finally
	{
		isLoading.value = false;
	}
};

// Submit data to the database
const submitToDatabase = async () =>
{
	isLoading.value = true;
	try
	{
		// console.log("User Input Gender:", userResponses.value.sex);
		// console.log("Mapped Gender:", mappedGender.value);
		// console.log("User Input Status:", userResponses.value.status);
		// console.log("Mapped Status:", mappedStatus.value);

		const avatarUrl = getAvatarUrl(null, mappedGender.value);

		await authStore.checkAuthAnony({
			displayName: mappedDisplayName.value,
			age: mappedAge.value,
			avatarUrl: avatarUrl,
			bio: userResponses.value.bio,
			selectedGender: mappedGender.value,
			selectedStatus: mappedStatus.value,
		});
	} catch (error)
	{
		console.error("Error during profile creation:", error);
	} finally
	{
		isLoading.value = false;
		router.push("/settings");
		emitCloseDialog();
	}
};

// Close the dialog
const emitCloseDialog = () =>
{
	emit("closeDialog");
};
</script>

<style scoped>
/* Base styles for messages */
p.bot {
	background-color: #f0f4f8;
	/* Light blue background for AI responses */
	color: #333;
	/* Dark text for contrast */
	padding: 10px;
	border-radius: 8px;
	margin: 5px 0;
	text-align: left;
}

p.user {
	background-color: #e1ffe1;
	/* Light green background for user responses */
	color: #333;
	/* Dark text for contrast */
	padding: 10px;
	border-radius: 8px;
	margin: 5px 0;
	text-align: right;
}

/* Highlight for the current question */
p.current-question {
	border: 2px solid #4caf50;
	/* Green border to highlight the active question */
	font-weight: bold;
}
</style>
