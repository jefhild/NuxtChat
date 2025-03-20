<template>
	<v-card>
		<v-card-text>
			<v-row align="center" justify="center">
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
										{{ aiResponse }}
										<v-avatar size="32" class="bot-avatar">
											<v-img src="/robot.png" />
										</v-avatar>
									</p>
									<p class="chat-bubble bot-message" :key="'bot-message'"
										v-if="mounted && questions[currentQuestionIndex]">
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
								@keyup.enter="sendMessage" placeholder="Type your response..."
								append-inner-icon="mdi-send" @click:append-inner="sendMessage" />

						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</v-card-text>
		<!-- Circular Progress Bar Overlay -->
		<v-overlay v-model="submittingtoDatabase" contained class="align-center justify-center" persistent>
			<v-progress-circular color="primary" indeterminate size="64" />
		</v-overlay>
	</v-card>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const emit = defineEmits(["closeDialog"]);

const authStore = useAuthStore();

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
const userResponses = ref({});

const props = defineProps({
	infoLeft: {
		type: Array,
		required: true,
	},
});

const infoLeft = props.infoLeft;

const questions = ref([]);

const questionKeyMap = {};

const sendMessage = async () => {
	isTyping.value = true;
	previosUserInput.value = userInput.value;
	userInput.value = "";
	showUserBubble.value = true;

	var userMessage;

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
      - If the input says they don't want to share a URL, return "No URL".
      - If input contains hate speech, return an error message starting with "Error:...".
      Otherwise, return only the valid URL or "No URL" without extra text, quotes, or punctuation.
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
				site_url: () => (mappedURL.value = response.aiResponse === "No URL" ? "" : response.aiResponse),
			};

			if (mappedValues[currentKey]) mappedValues[currentKey]();
			
			console.log("mappedTagline: ", mappedTagline.value);
			console.log("mappedInterests: ", mappedInterests.value);
			console.log("mappedURL: ", mappedURL.value);
		}
	}catch(errorFirst){console.error(errorFirst);}

	// Prepare payload for AI API
	const payload = {
		userMessage: previosUserInput.value.trim(),
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
			aiResponse.value = response.aiResponse;
			userResponses.value[currentKey] = previosUserInput.value.trim();
		}
	}catch(error){console.error("error fetching ai response: ", error)}

	showUserBubble.value = false;
	isTyping.value = false;
	currentQuestionIndex.value++;
	if (currentQuestionIndex.value == questions.value.length)
	{
		submittingtoDatabase.value = true;

		if (infoLeft.includes("tagline"))
		{
			await authStore.updateTagline(mappedTagline.value.trim());
		}

		if (infoLeft.includes("interests"))
		{
			const interestsArray = mappedInterests.value.trim().split(",");
			await authStore.updateInterests(interestsArray);
		}

		if (infoLeft.includes("site_url"))
		{
			await authStore.updateSiteURL(mappedURL.value.trim());
		}

		emit("closeDialog");
	}
};


onMounted(() => {
	mounted.value = true;

	let questionIndex = 0;

	const questionMap = {
		tagline: "Your tagline is a short phrase that represents you. It could be a quote, a fun fact, or a quick description of who you are. What would you like yours to be?",
		interests: "What brings you to this website? Are you here to chat, make new friends?",
		site_url: "If you have a personal website or social profile you'd like to share, enter the link below.",
	};

	infoLeft.forEach((key) =>
	{
		if (questionMap[key])
		{
			questions.value.push(questionMap[key]);
			questionKeyMap[questionIndex++] = key;
			userResponses.value[key] = ""; // Initialize response
		}
	});

	console.log(questionKeyMap);
	console.log(questionKeyMap[currentQuestionIndex.value]);	
	console.log("user responses: ", userResponses.value);
});
</script>

<style scoped>
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
