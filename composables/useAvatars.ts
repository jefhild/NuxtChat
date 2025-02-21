import { ref } from "vue";

export function useAvatars() {
  const photopath = ref("");
  const genderId = ref(0);
  const file = ref<File | null>(null);
  const avatars = ref<string[]>([]);
  const avatarIndex = ref<number>(0);

  // Load avatars based on genderId directly
  const loadAvatars = (genderId: number) => {
    if (genderId === 1) {
      avatars.value = [
        "/images/avatars/ai/male_avatar_1.webp",
        "/images/avatars/ai/male_avatar_2.webp",
        "/images/avatars/ai/male_avatar_3.webp",
        "/images/avatars/ai/male_avatar_4.webp",
      ];
    } else if (genderId === 2) {
      avatars.value = [
        "/images/avatars/ai/female_avatar_1.webp",
        "/images/avatars/ai/female_avatar_2.webp",
        "/images/avatars/ai/female_avatar_3.webp",
        "/images/avatars/ai/female_avatar_4.webp",
      ];
    } else if (genderId === 3) {
      avatars.value = [
        "/images/avatars/ai/trans_avatar_1.webp",
        "/images/avatars/ai/trans_avatar_2.webp",
        "/images/avatars/ai/trans_avatar_3.webp",
        "/images/avatars/ai/trans_avatar_4.webp",
      ];
    } else {
      // Provide a default in case the genderId is invalid
      avatars.value = ["/images/avatars/ai/default_avatar_1.webp"];
    }
    avatarIndex.value = 0; // Reset to the first avatar when gender changes
  };

  const prevAvatar = () => {
    if (avatarIndex.value > 0) {
      avatarIndex.value--;
    }
  };

  const nextAvatar = () => {
    if (avatarIndex.value < avatars.value.length - 1) {
      avatarIndex.value++;
    }
  };

  return {
    photopath,
    genderId,
    file,
    avatars,
    avatarIndex,
    loadAvatars,
    prevAvatar,
    nextAvatar,
  };
}
