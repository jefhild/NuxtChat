export const FOOTER_INTERNAL_LINKS = Object.freeze([
  { path: "/about", labelKey: "components.footer.about" },
  { path: "/faq", labelKey: "components.footer.faq" },
  { path: "/compare", labelKey: "components.footer.compare" },
  { path: "/guides", labelKey: "components.footer.guides" },
  { path: "/topics", labelKey: "components.footer.topics" },
  { path: "/talk-to-strangers-online", labelKey: "components.footer.talk-to-strangers" },
  { path: "/need-someone-to-talk-to", labelKey: "components.footer.need-to-talk" },
  { path: "/cant-sleep-chat", labelKey: "components.footer.cant-sleep-chat" },
  { path: "/terms", labelKey: "components.footer.terms" },
  { path: "/privacy", labelKey: "components.footer.privacy" },
  { path: "/cookies", labelKey: "components.footer.cookies" },
  { path: "/profiles", labelKey: "components.footer.public-profiles" },
]);

export const FOOTER_SOCIAL_LINKS = Object.freeze([
  {
    href: "https://github.com/jefhild/NuxtChat",
    icon: "mdi-github",
    ariaLabel: "GitHub",
  },
  {
    href: "https://www.instagram.com/imchatty_site/",
    icon: "mdi-instagram",
    ariaLabel: "Instagram",
  },
  {
    href: "https://www.facebook.com/61585988489093/",
    icon: "mdi-facebook",
    ariaLabel: "Facebook",
  },
  {
    href: "https://www.reddit.com/r/imchatty_news/",
    icon: "mdi-reddit",
    ariaLabel: "Reddit",
  },
]);

export const FOOTER_TOGGLE_ROUTE_PATHS = Object.freeze(
  FOOTER_INTERNAL_LINKS.map((link) => link.path)
);
