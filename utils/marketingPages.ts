type MarketingFaq = {
  question: string;
  answer: string;
};

type MarketingLink = {
  label: string;
  href: string;
};

export type MarketingPageSection = "Topic" | "Guide";

export type MarketingPage = {
  sectionLabel: MarketingPageSection;
  title: string;
  subtitle: string;
  heroTitle: string;
  heroBody: string;
  body: string;
  highlights: string[];
  faqs: MarketingFaq[];
  relatedLinks: MarketingLink[];
  ctaHref: string;
  ctaLabel: string;
  metaTitle: string;
  metaDescription: string;
};

const languagePracticeLandingCopy = {
  english: {
    title: "Practice English Chat Online",
    subtitle:
      "Build more natural English through text chat, small corrections, and real conversation.",
    heroTitle: "Practice English Chat Online Without Turning It Into a Lesson",
    heroBody:
      "English practice gets better when you can try real sentences, notice what sounds natural, and keep the conversation moving.",
    body: [
      "## Why English chat practice feels different from studying English",
      "A lot of English learners know more than they can comfortably use. They can read an article, pass a grammar quiz, or recognize a word in a video, then freeze when a simple reply is needed. That gap is normal. Chat practice is useful because it trains the small decisions that happen inside a real conversation.",
      "English is especially awkward because correct English and natural English are not always the same thing. A sentence can be grammatical and still sound stiff. Native and fluent speakers shorten things, use phrasal verbs, leave out obvious words, and choose softer wording depending on the situation.",
      "Text chat gives you time to notice those patterns without the pressure of live speaking. You can write a message, reread it, change one word, and still have a real exchange with another person.",
      "## What English learners usually need more of",
      "The hard parts of English are rarely limited to vocabulary. Learners often need practice with articles, prepositions, phrasal verbs, word order, tone, and the difference between direct and polite wording. They also need to see which phrases people actually use in casual chat.",
      "For example, a textbook might teach a complete sentence. A real chat might use a shorter reply, a question tag, or a quick phrase like 'sounds good', 'I am not sure yet', or 'that makes sense'. Those small pieces are what make English feel usable.",
      "## How to use ImChatty for English practice",
      "Start with a simple topic you would actually talk about: your day, music, food, work, movies, school, travel, games, or something you are curious about. Then decide whether you want gentle correction or a more active coaching style.",
      "If you want natural conversation, ask your partner to correct only the sentences that sound confusing or unnatural. If you are preparing for work, study, or travel, ask for more direct feedback. AI tutors can also help when you want immediate practice before talking with a real person.",
      "## What makes a good English chat partner",
      "A good English partner does not need to act like a strict teacher. The best partner is patient, clear, and willing to explain why one phrase sounds better than another. They can help you with everyday wording, not only formal grammar.",
      "Useful correction often looks small: replacing one preposition, suggesting a more common verb, or showing a more relaxed way to say the same thing. Those small fixes build confidence faster than long grammar lectures.",
      "## Practice that sounds like real life",
      "English is used globally, so there is no single perfect version of casual English. You may meet people with different accents, spelling habits, slang, and cultural references. That is part of the value. Real chat helps you understand English as people actually use it online.",
      "You do not need perfect English to start. You need a place where mistakes are expected, corrections are useful, and the conversation gives you a reason to keep writing.",
    ].join("\n\n"),
    highlights: [
      "Practice natural English instead of only textbook sentences",
      "Work on phrasal verbs, articles, tone, and everyday replies",
      "Choose light corrections or active coaching",
      "Use real people, AI tutors, or both",
      "Start with text before speaking feels comfortable",
    ],
    relatedLinks: [
      { label: "Language exchange chat", href: "/language-exchange-chat" },
      { label: "Practice French chat online", href: "/practice-french-chat-online" },
      { label: "Practice Chinese chat online", href: "/practice-chinese-chat-online" },
      { label: "Practice Russian chat online", href: "/practice-russian-chat-online" },
      { label: "Language practice", href: "/language-practice" },
    ],
    faqs: [
      {
        question: "Can I practice English with real people?",
        answer:
          "Yes. You can use language practice filters to look for people who can help with English, and you can use AI tutors when you want immediate practice.",
      },
      {
        question: "What should I ask an English partner to correct?",
        answer:
          "Ask for the correction style you actually want: light fixes for confusing sentences, more active coaching, or notes on what sounds natural in casual English.",
      },
      {
        question: "Is text chat useful before speaking practice?",
        answer:
          "Yes. Text chat gives you more time to choose words, notice patterns, and build confidence before faster spoken conversation.",
      },
    ],
    metaTitle: "Practice English Chat Online | ImChatty",
    metaDescription:
      "Practice English chat online with real people or AI tutors. Build natural phrasing, confidence, and everyday conversation skills through text.",
    ctaLabel: "Practice English",
    ctaHref: "/language-practice",
  },
  french: {
    title: "Practice French Chat Online",
    subtitle:
      "Use French in real conversation while getting practical help with tone, gender, verbs, and natural phrasing.",
    heroTitle: "Practice French Chat Online With More Than Flashcards",
    heroBody:
      "French becomes easier to use when you can write real messages, test natural phrasing, and get corrections that respect the flow of the conversation.",
    body: [
      "## French practice needs context",
      "French learners often know the rule but hesitate when it is time to use it. Is it tu or vous? Does this noun take le or la? Should the sentence sound casual, polite, or too formal for a normal chat? Those decisions are hard to train with drills alone.",
      "Online French chat gives you context. A short exchange can show how people soften a request, react to a joke, agree without sounding stiff, or change register depending on who they are talking to.",
      "## The details that make French feel natural",
      "French has several features that learners need to meet inside real sentences: gender, adjective agreement, verb tense, pronouns, negation, and small connecting phrases. Spoken French also drops or compresses parts of sentences in ways that can surprise learners who studied mostly from books.",
      "Text chat is useful because it lets you slow those details down. You can see the written form, ask why a correction was made, and try the same structure again a few messages later.",
      "## Tu, vous, and tone",
      "One of the most practical reasons to practice French with people is tone. Learners often translate too directly from their native language. The result may be understandable but a little blunt, overly formal, or strangely written.",
      "A good partner can help you choose between casual and polite phrasing. They can also point out when something sounds like a classroom sentence instead of something someone would type naturally.",
      "## Pronunciation still matters, even in text",
      "Text chat will not replace listening and speaking, but it can prepare you for them. Written practice helps you notice accents, silent endings, word families, and the structure behind sounds like nasal vowels and liaison. Once the sentence makes sense on the page, it is easier to practice saying it later.",
      "You can also ask an AI tutor or a fluent partner to rewrite a sentence in a more spoken style. That bridges the gap between written French and the French you hear in conversation.",
      "## How to practice French on ImChatty",
      "Pick a correction style before you begin. If you want a relaxed conversation, ask for light corrections. If you are preparing for travel, school, or a test, ask for more direct coaching. If you want natural French, ask your partner to rewrite one or two messages the way they would actually say them.",
      "Use simple topics at first: what you did today, what you are eating, what you are watching, where you live, what you like, or what you are planning. The goal is not to sound impressive. The goal is to keep French active.",
      "## A better first step than waiting until you feel ready",
      "Many people wait too long to use French because they think conversation requires confidence first. Usually confidence comes after using the language imperfectly and surviving the moment. Text chat makes that first step smaller.",
      "You can write slowly, ask questions, accept corrections, and keep going. Over time, the grammar stops being a separate exercise and becomes part of how you express yourself.",
    ].join("\n\n"),
    highlights: [
      "Practice tu, vous, politeness, and casual French tone",
      "Get help with gender, agreement, verbs, and pronouns",
      "Use text to slow down tricky French structures",
      "Ask for light correction or active coaching",
      "Bridge written French and spoken phrasing",
    ],
    relatedLinks: [
      { label: "Language exchange chat", href: "/language-exchange-chat" },
      { label: "Practice English chat online", href: "/practice-english-chat-online" },
      { label: "Practice Russian chat online", href: "/practice-russian-chat-online" },
      { label: "Practice Chinese chat online", href: "/practice-chinese-chat-online" },
      { label: "Language practice", href: "/language-practice" },
    ],
    faqs: [
      {
        question: "Can beginners practice French in chat?",
        answer:
          "Yes. Beginners can start with short messages, simple topics, and light correction. Text chat gives learners time to think before replying.",
      },
      {
        question: "What should I focus on when practicing French?",
        answer:
          "Useful focus areas include gender, agreement, verb tense, pronouns, tu versus vous, and whether a phrase sounds natural in casual conversation.",
      },
      {
        question: "Can French chat help with speaking later?",
        answer:
          "Yes. Writing sentences and seeing corrections makes the structure clearer, which can make later speaking practice less intimidating.",
      },
    ],
    metaTitle: "Practice French Chat Online | ImChatty",
    metaDescription:
      "Practice French chat online with real people or AI tutors. Work on tone, gender, verbs, and natural everyday phrasing through text.",
    ctaLabel: "Practice French",
    ctaHref: "/language-practice",
  },
  russian: {
    title: "Practice Russian Chat Online",
    subtitle:
      "Build confidence with Cyrillic, cases, aspect, and real Russian conversation at a manageable pace.",
    heroTitle: "Practice Russian Chat Online Without Rushing Every Sentence",
    heroBody:
      "Russian practice works better when you can slow the sentence down, see the endings, ask why they changed, and try again in a real exchange.",
    body: [
      "## Russian rewards slow, repeated conversation",
      "Russian can feel heavy at first because so much meaning is packed into endings, verb choice, and word order. A learner may understand the idea of cases but still need time to choose the right form while writing a normal message.",
      "That is where chat practice helps. Text gives you a little breathing room. You can type in Cyrillic, check a word, notice an ending, and ask for a correction without the whole conversation collapsing.",
      "## The main challenge is not only vocabulary",
      "Russian learners often need practice with case endings, verb aspect, motion verbs, gender agreement, and flexible word order. These are not isolated grammar topics in real conversation. They appear together in simple sentences like where you went, what you bought, who you talked to, or what you plan to do tomorrow.",
      "A chat partner can correct one piece at a time. That matters because too much correction at once makes Russian feel impossible. A useful correction might simply show the right case after a preposition, or explain why one verb aspect fits better than another.",
      "## Cyrillic gets easier when you actually use it",
      "Some learners stay in transliteration too long because Cyrillic looks like a barrier. Text chat makes the alphabet practical. You see words repeatedly, type them in context, and connect the letters with real meaning instead of copying them from a chart.",
      "Using Cyrillic also helps partners correct you more clearly. It makes spelling, endings, and word forms visible in a way transliteration often hides.",
      "## Aspect, cases, and patience",
      "Russian correction works best when expectations are clear. If you want a relaxed chat, ask for only the most important fixes. If you are studying seriously, ask for case and aspect notes. If you are a beginner, ask your partner to rewrite one sentence at a time rather than marking every mistake.",
      "AI tutors can be useful for focused repetition: practicing one case, one verb pair, or one situation until it stops feeling abstract. Real people are useful for the living part of the language: humor, everyday replies, natural pacing, and cultural context.",
      "## Topics that work well for Russian practice",
      "Start with concrete topics. Daily routine, food, weather, travel, hobbies, family, work, films, music, and weekend plans create the kinds of sentences Russian learners need most. These topics naturally bring in cases, time phrases, motion, and verbs of wanting, liking, going, watching, reading, and meeting.",
      "You do not need complicated subjects at the start. You need many small sentences that force the language to become usable.",
      "## Make mistakes visible, not embarrassing",
      "The best Russian practice environment is one where mistakes are treated as information. An ending changes, a verb pair was wrong, or the word order sounded odd. That is not failure. It is the exact feedback a learner needs.",
      "Text-first practice makes those moments easier to handle. You can look at the correction, compare it with your original sentence, ask a follow-up question, and continue the conversation.",
    ].join("\n\n"),
    highlights: [
      "Practice Cyrillic in real messages",
      "Get manageable help with cases, aspect, and endings",
      "Use text chat to slow down difficult sentences",
      "Choose focused coaching or relaxed conversation",
      "Work with real people, AI tutors, or both",
    ],
    relatedLinks: [
      { label: "Language exchange chat", href: "/language-exchange-chat" },
      { label: "Practice English chat online", href: "/practice-english-chat-online" },
      { label: "Practice French chat online", href: "/practice-french-chat-online" },
      { label: "Practice Chinese chat online", href: "/practice-chinese-chat-online" },
      { label: "Language practice", href: "/language-practice" },
    ],
    faqs: [
      {
        question: "Is Russian chat practice useful for beginners?",
        answer:
          "Yes. Beginners can start with simple topics and ask for limited corrections, especially around Cyrillic, cases, and basic verb forms.",
      },
      {
        question: "Should I type Russian in Cyrillic?",
        answer:
          "Cyrillic is usually better for practice because spelling and endings are easier to see and correct. Transliteration can help at the start, but it hides useful details.",
      },
      {
        question: "Can AI help with Russian grammar practice?",
        answer:
          "Yes. AI tutors can drill cases, aspect, and sentence rewrites, while real people can help with natural conversation and cultural context.",
      },
    ],
    metaTitle: "Practice Russian Chat Online | ImChatty",
    metaDescription:
      "Practice Russian chat online with real people or AI tutors. Build confidence with Cyrillic, cases, aspect, and everyday conversation.",
    ctaLabel: "Practice Russian",
    ctaHref: "/language-practice",
  },
  chinese: {
    title: "Practice Chinese Chat Online",
    subtitle:
      "Practice Mandarin Chinese through text chat, pinyin support, character exposure, and practical sentence feedback.",
    heroTitle: "Practice Chinese Chat Online at a Pace You Can Actually Use",
    heroBody:
      "Chinese practice gets easier when you can build a sentence slowly, see characters in context, and get feedback on word choice, particles, and natural phrasing.",
    body: [
      "## Chinese chat practice gives you time to think",
      "Many learners of Mandarin Chinese can recognize words in an app but struggle to create a sentence in a real conversation. The problem is not laziness. Chinese asks you to manage word order, measure words, particles, tone memory, characters, and context at the same time.",
      "Text chat slows the process down. You can type with pinyin, choose characters, check whether the sentence looks right, and send something short enough to get a useful reply.",
      "## Characters, pinyin, and real use",
      "Pinyin is helpful, especially early on, but Chinese becomes more durable when you see characters used in meaningful messages. Chat practice helps because the same words appear in context instead of as isolated flashcards.",
      "A good partner can respond with characters, add pinyin when needed, and explain why a word choice sounds natural or strange. That kind of feedback is hard to get from a vocabulary list.",
      "## The details learners need to practice",
      "Chinese learners often need help with measure words, word order, time phrases, question forms, and particles like le, guo, zhe, ma, ne, and ba. These are small pieces, but they change how a sentence feels.",
      "For example, a learner may know the words for 'I', 'yesterday', 'watch', and 'movie', but still need practice putting time before the verb, choosing the right aspect marker, or deciding whether the sentence needs a measure word. Real chat turns those choices into habits.",
      "## Tones still matter in a text-first space",
      "Text chat will not train pronunciation by itself, but it can support tone memory. Seeing pinyin with tone marks, asking for a word to be read aloud later, or comparing similar-sounding words can make spoken practice easier.",
      "If you are nervous about speaking Chinese, text is a practical bridge. You can build sentence confidence first, then use audio or speaking practice when you are ready.",
      "## How to use ImChatty for Chinese practice",
      "Set your goal before you start. If you want casual Mandarin, ask for natural rewrites. If you are studying HSK-style vocabulary, ask for focused corrections. If characters feel overwhelming, ask your partner or AI tutor to include pinyin beside new words.",
      "Use everyday topics: food, family, work, school, weather, hobbies, travel, music, games, and plans. Those topics repeatedly use the structures learners need most, and they make the practice feel like conversation instead of homework.",
      "## Mandarin, Chinese, and clarity",
      "People often say 'Chinese' when they mean Mandarin, but Chinese includes many spoken varieties. This page focuses on Mandarin Chinese practice because that is the most common learning goal for online learners. If you are looking for another variety, be clear in your profile or first message so partners know what kind of help you need.",
      "## Make the first message simple",
      "A strong Chinese practice chat can start with one short sentence: what you are learning, what you want corrected, and what topic you want to talk about. The sentence does not need to be perfect. It only needs to begin the exchange.",
      "Once the conversation starts, each correction has a place. A measure word, a particle, a character choice, or a more natural word order becomes easier to remember because it was connected to something you were trying to say.",
    ].join("\n\n"),
    highlights: [
      "Practice Mandarin Chinese through text-first conversation",
      "Use pinyin support while building character recognition",
      "Get help with measure words, particles, and word order",
      "Ask for natural rewrites or focused corrections",
      "Prepare for speaking by strengthening sentence confidence",
    ],
    relatedLinks: [
      { label: "Language exchange chat", href: "/language-exchange-chat" },
      { label: "Practice English chat online", href: "/practice-english-chat-online" },
      { label: "Practice French chat online", href: "/practice-french-chat-online" },
      { label: "Practice Russian chat online", href: "/practice-russian-chat-online" },
      { label: "Language practice", href: "/language-practice" },
    ],
    faqs: [
      {
        question: "Does this page mean Mandarin Chinese?",
        answer:
          "Yes. Most online learners searching for Chinese practice mean Mandarin, so the guidance here focuses on Mandarin Chinese.",
      },
      {
        question: "Can I use pinyin while practicing Chinese?",
        answer:
          "Yes. Pinyin can help early on, and you can ask partners or AI tutors to include pinyin beside new characters when useful.",
      },
      {
        question: "Is text chat enough for Chinese pronunciation?",
        answer:
          "Text chat does not replace pronunciation practice, but it helps you build vocabulary, sentence structure, character recognition, and confidence before speaking.",
      },
    ],
    metaTitle: "Practice Chinese Chat Online | ImChatty",
    metaDescription:
      "Practice Chinese chat online with real people or AI tutors. Build Mandarin sentence confidence with pinyin, characters, and practical corrections.",
    ctaLabel: "Practice Chinese",
    ctaHref: "/language-practice",
  },
} as const;

