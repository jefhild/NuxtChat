export const ABOUT_SECTION_KEYS = [
  "welcome",
  "who_we_are",
  "our_mission",
  "unique_approach",
  "building_community",
  "looking_ahead",
  "join_us",
] as const;

export type AboutSectionKey = (typeof ABOUT_SECTION_KEYS)[number];

export const ABOUT_SECTION_DEFINITIONS: Array<{
  key: AboutSectionKey;
  label: string;
  titleKey: string;
  bodyKey?: string;
}> = [
  {
    key: "welcome",
    label: "Welcome",
    titleKey: "pages.about.page.welcome-title",
    bodyKey: "pages.about.page.welcome-text",
  },
  {
    key: "who_we_are",
    label: "Who We Are",
    titleKey: "pages.about.page.who_we_are-title",
  },
  {
    key: "our_mission",
    label: "Our Mission",
    titleKey: "pages.about.page.our_mission-title",
    bodyKey: "pages.about.page.our_mission-text",
  },
  {
    key: "unique_approach",
    label: "Unique Approach",
    titleKey: "pages.about.page.unique_approach-title",
    bodyKey: "pages.about.page.unique_approach-text",
  },
  {
    key: "building_community",
    label: "Building Community",
    titleKey: "pages.about.page.building_community-title",
    bodyKey: "pages.about.page.building_community-text",
  },
  {
    key: "looking_ahead",
    label: "Looking Ahead",
    titleKey: "pages.about.page.looking_ahead-title",
    bodyKey: "pages.about.page.looking_ahead-text",
  },
  {
    key: "join_us",
    label: "Join Us",
    titleKey: "pages.about.page.join_us-title",
    bodyKey: "pages.about.page.join_us-text",
  },
];

