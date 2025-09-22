import OpenAI from "openai";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });

  const body = await readBody(event);
  console.log("Server received body:", body);

  const {
    userMessage,
    currentResponses,
    currentQuestionIndex,
    questions,
    context,
  } = body;


  const cleanMessage = userMessage.trim().toLowerCase();

  if (!userMessage) {
    throw createError({ statusCode: 400, message: "User message is required" });
  }
  const questionHints = {
    0: 'Return a single **one-word** pseudonym (no spaces or symbols), like: { "answer": "ShadowWolf" }. Reject multiple words or blank values by returning { "answer": "Invalid" }.',
    1: 'Return gender as a string like: { "answer": "male" }',
    2: 'Return the user’s age as a number, like: { "answer": 34 }. Do not return a string. Do not include words.',
    3: 'Return the relationship status like: { "answer": "single" }',
    4: 'Return a short bio like: { "answer": "Love hiking and board games." }',
  };


  // 🔁 NEW: Handle onboarding intent detection
  if (context === "Did the user give permission to begin onboarding?") {
    const intentPrompt = `
    You are an onboarding assistant. Your job is to classify whether the user has agreed to begin onboarding.
    
    Return a JSON object like this:
    { "intent": "start_onboarding" } or { "intent": "decline" }
    
    Examples:
    - "yes", "sure", "ok", "let's do it", "ready", "yep", "absolutely", "start", "yes let's go" → { "intent": "start_onboarding" }
    - "not now", "no", "maybe later", "i'm not ready", "idk", "hmm", "wait", "no thanks" → { "intent": "decline" }
    
    Only return the object — no explanation.
    The response **must be valid JSON**.
    `;

    try {
      const intentResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: intentPrompt },
          { role: "user", content: cleanMessage },
        ],
        temperature: 0.2,
      });

      const parsed = JSON.parse(intentResponse.choices[0].message.content);
      return parsed;
    } catch (err) {
      console.error("Error detecting onboarding intent:", err);
      throw createError({ statusCode: 500, message: "Intent check failed" });
    }
  }

  // 🔁 EXISTING: Handle question-based onboarding
  if (!questions || !Array.isArray(questions)) {
    throw createError({
      statusCode: 400,
      message: "Questions array is required",
    });
  }

  const currentQuestion = questions[currentQuestionIndex];

  const systemPrompt = `
  You are an onboarding assistant that helps users fill out their profile.
  
  Your job is to **validate and extract a structured answer** to the current question.
  
  Here is the current question:
  "${currentQuestion}"
  
  Here is the user's existing profile data:
  ${JSON.stringify(currentResponses, null, 2)}
  
  Only return a **strict JSON object** using the following format:
  ${questionHints[currentQuestionIndex]}
  
  💡 Guidelines:
  - For pseudonyms, return a single string without spaces or punctuation.
  - For gender, normalize answers to one of: "male", "female", or "other".
  - For age, return a numeric value only (e.g., 34) without words or quotes.
  - For status, return a lowercase word like "single", "married", etc.
  - For bios, return a short natural-language sentence.
  - If the answer cannot be determined, respond with:
    { "answer": "Invalid" }
  
  🚫 Do NOT include any extra text. Do NOT explain your reasoning. Do NOT return markdown.
  
  Examples:
  - ✅ { "answer": "female" }
  - ✅ { "answer": 29 }
  - ❌ "Answer: 29"
  - ❌ { "age": 29 }
  
  Now respond with a valid JSON object.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanMessage },
      ],
    });

    const content = response.choices[0].message.content;
    console.log("🧠 GPT raw response:", content);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw createError({
        statusCode: 500,
        message: "Invalid response format from AI",
      });
    }

    return { success: true, aiResponse: parsed.answer, currentQuestion };
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate AI response",
    });
  }
});