const pageCopy = {
  en: {
    common: {
      ctaLabel: "Start Chat",
      faqAnonymous: "Is it anonymous?",
      faqAnonymousAnswer:
        "ImChatty is designed to let people start text conversations without making their identity the first thing they share.",
      faqSignup: "Do I need to sign up first?",
      faqSignupAnswer:
        "You can start quickly without forcing a full registration flow up front. The goal is to reduce friction at the moment you want a conversation.",
      faqVideo: "Do I need to use video?",
      faqVideoAnswer:
        "No. The experience is centered on text-first conversation, which keeps the first interaction lower pressure.",
    },
    anonymousChat: {
      title: "Anonymous Chat",
      subtitle: "Start an anonymous text conversation with real people.",
      heroTitle: "Anonymous Chat With Real People",
      heroBody:
        "Start talking without turning your identity, profile, or camera into the first step.",
      body: [
        "## Why people choose anonymous chat",
        "Sometimes the hardest part of chatting online is not the conversation itself. It is the setup. Profiles, cameras, signup walls, and too many decisions create friction before you have even said hello. Anonymous chat works because it lets people begin with less pressure.",
        "## What makes ImChatty different",
        "ImChatty is built around text-first conversation. You can start talking quickly, stay low pressure, and decide later how much you want to share. The point is to get into the conversation, not get stuck in the platform.",
        "## When anonymous chat is a good fit",
        "Use anonymous chat when you want a simple first interaction, when you do not want video, or when you just want to talk to someone without overcomplicating the moment. It is especially useful when you want privacy at the start and flexibility later.",
        "## What happens next",
        "If the conversation feels good, you can keep going. If you want a more tailored experience later, registration can support better matching and mood placement. But the first step stays simple: start talking.",
      ].join("\n\n"),
      highlights: [
        "Keep your identity private at the start",
        "Start with text instead of video",
        "Share more later only if it feels right",
      ],
      relatedLinks: [
        { label: "Chat without signup", href: "/chat-without-signup" },
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Meet new people online", href: "/meet-new-people-online" },
      ],
      metaTitle: "Anonymous Chat With Real People | ImChatty",
      metaDescription:
        "Start anonymous chat with real people on ImChatty. Text-first, low pressure, and designed to help you begin a conversation fast.",
    },
    chatWithoutSignup: {
      title: "Chat Without Signup",
      subtitle: "Start talking without turning signup into the main event.",
      heroTitle: "Chat Without Signup",
      heroBody:
        "Get into the conversation quickly, then decide later whether you want a fuller account experience.",
      body: [
        "## Start first, decide later",
        "Most people do not visit a chat site because they want to fill out forms. They come because they want a conversation. Chat without signup works because it removes the delay between interest and action.",
        "## What you should expect here",
        "ImChatty is built to let you start with less friction. You can get into chat first, keep the experience text-first, and decide later whether registration is worth it for better matching and mood placement.",
        "## Who this is for",
        "This is a good fit for people who want to try the product quickly, who are not ready to build a full profile, or who simply do not want account creation to be the barrier between them and a real conversation.",
        "## Why registration can still matter later",
        "Signup should not be the first hurdle, but it can still add value once someone wants more control. Registered users can support stronger matching, better mood placement, and a more tailored chat experience over time.",
      ].join("\n\n"),
      highlights: [
        "Get into chat without a long setup flow",
        "Try the product before committing to a profile",
        "Register later for better matching and mood placement",
      ],
      relatedLinks: [
        { label: "Anonymous chat", href: "/anonymous-chat" },
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Meet new people online", href: "/meet-new-people-online" },
      ],
      metaTitle: "Chat Without Signup | Start Fast On ImChatty",
      metaDescription:
        "Start chatting without signup on ImChatty. A faster, lower-friction way to begin a real text conversation online.",
    },
    anonymousTextChat: {
      title: "Mood-Based Chat",
      subtitle:
        "A simple text-first matching tool that helps people start talking based on how they feel right now.",
      heroTitle: "Mood-Based Chat",
      heroBody:
        "Choose your mood, start with text, and connect with someone looking for a similar kind of conversation.",
      body: [
        "## Start with how you feel",
        "Sometimes the easiest way to begin a conversation is not by browsing profiles or picking a topic. It is by saying how you feel right now. Mood-based text chat gives people a simpler starting point and makes the first message feel more natural.",
        "## How matching by mood helps",
        "ImChatty can use a simple mood signal to bring together people who want a similar kind of conversation in the same moment. Bored people can find bored people. Curious people can find curious people. People who want a lighter conversation can avoid landing in the wrong room.",
        "## Who this works for",
        "This is useful when you want to talk to someone who is in a similar headspace. If you are bored, restless, curious, or just looking for an easy conversation, mood-based matching gives you a better place to start than a generic chat room.",
        "## A simpler way to connect",
        "Instead of dropping everyone into the same experience, ImChatty can use mood to help people find a conversation that fits the moment. That makes the first message easier and gives the conversation a better chance of going somewhere.",
      ].join("\n\n"),
      highlights: [
        "Match with people in a similar headspace",
        "Text-first conversation from the first message",
        "A better starting point than a generic chat room",
      ],
      relatedLinks: [
        { label: "Anonymous chat", href: "/anonymous-chat" },
        { label: "Chat without signup", href: "/chat-without-signup" },
        { label: "Meet new people online", href: "/meet-new-people-online" },
      ],
      metaTitle: "Mood-Based Chat | ImChatty",
      metaDescription:
        "Start mood-based chat on ImChatty with a simple text-first matching flow. Lower pressure, better context, and easier to start.",
    },
    meetNewPeopleOnline: {
      title: "Meet New People Online",
      subtitle: "Use chat to start simple conversations with someone new.",
      heroTitle: "Meet New People Through Chat",
      heroBody:
        "Start with text, keep it simple, and see where a new conversation leads.",
      body: [
        "## A simpler way to meet someone new",
        "A lot of people are not looking for another complicated social platform. They just want a simple way to talk to someone new without a lot of performance, scrolling, or profile work up front.",
        "## How people actually use this",
        "Most people are not trying to build a polished profile before they meet someone. They want to say hello, see if the conversation feels easy, and decide from there whether they want to keep talking.",
        "## Why chat works better than browsing",
        "A conversation tells you more than a profile ever will. Instead of spending time comparing photos, bios, or status labels, you can find out quickly whether someone is funny, kind, curious, or simply easy to talk to.",
        "## A better first step",
        "Meeting someone new online feels easier when the first step is small. A simple text conversation gives people room to relax, feel things out, and connect without turning the moment into a performance.",
      ].join("\n\n"),
      highlights: [
        "Meet someone new by starting with conversation",
        "Learn more from a chat than from browsing profiles",
        "A smaller, easier first step than social apps",
      ],
      relatedLinks: [
        { label: "Anonymous chat", href: "/anonymous-chat" },
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Chat without signup", href: "/chat-without-signup" },
      ],
      metaTitle: "Meet New People Online Through Chat | ImChatty",
      metaDescription:
        "Meet new people online through chat on ImChatty. Start a simple text conversation and keep the first interaction low pressure.",
    },
    talkToStrangersOnline: {
      title: "Talk to Strangers Online",
      subtitle: "A simple, text-first place to start a real conversation with someone you have never met.",
      heroTitle: "Talk to Strangers Online",
      heroBody:
        "The appeal of talking to strangers online has always been the same: a clean start, no history, and a conversation that goes wherever it goes.",
      body: [
        "## Why talking to strangers online still works",
        "There is something specific about a conversation with someone you do not know. It is not weighted down by shared history, mutual friends, or the usual social accounting. You can say what you actually think and see what comes back.",
        "## A better way to begin",
        "ImChatty focuses on text, which immediately reduces pressure. You are not managing how you look — you are just writing a message. Mood-based matching gives conversations a starting point so the first message is easier to write.",
        "## Who this is a good fit for",
        "People who want casual conversation, users who prefer text over video, and anyone who wants a clean start without their social network involved.",
      ].join("\n\n"),
      highlights: [
        "Start a real conversation without complicated setup",
        "Text-first means no camera pressure",
        "Mood matching gives the conversation a direction",
      ],
      relatedLinks: [
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Anonymous chat", href: "/anonymous-chat" },
        { label: "Meet new people online", href: "/meet-new-people-online" },
      ],
      metaTitle: "Talk to Strangers Online | ImChatty",
      metaDescription:
        "Start a text conversation with someone new on ImChatty. No video required, no complicated setup, no performance pressure.",
    },
    needSomeoneToTalkTo: {
      title: "Need Someone to Talk To",
      subtitle: "When you want a real conversation with someone who is actually there, this is a simple way to find one.",
      heroTitle: "Need Someone to Talk To?",
      heroBody:
        "Sometimes you just need someone on the other end of a conversation. ImChatty makes that easier to find.",
      body: [
        "## When you need to talk but do not know where to start",
        "There are moments when you want a conversation but everyone in your usual circle feels like the wrong choice. Maybe they are asleep. Maybe you just want to talk to someone who does not already know the context.",
        "## What this is and what it is not",
        "This is not a crisis service. What this is: a simple, low-pressure way to have a real conversation with another person. Text-based, anonymous if you want, and available when your usual options are not.",
        "## Getting started",
        "Pick a mood that fits how you are feeling, skip the signup if that is easier, and send a first message. Someone is usually there.",
      ].join("\n\n"),
      highlights: [
        "Start a real conversation in under a minute",
        "No camera, no profile performance",
        "Mood matching finds someone who wants the same kind of chat",
      ],
      relatedLinks: [
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Anonymous chat", href: "/anonymous-chat" },
        { label: "Can't sleep chat", href: "/cant-sleep-chat" },
      ],
      metaTitle: "Need Someone to Talk To? Start Here | ImChatty",
      metaDescription:
        "When you need someone to talk to, ImChatty gives you a fast, text-first way to start a real conversation — no signup wall, no camera pressure.",
    },
    cantSleepChat: {
      title: "Can't Sleep? Find Someone to Chat With",
      subtitle: "When it's late and your mind won't stop, sometimes a conversation is the simplest fix.",
      heroTitle: "Can't Sleep? Find Someone to Chat With",
      heroBody:
        "It is 2am, you are still awake, and staring at the ceiling is not helping. Sometimes the thing that actually works is just talking to someone.",
      body: [
        "## The specific problem with being awake at 2am",
        "Being unable to sleep is rarely just physical. Most of the time the body is tired but the mind will not cooperate. The feeling that someone else is awake on the other side of a conversation can help.",
        "## Why a chat is different from scrolling",
        "Opening a social feed at midnight usually makes things worse. A conversation is different — it requires something of you, which can pull your mind off whatever loop it has been running.",
        "## Who else is up right now",
        "Because ImChatty has users across many time zones, there is almost always someone awake somewhere. AI personas are also available at any hour without timezone dependency.",
      ].join("\n\n"),
      highlights: [
        "Available late at night when everyone else is offline",
        "Real people across time zones, plus AI personas",
        "Text-only — no camera, no bright lights",
      ],
      relatedLinks: [
        { label: "Mood-based chat", href: "/mood-based-chat" },
        { label: "Need someone to talk to", href: "/need-someone-to-talk-to" },
        { label: "Anonymous chat", href: "/anonymous-chat" },
      ],
      metaTitle: "Can't Sleep? Chat With Someone Online | ImChatty",
      metaDescription:
        "Can't sleep and want to talk to someone? ImChatty is available late at night with real people and AI personas ready to chat.",
    },
    practiceEnglishChatOnline: languagePracticeLandingCopy.english,
    practiceFrenchChatOnline: languagePracticeLandingCopy.french,
    practiceRussianChatOnline: languagePracticeLandingCopy.russian,
    practiceChineseChatOnline: languagePracticeLandingCopy.chinese,
  },
} as const;

