<template>
	<v-card class="myfont">
		<v-progress-linear :model-value="(currentQuestionIndex / questions.length) * 100" color="light-blue" height="10"
			rounded style="width: 100%" />
		<v-card-title class="text-center text-subtitle-1">
			Let's finish setting up your profile - you have {{ questions.length - currentQuestionIndex }} left
		</v-card-title>
		<v-card-text>
			<v-row align="center" justify="center">
				<v-col cols="10" md="10" class="animation-container">
					<v-row justify="center" no-gutters>
						<v-col class="text-center">
							<v-container class="chat-container">
								<!-- Display the conversation -->

								<!--User response-->
								<transition name="user-bubble">
									<div v-if="!showUserBubble && aiResponse"
										:key="'previousUserInput-' + currentQuestionIndex"
										class="chat-bubble user-message">
										<v-avatar size="24" class="user-avatar">
											<v-img src="/images/avatars/anonymous.png" />
										</v-avatar>
										{{ previosUserInput }}
									</div>
								</transition>


								<transition-group name="chat" tag="div">
									<p class="chat-bubble bot-message" :key="'aiResponse-' + currentQuestionIndex"
										v-if="aiResponse">
										{{ aiResponse }}
										<v-avatar size="32" class="bot-avatar">
											<v-img src="/images/robot.png" />
										</v-avatar>
									</p>
									<p class="chat-bubble bot-message" :key="'question-' + currentQuestionIndex"
										v-if="mounted && questions[currentQuestionIndex]">
										{{ questions[currentQuestionIndex] }}
										<v-avatar size="32" class="bot-avatar">
											<v-img src="/images/robot.png" />
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
										<v-img src="/images/robot.png" />
									</v-avatar>
								</div>

							</v-container>
							<v-text-field v-if="!submittingtoDatabase" variant="outlined" v-model="userInput"
								@keyup.enter="sendMessage" placeholder="Type your response...">
								<template #append-inner>
									<v-icon :color="userInput ? 'primary' : 'grey'" class="cursor-pointer"
										@click="sendMessage">
										mdi-send
									</v-icon>
								</template>
							</v-text-field>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</v-card-text>
		<v-card-actions v-if="!isDone" class="pr-4 pb-4">
			<v-btn color="red" @click="() => nextQuestion()"> {{ skipButtonText }} </v-btn>
			<v-btn v-if="urlQuestion" @click="dismissSitePrompt">Don't Ask Again</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
const { updateTagline, updateSiteURL, updateInterests, updateUserEmail } = useDb();

const emit = defineEmits(["closeDialog", "lookingForUpdated"]);

const authStore = useAuthStore();


const userProfile = authStore.userProfile;
const previosUserInput = ref("");
const currentQuestionIndex = ref(0);
const isTyping = ref(false);
const showUserBubble = ref(false);
const aiResponse = ref("");
const userInput = ref("");
const submittingtoDatabase = ref(false);
const mounted = ref(false);
const mappedTagline = ref("");
const mappedURL = ref(""); 
const mappedInterests = ref("");
const mappedEmail = ref("");
const userResponses = ref({});
const isDone = ref(false); 
const urlQuestion = ref(false);
const skipButtonText = ref("SKIP");

const props = defineProps({
	infoLeft: {
		type: Array,
		required: true,
	},
});

const infoLeft = props.infoLeft;

const questions = ref([]);

const questionKeyMap = {};

const dismissSitePrompt = () => {
  localStorage.setItem("skipSiteURLPrompt", "true");
  nextQuestion();
};

const nextQuestion = async(aiAnswer = "Let's move on", sendMessage = false) =>
{
	userInput.value = "";
	urlQuestion.value = false;
	currentQuestionIndex.value++;
	aiResponse.value = aiAnswer; 

	if ( currentQuestionIndex.value === questions.value.length - 1 )
	{
		skipButtonText.value = "CLOSE";
	} 

	if (currentQuestionIndex.value >= questions.value.length )
	{
		isDone.value = true;
		// console.log("All questions answered. Closing dialog.");
		if(sendMessage){
			await new Promise(resolve => setTimeout(resolve, 3000));
		}
		emit("closeDialog");
	}

	if(questionKeyMap[currentQuestionIndex.value] === "site_url")
		urlQuestion.value = true;

	submittingtoDatabase.value = false;
};

