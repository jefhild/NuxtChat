export const useAvatarGenerator = () => {
  const styleMap = {
    1: ["adventurer", "micah", "male"],
    2: ["avataaars", "notionists", "female"],
    3: ["big-ears", "lorelei", "bottts"],
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