const pageDefinitions = {
  "anonymous-chat": {
    sectionLabel: "Topic",
    key: "anonymousChat",
  },
  "chat-without-signup": {
    sectionLabel: "Guide",
    key: "chatWithoutSignup",
  },
  "mood-based-chat": {
    sectionLabel: "Topic",
    key: "anonymousTextChat",
  },
  "meet-new-people-online": {
    sectionLabel: "Topic",
    key: "meetNewPeopleOnline",
  },
  "talk-to-strangers-online": {
    sectionLabel: "Topic",
    key: "talkToStrangersOnline",
  },
  "need-someone-to-talk-to": {
    sectionLabel: "Guide",
    key: "needSomeoneToTalkTo",
  },
  "cant-sleep-chat": {
    sectionLabel: "Topic",
    key: "cantSleepChat",
  },
  "practice-english-chat-online": {
    sectionLabel: "Guide",
    key: "practiceEnglishChatOnline",
  },
  "practice-french-chat-online": {
    sectionLabel: "Guide",
    key: "practiceFrenchChatOnline",
  },
  "practice-russian-chat-online": {
    sectionLabel: "Guide",
    key: "practiceRussianChatOnline",
  },
  "practice-chinese-chat-online": {
    sectionLabel: "Guide",
    key: "practiceChineseChatOnline",
  },
} as const;

