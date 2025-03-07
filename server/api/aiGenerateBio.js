import OpenAI from "openai";

export default defineEventHandler(async (event) =>{
	const config = useRuntimeConfig();
	const openai = new OpenAI({
		apiKey: config.OPENAI_API_KEY, // Store your key securely in environment variables
	  });
	
	const body = await readBody(event);
	console.log("Server received body:", body);

	const { keywords } = body;

	if (!keywords)
	{
		throw createError({ statusCode: 400, message: "keywords are required" });
	}

	const systemPrompt = `Based on the following keywords provided by the user: "${keywords}" , 
				generate a short and engaging three-sentence biography that captures their personality, interests, and background. Speak in the first person as if you were the user.
				If in any way the user input is inappropriate, hateful or contains any kind of inappropriate content, return the word and only the word "inappropriate".`

	try
	{
		const response = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: keywords } // Add user input here
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