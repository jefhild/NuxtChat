import { ref } from "vue";
// import { useSupabaseClient, useRuntimeConfig } from "#imports";

import { useDb } from "@/composables/useDB"; 
const {
  getClient
} = useDb();


export function useProfilePhoto() {
  // const supabase = useSupabaseClient();
  const supabase = getClient();
  const config = useRuntimeConfig();
  const photopath = ref("");
  const genderId = ref(0);
  const file = ref(null);
  const selectedGender = ref("male");
  const avatars = ref([]);
  const avatarIndex = ref(0);

  const MAX_FILE_SIZE_MB = 2;
  const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const getProfilePhoto = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile photo:", error);
      return "";
    }

    genderId.value = data?.gender_id || 0;

    if (data?.avatar_url) {
      photopath.value =
        data.avatar_url.startsWith("http") || data.avatar_url.startsWith("/")
          ? data.avatar_url
          : `${config.public.supabase.url}/storage/v1/object/public/avatars/${data.avatar_url}`;
    } else {
      const defaultImages = {
        1: "/images/avatars/male_placeholder.png",
        2: "/images/avatars/female-placeholder.png",
        3: "/images/avatars/trans-placeholder.png",
      };
      photopath.value =
        defaultImages[genderId.value] ||
        "/images/avatars/unknown-anonymous.webp";
    }

    return photopath.value;
  };

  const uploadImage = async (userId, emit) => {
    if (!file.value) return;

    const filePath = `${userId}/${file.value.name}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, file.value, { upsert: true });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return;
    }

    // ✅ Get correct public URL
    const { data: publicData, error: publicUrlError } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    if (publicUrlError || !publicData?.publicUrl) {
      console.error("Error getting public URL:", publicUrlError);
      return;
    }

    const publicURL = publicData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicURL })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return;
    }

    photopath.value = publicURL;
    emit("updateAvatarUrl", publicURL);
  };

  const deletePhoto = async (userId) => {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error deleting photo:", updateError);
      return;
    }

    photopath.value = "";
  };

  const isValidFile = (file) => {
    const isSizeValid = file.size / 1024 / 1024 < MAX_FILE_SIZE_MB;
    const isTypeValid = VALID_TYPES.includes(file.type);
    return isSizeValid && isTypeValid;
  };

  const handleFileChangeAndUpload = async (selectedFile, userId, emit) => {
    if (!isValidFile(selectedFile)) {
      console.error("Invalid file: must be under 2MB and JPEG/PNG/WebP.");
      return false;
    }
    file.value = selectedFile;
    await uploadImage(userId, emit);
    return true;
  };

  return {
    photopath,
    file,
    getProfilePhoto,
    uploadImage,
    deletePhoto,
    handleFileChangeAndUpload,
  };
}