type PageSlug = keyof typeof pageDefinitions;

const normalizeLocale = (value?: string | null) =>
  String(value || "en")
    .trim()
    .toLowerCase()
    .split("-")[0] || "en";

export function getMarketingPage(slug: string, locale?: string | null): MarketingPage | null {
  const normalizedSlug = String(slug || "").trim().toLowerCase() as PageSlug;
  const pageDefinition = pageDefinitions[normalizedSlug];
  if (!pageDefinition) return null;

  const copy =
    pageCopy[normalizeLocale(locale) as keyof typeof pageCopy] || pageCopy.en;
  const page = copy[pageDefinition.key];
  const common = copy.common;
  if (!page) return null;

  return {
    sectionLabel: pageDefinition.sectionLabel,
    title: page.title,
    subtitle: page.subtitle,
    heroTitle: page.heroTitle,
    heroBody: page.heroBody,
    body: page.body,
    highlights: [...page.highlights],
    relatedLinks: [...page.relatedLinks],
    faqs: "faqs" in page
      ? [...page.faqs]
      : [
          {
            question: common.faqAnonymous,
            answer: common.faqAnonymousAnswer,
          },
          {
            question: common.faqSignup,
            answer: common.faqSignupAnswer,
          },
          {
            question: common.faqVideo,
            answer: common.faqVideoAnswer,
          },
        ],
    ctaHref: "ctaHref" in page ? page.ctaHref : "/chat",
    ctaLabel: "ctaLabel" in page ? page.ctaLabel : common.ctaLabel,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
  };
}
