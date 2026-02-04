import { getOpenAIClient } from "@/server/utils/openaiGateway";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { client: openai, apiKey } = getOpenAIClient({
    runtimeConfig: config,
  });
  if (!apiKey || !openai) {
    throw createError({
      statusCode: 500,
      message: "OPENAI_API_KEY misconfigured",
    });
  }

  const body = await readBody(event);
  console.log("Server received body:", body);

  const { userStatus, userGender, userBio } =
    body;


//   if (!userMessage) {
//     throw createError({ statusCode: 400, message: "User message is required" });
//   }


  const systemPrompt = `
You are a helpful assistant helping users build their profiles step by step.
Here is the current progress of their profile:
${JSON.stringify(currentResponses, null, 2)}

Your role is strictly to respond to the current question:
"${currentQuestion}"

Do NOT ask follow-up questions or introduce new suggestions beyond what is explicitly asked in the predefined question. Keep your response concise and focused on the specific input provided by the user. Your goal is to guide the user through the predefined questions without introducing additional steps.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const aiResponse = response.choices[0].message.content;

    return { success: true, aiResponse, currentQuestion };
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate AI response",
    });
  }
});
