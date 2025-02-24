/**
 * Composable to map gender_id to a corresponding avatar URL,
 * but only if the current avatar URL is empty or null.
 * @returns {function} - A function to get the avatar URL based on gender_id.
 */
export default function useAvatarMapper() {
  const getAvatarUrl = (currentAvatarUrl, genderId) => {
    // Return the existing avatar if it's not empty or null
    if (currentAvatarUrl) {
      return currentAvatarUrl;
    }

    // Default avatar mapping
    const avatarUrls = {
      1: "/images/avatars/ai/male_avatar_1.webp", // Male avatar
      2: "/images/avatars/ai/female_avatar_1.webp", // Female avatar
      3: "/images/avatars/ai/trans_avatar_1.webp", // Other avatar
    };

    return avatarUrls[genderId] || "default_avatar_url"; // Default fallback
  };

  return { getAvatarUrl };
}
