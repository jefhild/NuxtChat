export const useAvatarGenerator = () => {
const styleMap = {
  1: [
    // Male
    "adventurer",
    "adventurer-neutral",
    "micah",
    "notionists",
    "avataaars",
  ],
  2: [
    // Female
    "lorelei",
    "avataaars",
    "notionists",
    "croodles",
    "croodles-neutral",
  ],
  3: [
    // AI / Non-gendered / Other
    "bottts",
    "big-ears",
    "identicon",
    "shapes",
    "fun-emoji",
    "initials",
    "icons",
  ],
};

  const getRandomStyle = (genderId) => {
    const styles = styleMap[genderId] || styleMap[2]; // Default to female
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const getPreviewAvatarUrl = (seed, style) => {
    return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}`;
  };

  return {
    getPreviewAvatarUrl,
    getRandomStyle,
  };
};
