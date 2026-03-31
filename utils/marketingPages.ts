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
    faqs: [
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
    ctaHref: "/chat",
    ctaLabel: common.ctaLabel,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
  };
}