const sendMessage = async () => {
	isTyping.value = true;
	previosUserInput.value = userInput.value;
	userInput.value = "";
	showUserBubble.value = true;
	if (previosUserInput.value.trim() === "")
	{
		aiResponse.value = "Please enter a valid response.";
		showUserBubble.value = false;
		isTyping.value = false;
		return;
	}

	const currentKey = questionKeyMap[currentQuestionIndex.value];

	const userPrompts = {
		tagline: `Extract a tagline from the user input.
      - If the input is a sentence requesting a tagline (e.g., "I want my tagline to be X"), extract only tagline.
      - If the input contains hate speech or inappropriate words, return an error message starting with "Error:...".
      - Otherwise, return only the valid tagline, with no additional text, no quotes, and no punctuation.
      User input: ${previosUserInput.value}`,

		interests: `Extract user interests. Possible interests: Love, Fun, Nothing Serious, Men, Women, Friends.
      - If the user input shows any of these interests, return only the valid ones separated by a comma (e.g., "Love, Friends").
      - If no valid interests are detected, return "Nothing Serious".
      - If input contains hate speech, return an error message starting with "Error:...".
      Otherwise, return only valid interests without extra text, quotes, or punctuation.
      User input: ${previosUserInput.value}`,

		site_url: `Extract a URL from user input.
      - If the input includes a request for a URL (e.g., "I want my website to be X"), extract only the URL.
      - If the input says they don't want to share a URL, return "No URL" without the "".
      - If input contains hate speech, return an error message starting with "Error:...".
      Otherwise, return only the valid URL or No URL "", extra text, quotes, or punctuation.
      User input: ${previosUserInput.value}`,

		email: `Extract an email address from user input.
	  - If the input includes a request for an email (e.g., "I want my email to be X"), extract only the email.
	  - If the input contains hate speech, or anything that isn't an email address return an error message starting with "Error:...".
	  Otherwise, return only the valid email without any extra text, quotes, "", or punctuation.
	  User input: ${previosUserInput.value}`,
	};

	if (!userPrompts[currentKey])
	{
		console.error("Invalid question key:", currentKey);
		return;
	}

	try
	{
		const response = await $fetch("/api/aiRegistration", {
			method: "POST",
			body: {
				userMessage: userPrompts[currentKey],
				currentResponses: userResponses.value,
				currentQuestionIndex: currentQuestionIndex.value,
				questions: questions.value,
			},
		});


		//If theres an answer back from the AI
		if (response.success && response.aiResponse)
		{
			//If hateful speech or inappropriate words are detected
			if (response.aiResponse.startsWith("Error"))
			{
				aiResponse.value = response.aiResponse;
				showUserBubble.value = false;
				isTyping.value = false;
				return;
			}

			// Dynamically update the mapped values based on the current question
			const mappedValues = {
				tagline: () => (mappedTagline.value = response.aiResponse),
				interests: () => (mappedInterests.value = response.aiResponse),
				site_url: () => (mappedURL.value = response.aiResponse === "No URL" || '"No URL"' ? "" : response.aiResponse),
				email: () => (mappedEmail.value = response.aiResponse),
			};

			if (mappedValues[currentKey]) mappedValues[currentKey]();
			
			/*console.log("mappedTagline: ", mappedTagline.value);
			console.log("mappedInterests: ", mappedInterests.value);
			console.log("mappedURL: ", mappedURL.value);*/
			// console.log("mappedEmail: ", mappedEmail.value);
		}
	}catch(errorFirst){console.error(errorFirst);}

	// Prepare payload for AI API
	const payload = {
		userMessage: `user message : "` + previosUserInput.value.trim() + `". One quick thing to add. If the question is about the site URL, no matter what the user says, say okay we'll add that to the profile.`,
		currentResponses: userResponses.value,
		currentQuestionIndex: currentQuestionIndex.value,
		questions: questions.value,
	};

	let aiAnswer = "";
	try
	{
		const response = await $fetch("/api/aiRegistration", {
			method: "POST",
			body: payload,
		});

		if (response.success && response.aiResponse)
		{
			aiAnswer = response.aiResponse;
			userResponses.value[currentKey] = previosUserInput.value.trim();
		}
	}catch(error){console.error("error fetching ai response: ", error)}

	showUserBubble.value = false;
	isTyping.value = false;
	submittingtoDatabase.value = true;
	
	if (currentKey === "tagline")
	{
		await updateTagline(mappedTagline.value.trim(), userProfile.user_id);
		userProfile.tagline = mappedTagline.value.trim();
	}

	if (currentKey === "interests")
	{
		const interestsArray = mappedInterests.value.trim().split(",");
		await updateInterests(interestsArray, userProfile.user_id);
		userProfile.looking_for = interestsArray;
		emit("lookingForUpdated");
	}

	if (currentKey === "site_url")
	{
		await updateSiteURL(mappedURL.value.trim(), userProfile.user_id);
		userProfile.site_url = mappedURL.value.trim();
	}

	if (currentKey === "email")
	{
		aiResponse.value = "Linking your email to your account...";
		currentQuestionIndex.value++;
		//check if real email address
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (!emailRegex.test(mappedEmail.value.trim()))
		{
			aiResponse.value = "Please enter a valid email address.";
			submittingtoDatabase.value = false;
			currentQuestionIndex.value--;
			return;
		}
		
		const { error } = await updateUserEmail(mappedEmail.value.trim());

		//link the email to the user account
		if (error)
		{
			console.error("Error linking email: ", error);
			aiResponse.value = "Oops! Something went wrong. Please try again.";
			submittingtoDatabase.value = false;
			currentQuestionIndex.value--;
			return;
		} else
		{
			aiAnswer = "Check your email for the confirm link! (It may be in your spam folder.)";
		}
		currentQuestionIndex.value--;
	}

	await nextQuestion(aiAnswer,true);
};

