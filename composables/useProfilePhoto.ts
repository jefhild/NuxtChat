import { ref } from "vue";
import { useSupabaseClient, useRuntimeConfig } from "#imports";

export function useProfilePhoto() {
  const supabase = useSupabaseClient();
  const config = useRuntimeConfig();
  const photopath = ref("");
  const genderId = ref(0);
  const file = ref<File | null>(null); // Define the file as File | null
  const selectedGender = ref<string>("male");
  const avatars = ref<string[]>([]);
  const avatarIndex = ref<number>(0);
  // Ensure selectedGender is initialized as a number
  // const selectedGender = ref(1);

  type Profile = {
    user_id: string;
    avatar_url: string | null;
    displayname: string;
    tagline: string;
    age: number;
    provider: string;
    gender_id: number;
    country_id: number;
  };

  const getProfilePhoto = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile data:", error);
      return "";
    }

    genderId.value = data.gender_id;

    if (!data.avatar_url) {
      switch (genderId.value) {
        case 1:
          return "/images/avatars/ai/male_avatar_1.webp";
        case 2:
          return "/images/avatars/ai/female_avatar_1.webp";
        case 3:
          return "/images/avatars/ai/trans_avatar_1.webp";
        default:
          return "/images/avatars/ai/trans_avatar_1.webp";
      }
    } else {
      return data.avatar_url;
    }
  };

  const uploadImage = async (userId: string, emit: Function) => {
    if (!file.value) return;

    const fileName = `${userId}`;
    const filePath = `profile-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from("profile-images")
      .upload(filePath, file.value, { upsert: true });

    if (error) {
      console.error("Error uploading file:", error);
      return;
    }

    const publicURL = `${config.public.SUPABASE_BUCKET}${filePath}`;

    const { error: updateError } = await supabase
      .from<Profile>("profiles")
      .update({ avatar_url: publicURL })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
    } else {
      photopath.value = `${publicURL}?t=${new Date().getTime()}`;
      emit("updateAvatarUrl", photopath.value);
    }
  };

  const deletePhoto = async (userId: string) => {
    const { error } = await supabase
      .from<Profile>("profiles")
      .update({ avatar_url: null })
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting photo:", error);
    } else {
      photopath.value = await getProfilePhoto(userId);
    }
  };

  // Methods for avatar and gender selection
  const loadAvatars = () => {
    if (selectedGender.value === "male") {
      avatars.value = [
        "/images/avatars/ai/male_avatar_1.webp",
        "/images/avatars/ai/male_avatar_2.webp",
        "/images/avatars/ai/male_avatar_3.webp",
        "/images/avatars/ai/male_avatar_4.webp",
      ];
    } else if (selectedGender.value === "female") {
      avatars.value = [
        "/images/avatars/ai/female_avatar_1.webp",
        "/images/avatars/ai/female_avatar_2.webp",
        "/images/avatars/ai/female_avatar_3.webp",
        "/images/avatars/ai/female_avatar_4.webp",
      ];
    } else if (selectedGender.value === "other") {
      avatars.value = [
        "/images/avatars/ai/trans_avatar_1.webp",
        "/images/avatars/ai/trans_avatar_2.webp",
        "/images/avatars/ai/trans_avatar_3.webp",
        "/images/avatars/ai/trans_avatar_4.webp",
      ];
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
    selectedGender,
    avatars,
    avatarIndex,
    getProfilePhoto,
    uploadImage,
    deletePhoto,
    loadAvatars,
    prevAvatar,
    nextAvatar,
  };
}
