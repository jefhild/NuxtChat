const PROMPTS = {
  en: [
    "When you get up in the morning, what makes you scream?",
    "What tiny thing ruins your mood instantly?",
    "What sound do you wish you never had to hear again?",
    "What always makes you feel seen?",
    "What’s one thing you wish people understood about you?",
    "What’s your biggest daily annoyance?",
    "What makes you feel unreasonably proud?",
    "What’s a small kindness you still remember?",
  ],
  fr: [
    "Au réveil, qu’est-ce qui te fait crier ?",
    "Quel petit détail te gâche instantanément la journée ?",
    "Quel bruit voudrais-tu ne plus jamais entendre ?",
    "Qu’est-ce qui te fait te sentir vraiment compris·e ?",
    "Qu’aimerais-tu que les gens comprennent mieux à ton sujet ?",
    "Quelle petite contrariété te colle tous les jours ?",
    "Qu’est-ce qui te rend fier·e sans raison ?",
    "Quelle petite gentillesse te reste en mémoire ?",
  ],
  ru: [
    "Когда просыпаешься, что заставляет тебя кричать?",
    "Какая мелочь мгновенно портит настроение?",
    "Какой звук ты хотел(а) бы никогда не слышать?",
    "Что заставляет тебя чувствовать себя понятым(ой)?",
    "Что бы ты хотел(а), чтобы люди лучше понимали в тебе?",
    "Какая ежедневная мелочь тебя бесит?",
    "Из-за чего ты гордишься без причины?",
    "Какую маленькую доброту ты до сих пор помнишь?",
  ],
  zh: [
    "早上起床时，什么让你想尖叫？",
    "什么小事会瞬间毁掉你的心情？",
    "你最不想再听到的声音是什么？",
    "什么会让你觉得被真正理解？",
    "你希望别人更理解你什么？",
    "你每天最烦的一件小事是什么？",
    "什么事会让你无缘无故地自豪？",
    "你一直记得的一次小小善意是什么？",
  ],
};

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

export function pickMoodFeedPrompt(locale = "en") {
  const key = normalizeLocale(locale);
  const list = PROMPTS[key] || PROMPTS.en;
  if (!list.length) return PROMPTS.en[0];
  return list[Math.floor(Math.random() * list.length)];
}

export { PROMPTS as moodFeedPrompts };