onMounted(() => {
	mounted.value = true;
	// console.log("userprofile: ", userProfile);

	let questionIndex = 0;

	const questionMap = {
		tagline: "Your tagline is a short phrase that represents you. It could be a quote, a fun fact, or a quick description of who you are. What would you like yours to be?",
		interests: "What brings you to this website? Are you here to chat, make new friends?",
		site_url: "Have a personal website or social profile you’d like to share? It’s completely optional — you can skip this if you’d prefer not to.",
		email: "Enter an email address to register your account and have full access to the site. Closing this does not unsave your previous inputs.",
	};

	// console.log("infoLeft: ", infoLeft);

	infoLeft.forEach((key) =>
	{
		if (questionMap[key])
		{
			questions.value.push(questionMap[key]);
			questionKeyMap[questionIndex++] = key;
			userResponses.value[key] = ""; // Initialize response
		}
	});

	// console.log(questionKeyMap);
	// console.log(questionKeyMap[currentQuestionIndex.value]);	
	// console.log("user responses: ", userResponses.value);
	if(questionKeyMap[currentQuestionIndex.value] === "site_url")
		urlQuestion.value = true;
});
</script>

<style scoped>
.myfont {
	font-family: "poppins", sans-serif;
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

.chat-enter-from {
	opacity: 0;
	transform: translateX(100px);
	/* depuis la droite */
}

.chat-enter-active {
	transition: all 0.4s ease;
}

.chat-enter-to {
	opacity: 1;
	transform: translateX(0);
}

.user-bubble-enter-from {
	opacity: 0;
	transform: translateX(-100px);
}

.user-bubble-enter-active {
	transition: all 0.4s ease;
}

.user-bubble-enter-to {
	opacity: 1;
	transform: translateX(0);
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
