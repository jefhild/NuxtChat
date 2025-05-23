import { personas } from "../api/personas";
import OpenAI from "openai";

export default defineEventHandler(async (event) =>
{
  const config = useRuntimeConfig();

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY, // Store your key securely in environment variables
  });

  const body = await readBody(event);
  const { userMessage, userGender, userName, aiUser, userAge, messages, replyTo } = body;

  const persona = personas[aiUser];

  if (!persona)
  {
    throw createError({ statusCode: 404, message: "Persona not found" });
  }

  const promptBase = persona.prompt({ userName, userGender, userAge });
  // console.log("Prompt base:", promptBase);

  let fullPrompt = `${promptBase}\nHere are the previous messages:\n`;
  messages.forEach((msg) =>
  {
    fullPrompt += `${msg.sender}: ${msg.content}\n`;
  });

  if (replyTo)
  {
    fullPrompt += `\nNote: The user is replying to this message: "${replyTo}"\n`;
  }

  // console.log("Full prompt:", fullPrompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: fullPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return { success: true, aiResponse: response.choices[0].message.content };
});