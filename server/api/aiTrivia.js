import OpenAI from "openai";

export default defineEventHandler(async (event) =>{
	const config = useRuntimeConfig();
	const openai = new OpenAI({
		apiKey: config.OPENAI_API_KEY, // Store your key securely in environment variables
	  });
	
	const body = await readBody(event);
	console.log("Server received body:", body);

	const { userInput } = body;

	if (!userInput)
	{
		throw createError({ statusCode: 400, message: "keywords are required" });
	}

	const systemPrompt = `You are a trivia master. You have a vast knowledge of random facts and information.`

	try
	{
		const response = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userInput } // Add user input here
			]
		});

		const aiResponse = response.choices[0].message.content;

		return { success: true, aiResponse };
	} catch (error)
	{
		console.error("Error generating AI response:", error);
		throw createError({
			statusCode: 500,
			message: "Failed to generate AI response",
		});
	}
});